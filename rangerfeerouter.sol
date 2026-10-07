// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV2Router02Like {
    function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts);
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts);
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts);
}

// Optional upgrade over the client-side "transfer fee, then swap" flow that script.js
// uses today when tokens-data.js has liquiditySource.type === 'external-router' (e.g.
// PulseX on PulseChain). That flow works but is two sequential transactions -- this
// contract does the fee skim and the swap atomically in ONE transaction, closing the
// small window where price can move (or the swap can simply fail) between a separate
// fee transfer and the swap itself.
//
// NOT deployed anywhere and NOT wired into script.js yet. This is a documented future
// upgrade path: deploy one instance per chain (constructor takes that chain's external
// router address, e.g. PulseX's Router02), get it reviewed/tested, then point
// executeExternalRouterSwap() at it instead of doing the two-step client-side flow.
contract RangerSwapFeeRouter {
    address public immutable externalRouter;
    address public feeRecipient;
    uint256 public feeBps; // 1 bps = 0.01%
    address public owner;

    uint256 public constant MAX_FEE_BPS = 500; // hard cap at 5%, can never be set above this

    event FeeTaken(address indexed token, uint256 amount, address indexed recipient);
    event FeeRecipientUpdated(address indexed newRecipient);
    event FeeBpsUpdated(uint256 newFeeBps);

    modifier onlyOwner() {
        require(msg.sender == owner, "RangerSwapFeeRouter: NOT_OWNER");
        _;
    }

    constructor(address _externalRouter, address _feeRecipient, uint256 _feeBps) {
        require(_externalRouter != address(0), "RangerSwapFeeRouter: ZERO_ROUTER");
        require(_feeRecipient != address(0), "RangerSwapFeeRouter: ZERO_FEE_RECIPIENT");
        require(_feeBps <= MAX_FEE_BPS, "RangerSwapFeeRouter: FEE_TOO_HIGH");
        externalRouter = _externalRouter;
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
        owner = msg.sender;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "RangerSwapFeeRouter: ZERO_FEE_RECIPIENT");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "RangerSwapFeeRouter: FEE_TOO_HIGH");
        feeBps = _feeBps;
        emit FeeBpsUpdated(_feeBps);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "RangerSwapFeeRouter: ZERO_OWNER");
        owner = newOwner;
    }

    // ERC20 -> ERC20, routed through the external AMM after skimming the fee.
    function swapExactTokensForTokensWithFee(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(path.length >= 2, "RangerSwapFeeRouter: BAD_PATH");
        address tokenIn = path[0];
        uint256 swapAmount = _pullInAndTakeFee(tokenIn, amountIn);

        require(IERC20(tokenIn).approve(externalRouter, swapAmount), "RangerSwapFeeRouter: APPROVE_FAILED");
        amounts = IUniswapV2Router02Like(externalRouter).swapExactTokensForTokens(
            swapAmount, amountOutMin, path, to, deadline
        );
    }

    // ERC20 -> native ETH, routed through the external AMM after skimming the fee.
    function swapExactTokensForETHWithFee(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(path.length >= 2, "RangerSwapFeeRouter: BAD_PATH");
        address tokenIn = path[0];
        uint256 swapAmount = _pullInAndTakeFee(tokenIn, amountIn);

        require(IERC20(tokenIn).approve(externalRouter, swapAmount), "RangerSwapFeeRouter: APPROVE_FAILED");
        amounts = IUniswapV2Router02Like(externalRouter).swapExactTokensForETH(
            swapAmount, amountOutMin, path, to, deadline
        );
    }

    // Native ETH -> ERC20, routed through the external AMM after skimming the fee.
    function swapExactETHForTokensWithFee(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts) {
        uint256 feeAmount = (msg.value * feeBps) / 10000;
        uint256 swapAmount = msg.value - feeAmount;

        if (feeAmount > 0) {
            (bool sentFee, ) = feeRecipient.call{value: feeAmount}("");
            require(sentFee, "RangerSwapFeeRouter: FEE_TRANSFER_FAILED");
            emit FeeTaken(address(0), feeAmount, feeRecipient);
        }

        amounts = IUniswapV2Router02Like(externalRouter).swapExactETHForTokens{value: swapAmount}(
            amountOutMin, path, to, deadline
        );
    }

    function _pullInAndTakeFee(address token, uint256 amountIn) private returns (uint256 swapAmount) {
        require(IERC20(token).transferFrom(msg.sender, address(this), amountIn), "RangerSwapFeeRouter: TRANSFER_IN_FAILED");

        uint256 feeAmount = (amountIn * feeBps) / 10000;
        swapAmount = amountIn - feeAmount;

        if (feeAmount > 0) {
            require(IERC20(token).transfer(feeRecipient, feeAmount), "RangerSwapFeeRouter: FEE_TRANSFER_FAILED");
            emit FeeTaken(token, feeAmount, feeRecipient);
        }
    }

    // Recovers tokens/ETH that end up stuck in this contract (e.g. dust left behind by
    // a downstream call). Owner-only, and only ever moves funds to the owner -- this
    // contract shouldn't be holding user funds once a swap transaction completes.
    function rescueERC20(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner, amount), "RangerSwapFeeRouter: RESCUE_FAILED");
    }

    function rescueETH(uint256 amount) external onlyOwner {
        (bool sent, ) = owner.call{value: amount}("");
        require(sent, "RangerSwapFeeRouter: RESCUE_FAILED");
    }

    receive() external payable {}
}
