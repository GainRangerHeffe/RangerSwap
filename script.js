// Chain configurations - UPDATE THESE WITH YOUR DEPLOYED CONTRACT ADDRESSES
const CHAINS = {
    369: {
        name: 'PulseChain',
        rpcUrl: 'https://rpc.pulsechain.com',
        explorerUrl: 'https://scan.pulsechain.com',
        nativeCurrency: { name: 'PLS', symbol: 'PLS', decimals: 18 },
        factoryAddress: '0x...', // REPLACE WITH YOUR DEPLOYED FACTORY ADDRESS
        routerAddress: '0x...', // REPLACE WITH YOUR DEPLOYED ROUTER ADDRESS
        limitOrderAddress: '0x...', // REPLACE WITH LIMIT ORDER CONTRACT
        wethAddress: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27'
    },
    8453: {
        name: 'Base',
        rpcUrl: 'https://mainnet.base.org',
        explorerUrl: 'https://basescan.org',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        factoryAddress: '0x...', // REPLACE WITH YOUR DEPLOYED FACTORY ADDRESS
        routerAddress: '0x...', // REPLACE WITH YOUR DEPLOYED ROUTER ADDRESS
        limitOrderAddress: '0x...', // REPLACE WITH LIMIT ORDER CONTRACT
        wethAddress: '0x4200000000000000000000000000000000000006'
    },
    998899: {
        name: 'HyperEVM',
        rpcUrl: 'https://api.hyperliquid-testnet.xyz/evm',
        explorerUrl: 'https://explorer.hyperliquid-testnet.xyz',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        factoryAddress: '0x...', // REPLACE WITH YOUR DEPLOYED FACTORY ADDRESS
        routerAddress: '0x...', // REPLACE WITH YOUR DEPLOYED ROUTER ADDRESS
        limitOrderAddress: '0x...', // REPLACE WITH LIMIT ORDER CONTRACT
        wethAddress: '0x...'
    }
};

// Token lists with logos and price info
const TOKEN_LISTS = {
    369: [
        { 
            symbol: 'PLS', 
            name: 'PulseChain', 
            address: '0x0000000000000000000000000000000000000000', 
            decimals: 18,
            logo: './images/tokens/pls.png',
            fallbackLogo: '🔵',
            coingeckoId: 'pulsechain'
        },
        { 
            symbol: 'PLSX', 
            name: 'PulseX', 
            address: '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab', 
            decimals: 18,
            logo: './images/tokens/plsx.png',
            fallbackLogo: '⚡',
            coingeckoId: 'pulsex'
        },
        { 
            symbol: 'HEX', 
            name: 'HEX', 
            address: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39', 
            decimals: 8,
            logo: './images/tokens/hex.png',
            fallbackLogo: '⬡',
            coingeckoId: 'hex'
        },
        { 
            symbol: 'WPLS', 
            name: 'Wrapped PLS', 
            address: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27', 
            decimals: 18,
            logo: './images/tokens/wpls.png',
            fallbackLogo: '🔴',
            coingeckoId: 'pulsechain'
        }
    ],
    8453: [
        { 
            symbol: 'ETH', 
            name: 'Ethereum', 
            address: '0x0000000000000000000000000000000000000000', 
            decimals: 18,
            logo: './images/tokens/eth.png',
            fallbackLogo: '⟠',
            coingeckoId: 'ethereum'
        },
        { 
            symbol: 'USDC', 
            name: 'USD Coin', 
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 
            decimals: 6,
            logo: './images/tokens/usdc.png',
            fallbackLogo: '💵',
            coingeckoId: 'usd-coin'
        },
        { 
            symbol: 'WETH', 
            name: 'Wrapped Ether', 
            address: '0x4200000000000000000000000000000000000006', 
            decimals: 18,
            logo: './images/tokens/weth.png',
            fallbackLogo: '🔷',
            coingeckoId: 'ethereum'
        }
    ],
    998899: [
        { 
            symbol: 'ETH', 
            name: 'Ethereum', 
            address: '0x0000000000000000000000000000000000000000', 
            decimals: 18,
            logo: './images/tokens/eth.png',
            fallbackLogo: '⟠',
            coingeckoId: 'ethereum'
        },
        { 
            symbol: 'USDC', 
            name: 'USD Coin', 
            address: '0x...', 
            decimals: 6,
            logo: './images/tokens/usdc.png',
            fallbackLogo: '💵',
            coingeckoId: 'usd-coin'
        }
    ]
};

// Contract ABIs
const ROUTER_ABI = [
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
    "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "function factory() external pure returns (address)",
    "function WETH() external pure returns (address)"
];

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

const LIMIT_ORDER_ABI = [
    "function createOrder(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 targetPrice) external payable",
    "function cancelOrder(uint256 orderId) external",
    "function getUserOrders(address user) external view returns (tuple(uint256 id, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 targetPrice, bool isActive)[])"
];

// Global variables
let provider = null;
let signer = null;
let currentAccount = null;
let currentChainId = 369;
let fromToken = null;
let toToken = null;
let tokenPrices = {};
let isWalletConnected = false;

// Fee configuration
const RANGER_FEE = 0.01; // 0.01% fee
const LP_FEE = 0.3; // 0.3% to liquidity providers

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupSlippageControls();
    populateTokenList();
    loadTokenPrices();
    updateContractAddresses();
});

function initializeApp() {
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask to use RangerSwap');
        return;
    }
    
    provider = new ethers.providers.Web3Provider(window.ethereum);
    checkConnection();
    
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else {
            currentAccount = accounts[0];
            signer = provider.getSigner();
            isWalletConnected = true;
            updateUI();
        }
    });
    
    window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload();
    });
}

function setupEventListeners() {
    // Connect/Disconnect wallet button
    document.getElementById('connectWallet').addEventListener('click', toggleWalletConnection);
    
    // Chain selector
    document.getElementById('chainSelect').addEventListener('change', switchChain);
    
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Token selection buttons
    document.getElementById('fromToken').addEventListener('click', () => openTokenModal('from'));
    document.getElementById('toToken').addEventListener('click', () => openTokenModal('to'));
    document.getElementById('tokenASelect').addEventListener('click', () => openTokenModal('tokenA'));
    document.getElementById('tokenBSelect').addEventListener('click', () => openTokenModal('tokenB'));
    document.getElementById('limitFromToken').addEventListener('click', () => openTokenModal('limitFrom'));
    document.getElementById('limitToToken').addEventListener('click', () => openTokenModal('limitTo'));
    document.getElementById('bridgeToken').addEventListener('click', () => openTokenModal('bridge'));
    
    // Swap tokens button
    document.getElementById('swapTokens').addEventListener('click', swapTokenPositions);
    
    // Amount inputs
    document.getElementById('fromAmount').addEventListener('input', calculateSwapAmount);
    document.getElementById('limitFromAmount').addEventListener('input', calculateLimitAmount);
    document.getElementById('limitPrice').addEventListener('input', calculateLimitAmount);
    document.getElementById('bridgeAmount').addEventListener('input', calculateBridgeAmount);
    
    // Action buttons
    document.getElementById('swapButton').addEventListener('click', executeSwap);
    document.getElementById('addLiquidityButton').addEventListener('click', addLiquidity);
    document.getElementById('limitOrderButton').addEventListener('click', createLimitOrder);
    document.getElementById('bridgeButton').addEventListener('click', executeBridge);
    
    // Limit order type
    document.querySelectorAll('.limit-type').forEach(btn => {
        btn.addEventListener('click', () => setLimitOrderType(btn.dataset.type));
    });
    
    // Bridge chain selectors
    document.getElementById('fromChain').addEventListener('change', updateBridgeChains);
    document.getElementById('toChain').addEventListener('change', updateBridgeChains);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', closeTokenModal);
    document.getElementById('tokenModal').addEventListener('click', (e) => {
        if (e.target.id === 'tokenModal') closeTokenModal();
    });
    
    // Token search
    document.getElementById('tokenSearch').addEventListener('input', filterTokens);
}

function setupSlippageControls() {
    const presets = document.querySelectorAll('.slippage-preset');
    const customInput = document.getElementById('slippageInput');
    
    presets.forEach(preset => {
        preset.addEventListener('click', () => {
            presets.forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
            customInput.value = preset.dataset.value;
            updateMinReceived();
        });
    });
    
    customInput.addEventListener('input', () => {
        presets.forEach(p => p.classList.remove('active'));
        updateMinReceived();
    });
}

function updateMinReceived() {
    const toAmount = document.getElementById('toAmount').value;
    const slippage = parseFloat(document.getElementById('slippageInput').value) || 0.5;
    
    if (toAmount && toAmount !== '') {
        const minReceived = parseFloat(toAmount) * (1 - slippage / 100);
        document.getElementById('minReceived').textContent = minReceived.toFixed(6);
    } else {
        document.getElementById('minReceived').textContent = '-';
    }
}

function updateContractAddresses() {
    const contracts = {
        routerPulse: CHAINS[369]?.routerAddress || '0x...',
        factoryPulse: CHAINS[369]?.factoryAddress || '0x...',
        routerBase: CHAINS[8453]?.routerAddress || '0x...',
        factoryBase: CHAINS[8453]?.factoryAddress || '0x...'
    };
    
    Object.entries(contracts).forEach(([id, address]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = address;
        }
    });
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const btn = element.parentNode.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.style.background = 'linear-gradient(135deg, var(--neon-green) 0%, var(--neon-blue) 100%)';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = 'linear-gradient(135deg, var(--neon-blue) 0%, var(--neon-purple) 100%)';
        }, 1000);
    }).catch(() => {
        alert('Failed to copy to clipboard');
    });
}

async function toggleWalletConnection() {
    if (isWalletConnected) {
        disconnectWallet();
    } else {
        await connectWallet();
    }
}

async function connectWallet() {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];
        signer = provider.getSigner();
        isWalletConnected = true;
        
        updateUI();
        await switchToCorrectChain();
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet');
    }
}

function disconnectWallet() {
    currentAccount = null;
    signer = null;
    isWalletConnected = false;
    updateUI();
    resetTokenSelections();
}

async function checkConnection() {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            currentAccount = accounts[0];
            signer = provider.getSigner();
            isWalletConnected = true;
            updateUI();
        }
    } catch (error) {
        console.error('Error checking connection:', error);
    }
}

async function loadTokenPrices() {
    try {
        const tokens = TOKEN_LISTS[currentChainId] || [];
        const coingeckoIds = tokens.map(token => token.coingeckoId).filter(Boolean).join(',');
        
        if (coingeckoIds) {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd`);
            const prices = await response.json();
            
            tokens.forEach(token => {
                if (token.coingeckoId && prices[token.coingeckoId]) {
                    tokenPrices[token.address] = prices[token.coingeckoId].usd;
                }
            });
        }
    } catch (error) {
        console.error('Error loading token prices:', error);
    }
}

async function switchChain() {
    const chainId = parseInt(document.getElementById('chainSelect').value);
    currentChainId = chainId;
    
    if (currentAccount) {
        await switchToCorrectChain();
    }
    
    populateTokenList();
    resetTokenSelections();
    await loadTokenPrices();
}

async function switchToCorrectChain() {
    const chain = CHAINS[currentChainId];
    const chainIdHex = '0x' + currentChainId.toString(16);
    
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: chainIdHex,
                        chainName: chain.name,
                        rpcUrls: [chain.rpcUrl],
                        blockExplorerUrls: [chain.explorerUrl],
                        nativeCurrency: chain.nativeCurrency
                    }],
                });
            } catch (addError) {
                console.error('Error adding chain:', addError);
            }
        }
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    if (tabName === 'pools') {
        loadUserPositions();
    } else if (tabName === 'limit') {
        loadUserOrders();
    } else if (tabName === 'info') {
        updateContractAddresses();
    }
}

function populateTokenList() {
    const tokenList = document.getElementById('tokenList');
    tokenList.innerHTML = '';
    
    const tokens = TOKEN_LISTS[currentChainId] || [];
    
    tokens.forEach(token => {
        const tokenItem = document.createElement('div');
        tokenItem.className = 'token-item';
        tokenItem.innerHTML = `
            <div class="token-logo">
                <img src="${token.logo}" 
                     alt="${token.symbol}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                     class="token-image">
                <span class="token-fallback" style="display: none;">${token.fallbackLogo}</span>
            </div>
            <div class="token-details">
                <div class="token-info">
                    <h4>${token.symbol}</h4>
                    <p>${token.name}</p>
                </div>
                <div class="token-balance">
                    <span class="balance-amount" id="balance-${token.address}">0.00</span>
                    <span class="balance-usd" id="usd-${token.address}">$0.00</span>
                </div>
            </div>
        `;
        tokenItem.addEventListener('click', () => selectToken(token));
        tokenList.appendChild(tokenItem);
    });
    
    if (currentAccount) {
        updateAllTokenBalances();
    }
}

function openTokenModal(type) {
    document.getElementById('tokenModal').style.display = 'block';
    document.getElementById('tokenModal').dataset.type = type;
    populateTokenList();
}

function closeTokenModal() {
    document.getElementById('tokenModal').style.display = 'none';
}

function selectToken(token) {
    const type = document.getElementById('tokenModal').dataset.type;
    
    if (type === 'from') {
        fromToken = token;
        document.getElementById('fromToken').innerHTML = `<span>${token.symbol}</span><span class="arrow">▼</span>`;
        updateBalance('from');
        updateRouteInfo();
    } else if (type === 'to') {
        toToken = token;
        document.getElementById('toToken').innerHTML = `<span>${token.symbol}</span><span class="arrow">▼</span>`;
        updateBalance('to');
        updateRouteInfo();
    } else if (type === 'limitFrom') {
        document.getElementById('limitFromToken').innerHTML = `<span>${token.symbol}</span><span class="arrow">▼</span>`;
    } else if (type === 'limitTo') {
        document.getElementById('limitToToken').innerHTML = `<span>${token.symbol}</span><span class="arrow">▼</span>`;
    } else if (type === 'bridge') {
        document.getElementById('bridgeToken').innerHTML = `<span>${token.symbol}</span><span class="arrow">▼</span>`;
    }
    
    closeTokenModal();
    calculateSwapAmount();
}

function swapTokenPositions() {
    const temp = fromToken;
    fromToken = toToken;
    toToken = temp;
    
    if (fromToken) {
        document.getElementById('fromToken').innerHTML = `<span>${fromToken.symbol}</span><span class="arrow">▼</span>`;
    }
    if (toToken) {
        document.getElementById('toToken').innerHTML = `<span>${toToken.symbol}</span><span class="arrow">▼</span>`;
    }
    
    updateBalance('from');
    updateBalance('to');
    updateRouteInfo();
    calculateSwapAmount();
}

async function updateAllTokenBalances() {
    const tokens = TOKEN_LISTS[currentChainId] || [];
    
    for (const token of tokens) {
        try {
            let balance;
            if (token.address === '0x0000000000000000000000000000000000000000') {
                balance = await provider.getBalance(currentAccount);
            } else {
                const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
                balance = await contract.balanceOf(currentAccount);
            }
            
            const formattedBalance = ethers.utils.formatUnits(balance, token.decimals);
            const balanceNum = parseFloat(formattedBalance);
            
            const balanceElement = document.getElementById(`balance-${token.address}`);
            const usdElement = document.getElementById(`usd-${token.address}`);
            
            if (balanceElement) {
                balanceElement.textContent = balanceNum.toFixed(4);
            }
            
            if (usdElement && tokenPrices[token.address]) {
                const usdValue = balanceNum * tokenPrices[token.address];
                usdElement.textContent = `$${usdValue.toFixed(2)}`;
            }
        } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
        }
    }
}

async function updateBalance(type) {
    if (!currentAccount) return;
    
    const token = type === 'from' ? fromToken : toToken;
    if (!token) return;
    
    try {
        let balance;
        if (token.address === '0x0000000000000000000000000000000000000000') {
            balance = await provider.getBalance(currentAccount);
        } else {
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            balance = await contract.balanceOf(currentAccount);
        }
        
        const formattedBalance = ethers.utils.formatUnits(balance, token.decimals);
        document.getElementById(`${type}Balance`).textContent = `Balance: ${parseFloat(formattedBalance).toFixed(4)}`;
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

function updateRouteInfo() {
    if (!fromToken || !toToken) {
        document.getElementById('routePath').textContent = 'Select tokens to see route';
        return;
    }
    
    const chain = CHAINS[currentChainId];
    let route = '';
    
    if (fromToken.address === '0x0000000000000000000000000000000000000000' || 
        toToken.address === '0x0000000000000000000000000000000000000000') {
        route = `${fromToken.symbol} → ${toToken.symbol}`;
    } else {
        route = `${fromToken.symbol} → WETH → ${toToken.symbol}`;
    }
    
    document.getElementById('routePath').textContent = route;
}

async function calculateSwapAmount() {
    const fromAmount = document.getElementById('fromAmount').value;
    
    if (!fromAmount || !fromToken || !toToken || fromAmount === '0') {
        document.getElementById('toAmount').value = '';
        document.getElementById('exchangeRate').textContent = '-';
        updateMinReceived();
        return;
    }
    
    try {
        const chain = CHAINS[currentChainId];
        
        if (chain.routerAddress === '0x...') {
            document.getElementById('toAmount').value = '';
            document.getElementById('exchangeRate').textContent = 'Router not deployed';
            updateMinReceived();
            return;
        }
        
        const router = new ethers.Contract(chain.routerAddress, ROUTER_ABI, provider);
        
        let path;
        if (fromToken.address === '0x0000000000000000000000000000000000000000') {
            path = [chain.wethAddress, toToken.address];
        } else if (toToken.address === '0x0000000000000000000000000000000000000000') {
            path = [fromToken.address, chain.wethAddress];
        } else {
            path = [fromToken.address, toToken.address];
        }
        
        const amountIn = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
        const amounts = await router.getAmountsOut(amountIn, path);
        const amountOut = ethers.utils.formatUnits(amounts[1], toToken.decimals);
        
        document.getElementById('toAmount').value = parseFloat(amountOut).toFixed(6);
        
        const rate = parseFloat(amountOut) / parseFloat(fromAmount);
        document.getElementById('exchangeRate').textContent = `1 ${fromToken.symbol} = ${rate.toFixed(6)} ${toToken.symbol}`;
        
        updateMinReceived();
        
    } catch (error) {
        console.error('Error calculating swap amount:', error);
        document.getElementById('toAmount').value = '';
        document.getElementById('exchangeRate').textContent = 'No liquidity';
        updateMinReceived();
    }
}

async function executeSwap() {
    if (!currentAccount || !fromToken || !toToken) {
        alert('Please connect wallet and select tokens');
        return;
    }
    
    const fromAmount = document.getElementById('fromAmount').value;
    const toAmount = document.getElementById('toAmount').value;
    const slippage = parseFloat(document.getElementById('slippageInput').value) || 0.5;
    
    if (!fromAmount || !toAmount) {
        alert('Please enter an amount');
        return;
    }
    
    try {
        const chain = CHAINS[currentChainId];
        
        if (chain.routerAddress === '0x...') {
            alert('Router contract not deployed on this chain yet');
            return;
        }
        
        const router = new ethers.Contract(chain.routerAddress, ROUTER_ABI, signer);
        
        const amountIn = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
        const amountOutMin = ethers.utils.parseUnits(
            (parseFloat(toAmount) * (1 - slippage / 100)).toString(), 
            toToken.decimals
        );
        const to = currentAccount;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        
        let tx;
        
        if (fromToken.address === '0x0000000000000000000000000000000000000000') {
            const path = [chain.wethAddress, toToken.address];
            tx = await router.swapExactETHForTokens(amountOutMin, path, to, deadline, { value: amountIn });
        } else if (toToken.address === '0x0000000000000000000000000000000000000000') {
            const path = [fromToken.address, chain.wethAddress];
            await approveToken(fromToken.address, chain.routerAddress, amountIn);
            tx = await router.swapExactTokensForETH(amountIn, amountOutMin, path, to, deadline);
        } else {
            const path = [fromToken.address, toToken.address];
            await approveToken(fromToken.address, chain.routerAddress, amountIn);
            tx = await router.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
        }
        
        alert('Swap submitted! Transaction hash: ' + tx.hash);
        
        document.getElementById('fromAmount').value = '';
        document.getElementById('toAmount').value = '';
        updateBalance('from');
        updateBalance('to');
        updateAllTokenBalances();
        updateMinReceived();
        
    } catch (error) {
        console.error('Error executing swap:', error);
        alert('Swap failed: ' + (error.reason || error.message));
    }
}

async function approveToken(tokenAddress, spenderAddress, amount) {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const allowance = await contract.allowance(currentAccount, spenderAddress);
    
    if (allowance.lt(amount)) {
        const tx = await contract.approve(spenderAddress, ethers.constants.MaxUint256);
        await tx.wait();
    }
}

async function addLiquidity() {
    alert('Add liquidity functionality will be implemented with deployed contracts');
}

function setLimitOrderType(type) {
    document.querySelectorAll('.limit-type').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    if (type === 'buy') {
        document.getElementById('limitFromLabel').textContent = 'Pay';
        document.getElementById('limitToLabel').textContent = 'Buy';
    } else {
        document.getElementById('limitFromLabel').textContent = 'Sell';
        document.getElementById('limitToLabel').textContent = 'Receive';
    }
}

function calculateLimitAmount() {
    const fromAmount = parseFloat(document.getElementById('limitFromAmount').value) || 0;
    const price = parseFloat(document.getElementById('limitPrice').value) || 0;
    
    if (fromAmount && price) {
        const toAmount = fromAmount * price;
        document.getElementById('limitToAmount').value = toAmount.toFixed(6);
    }
}

async function createLimitOrder() {
    alert('Limit orders require additional smart contracts to be deployed');
}

function updateBridgeChains() {
    const fromChain = document.getElementById('fromChain').value;
    const toChain = document.getElementById('toChain').value;
    
    // Prevent same chain selection
    if (fromChain === toChain) {
        alert('Please select different chains for bridging');
        return;
    }
    
    calculateBridgeAmount();
}

function calculateBridgeAmount() {
    const amount = document.getElementById('bridgeAmount').value;
    if (amount && amount !== '0') {
        // Simulate bridge calculation
        const fee = 5; // $5 bridge fee
        document.getElementById('bridgeFee').textContent = `~$${fee}`;
        document.getElementById('bridgeReceive').textContent = amount;
    } else {
        document.getElementById('bridgeFee').textContent = '~$5';
        document.getElementById('bridgeReceive').textContent = '-';
    }
}

async function executeBridge() {
    alert('Bridge functionality requires cross-chain infrastructure to be deployed');
}

async function loadUserPositions() {
    const positionsContainer = document.getElementById('userPositions');
    positionsContainer.innerHTML = '<div class="no-positions"><p>No liquidity positions found. Add liquidity to start earning fees.</p></div>';
}

async function loadUserOrders() {
    const ordersContainer = document.getElementById('userOrders');
    ordersContainer.innerHTML = '<div class="no-orders"><p>No limit orders found.</p></div>';
}

function resetTokenSelections() {
    fromToken = null;
    toToken = null;
    document.getElementById('fromToken').innerHTML = '<span>Select Token</span><span class="arrow">▼</span>';
    document.getElementById('toToken').innerHTML = '<span>Select Token</span><span class="arrow">▼</span>';
    document.getElementById('fromAmount').value = '';
    document.getElementById('toAmount').value = '';
    document.getElementById('fromBalance').textContent = 'Balance: 0';
    document.getElementById('toBalance').textContent = 'Balance: 0';
    document.getElementById('exchangeRate').textContent = '-';
    document.getElementById('routePath').textContent = 'Select tokens to see route';
    document.getElementById('minReceived').textContent = '-';
}

function updateUI() {
    if (isWalletConnected && currentAccount) {
        document.getElementById('connectWallet').textContent = 
            currentAccount.substring(0, 6) + '...' + currentAccount.substring(38);
        document.getElementById('swapButton').textContent = 'Swap';
        document.getElementById('swapButton').disabled = false;
        document.getElementById('addLiquidityButton').textContent = 'Add Liquidity';
        document.getElementById('addLiquidityButton').disabled = false;
        document.getElementById('limitOrderButton').textContent = 'Create Limit Order';
        document.getElementById('limitOrderButton').disabled = false;
        document.getElementById('bridgeButton').textContent = 'Bridge Tokens';
        document.getElementById('bridgeButton').disabled = false;
        
        if (fromToken) updateBalance('from');
        if (toToken) updateBalance('to');
        updateAllTokenBalances();
    } else {
        document.getElementById('connectWallet').textContent = 'Connect Wallet';
        document.getElementById('swapButton').textContent = 'Connect Wallet';
        document.getElementById('swapButton').disabled = true;
        document.getElementById('addLiquidityButton').textContent = 'Connect Wallet';
        document.getElementById('addLiquidityButton').disabled = true;
        document.getElementById('limitOrderButton').textContent = 'Connect Wallet';
        document.getElementById('limitOrderButton').disabled = true;
        document.getElementById('bridgeButton').textContent = 'Connect Wallet';
        document.getElementById('bridgeButton').disabled = true;
    }
}

function filterTokens() {
    const searchTerm = document.getElementById('tokenSearch').value.toLowerCase();
    const tokenItems = document.querySelectorAll('.token-item');
    
    tokenItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
    });
}

// Make copyToClipboard globally accessible
window.copyToClipboard = copyToClipboard;