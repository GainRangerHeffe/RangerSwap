// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IUniswapV2Router {
    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external payable returns (uint[] memory amounts);
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external returns (uint[] memory amounts);
    function WETH() external pure returns (address);
}

/**
 * @title RangerSwapLimitOrders
 * @notice Ultra-secure limit order contract for RangerSwap
 * @dev Based on battle-tested patterns with multiple security layers
 */
contract RangerSwapLimitOrders is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    
    struct Order {
        uint256 id;
        address owner;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 targetPrice; // Price per token (scaled by 1e18)
        uint256 deadline;
        bool isActive;
        bool isBuyOrder; // true for buy, false for sell
        uint256 createdAt;
    }
    
    IUniswapV2Router public immutable router;
    address public immutable WETH;
    
    uint256 public orderIdCounter = 1;
    uint256 public executionFee = 0.001 ether;
    uint256 public constant MAX_ORDERS_PER_USER = 50;
    uint256 public constant MAX_DEADLINE = 30 days;
    uint256 public constant MIN_EXECUTION_FEE = 0.0001 ether;
    uint256 public constant MAX_EXECUTION_FEE = 0.01 ether;
    
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(address => uint256) public userOrderCount;
    
    // Emergency controls
    mapping(address => bool) public blacklistedTokens;
    bool public emergencyMode = false;
    
    event OrderCreated(
        uint256 indexed orderId,
        address indexed owner,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 targetPrice
    );
    
    event OrderExecuted(
        uint256 indexed orderId,
        address indexed executor,
        uint256 amountOut
    );
    
    event OrderCancelled(uint256 indexed orderId, address indexed owner);
    event EmergencyModeToggled(bool enabled);
    event TokenBlacklisted(address token, bool blacklisted);
    
    modifier validOrder(uint256 orderId) {
        require(orders[orderId].isActive, "Order not active");
        require(orders[orderId].deadline > block.timestamp, "Order expired");
        require(!emergencyMode, "Emergency mode active");
        _;
    }
    
    modifier onlyOrderOwner(uint256 orderId) {
        require(orders[orderId].owner == msg.sender, "Not order owner");
        _;
    }
    
    modifier notBlacklisted(address token) {
        require(!blacklistedTokens[token], "Token blacklisted");
        _;
    }
    
    constructor(address _router) {
        require(_router != address(0), "Invalid router address");
        router = IUniswapV2Router(_router);
        WETH = router.WETH();
    }
    
    receive() external payable {}
    
    /**
     * @notice Create a new limit order
     * @param tokenIn Token to sell
     * @param tokenOut Token to buy
     * @param amountIn Amount of tokenIn to sell
     * @param minAmountOut Minimum amount of tokenOut to receive
     * @param targetPrice Target price (scaled by 1e18)
     * @param deadline Order expiration time
     * @param isBuyOrder True for buy orders, false for sell orders
     */
    function createOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 targetPrice,
        uint256 deadline,
        bool isBuyOrder
    ) external payable nonReentrant whenNotPaused notBlacklisted(tokenIn) notBlacklisted(tokenOut) {
        require(tokenIn != tokenOut, "Same token");
        require(amountIn > 0, "Invalid amount");
        require(minAmountOut > 0, "Invalid min amount");
        require(targetPrice > 0, "Invalid target price");
        require(deadline > block.timestamp, "Invalid deadline");
        require(deadline <= block.timestamp + MAX_DEADLINE, "Deadline too far");
        require(userOrderCount[msg.sender] < MAX_ORDERS_PER_USER, "Too many orders");
        require(msg.value >= executionFee, "Insufficient execution fee");
        require(!emergencyMode, "Emergency mode active");
        
        uint256 orderId = orderIdCounter++;
        
        if (tokenIn == address(0)) {
            // ETH order
            require(msg.value >= amountIn + executionFee, "Insufficient ETH");
        } else {
            // ERC20 order - use SafeERC20 for maximum security
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        }
        
        orders[orderId] = Order({
            id: orderId,
            owner: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            targetPrice: targetPrice,
            deadline: deadline,
            isActive: true,
            isBuyOrder: isBuyOrder,
            createdAt: block.timestamp
        });
        
        userOrders[msg.sender].push(orderId);
        userOrderCount[msg.sender]++;
        
        emit OrderCreated(orderId, msg.sender, tokenIn, tokenOut, amountIn, minAmountOut, targetPrice);
    }
    
    /**
     * @notice Execute a limit order when conditions are met
     * @param orderId ID of the order to execute
     */
    function executeOrder(uint256 orderId) external nonReentrant validOrder(orderId) {
        Order storage order = orders[orderId];
        
        // Check if current price meets target
        require(_canExecuteOrder(order), "Price target not met");
        
        order.isActive = false;
        userOrderCount[order.owner]--;
        
        address[] memory path = new address[](2);
        path[0] = order.tokenIn == address(0) ? WETH : order.tokenIn;
        path[1] = order.tokenOut == address(0) ? WETH : order.tokenOut;
        
        uint256 amountOut;
        
        try this._executeSwap(order, path) returns (uint256 _amountOut) {
            amountOut = _amountOut;
            
            // Pay execution fee to executor
            payable(msg.sender).transfer(executionFee);
            
            emit OrderExecuted(orderId, msg.sender, amountOut);
        } catch {
            // Revert order state if swap fails
            order.isActive = true;
            userOrderCount[order.owner]++;
            revert("Swap execution failed");
        }
    }
    
    /**
     * @notice Internal function to execute the actual swap
     * @dev Separated for better error handling
     */
    function _executeSwap(Order memory order, address[] memory path) external returns (uint256 amountOut) {
        require(msg.sender == address(this), "Internal function");
        
        if (order.tokenIn == address(0)) {
            // ETH to Token
            uint256[] memory amounts = router.swapExactETHForTokens{value: order.amountIn}(
                order.minAmountOut,
                path,
                order.owner,
                block.timestamp + 300
            );
            amountOut = amounts[1];
        } else if (order.tokenOut == address(0)) {
            // Token to ETH
            IERC20(order.tokenIn).safeApprove(address(router), order.amountIn);
            uint256[] memory amounts = router.swapExactTokensForETH(
                order.amountIn,
                order.minAmountOut,
                path,
                order.owner,
                block.timestamp + 300
            );
            amountOut = amounts[1];
        } else {
            // Token to Token
            IERC20(order.tokenIn).safeApprove(address(router), order.amountIn);
            uint256[] memory amounts = router.swapExactTokensForTokens(
                order.amountIn,
                order.minAmountOut,
                path,
                order.owner,
                block.timestamp + 300
            );
            amountOut = amounts[1];
        }
    }
    
    /**
     * @notice Cancel an active order
     * @param orderId ID of the order to cancel
     */
    function cancelOrder(uint256 orderId) external nonReentrant onlyOrderOwner(orderId) {
        Order storage order = orders[orderId];
        require(order.isActive, "Order not active");
        
        order.isActive = false;
        userOrderCount[order.owner]--;
        
        // Refund tokens
        if (order.tokenIn == address(0)) {
            payable(order.owner).transfer(order.amountIn);
        } else {
            IERC20(order.tokenIn).safeTransfer(order.owner, order.amountIn);
        }
        
        // Refund execution fee
        payable(order.owner).transfer(executionFee);
        
        emit OrderCancelled(orderId, order.owner);
    }
    
    /**
     * @notice Check if an order can be executed
     * @param order The order to check
     * @return bool True if order can be executed
     */
    function _canExecuteOrder(Order memory order) internal view returns (bool) {
        address[] memory path = new address[](2);
        path[0] = order.tokenIn == address(0) ? WETH : order.tokenIn;
        path[1] = order.tokenOut == address(0) ? WETH : order.tokenOut;
        
        try router.getAmountsOut(order.amountIn, path) returns (uint256[] memory amounts) {
            uint256 currentPrice = (amounts[1] * 1e18) / order.amountIn;
            
            if (order.isBuyOrder) {
                return currentPrice <= order.targetPrice;
            } else {
                return currentPrice >= order.targetPrice;
            }
        } catch {
            return false;
        }
    }
    
    /**
     * @notice Get all orders for a user
     * @param user User address
     * @return uint256[] Array of order IDs
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }
    
    /**
     * @notice Get all active orders for a user
     * @param user User address
     * @return Order[] Array of active orders
     */
    function getActiveOrders(address user) external view returns (Order[] memory) {
        uint256[] memory userOrderIds = userOrders[user];
        uint256 activeCount = 0;
        
        // Count active orders
        for (uint i = 0; i < userOrderIds.length; i++) {
            if (orders[userOrderIds[i]].isActive && orders[userOrderIds[i]].deadline > block.timestamp) {
                activeCount++;
            }
        }
        
        // Create array of active orders
        Order[] memory activeOrders = new Order[](activeCount);
        uint256 index = 0;
        
        for (uint i = 0; i < userOrderIds.length; i++) {
            if (orders[userOrderIds[i]].isActive && orders[userOrderIds[i]].deadline > block.timestamp) {
                activeOrders[index] = orders[userOrderIds[i]];
                index++;
            }
        }
        
        return activeOrders;
    }
    
    // ***** ADMIN FUNCTIONS *****
    
    /**
     * @notice Set execution fee (only owner)
     * @param _executionFee New execution fee
     */
    function setExecutionFee(uint256 _executionFee) external onlyOwner {
        require(_executionFee >= MIN_EXECUTION_FEE && _executionFee <= MAX_EXECUTION_FEE, "Invalid fee");
        executionFee = _executionFee;
    }
    
    /**
     * @notice Toggle emergency mode (only owner)
     */
    function toggleEmergencyMode() external onlyOwner {
        emergencyMode = !emergencyMode;
        emit EmergencyModeToggled(emergencyMode);
    }
    
    /**
     * @notice Blacklist/unblacklist a token (only owner)
     * @param token Token address
     * @param blacklisted True to blacklist, false to unblacklist
     */
    function setTokenBlacklist(address token, bool blacklisted) external onlyOwner {
        blacklistedTokens[token] = blacklisted;
        emit TokenBlacklisted(token, blacklisted);
    }
    
    /**
     * @notice Pause contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Withdraw collected fees (only owner)
     */
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @notice Emergency token withdrawal (only owner)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdrawToken(address token, uint256 amount) external onlyOwner {
        require(emergencyMode, "Not in emergency mode");
        IERC20(token).safeTransfer(owner(), amount);
    }
}