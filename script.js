// CHAINS and TOKEN_LISTS now live in tokens-data.js (loaded before this file) so that
// index.html, bridge.html, info.html, and admin.html all share one source of truth.

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
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

function getLiquiditySource() {
    const chain = CHAINS[currentChainId];
    return (chain && chain.liquiditySource) || { type: 'own' };
}

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
let activeTokenFilter = 'all';

// Fee configuration
const RANGER_FEE = 0.01; // 0.01% fee
const LP_FEE = 0.3; // 0.3% to liquidity providers

// --- Read-only RPC failover ---
// Reads (quotes, balances) are done through our own curated RPC list instead of
// whatever RPC the connected wallet happens to be using, so a flaky/rate-limited
// endpoint on a new chain (e.g. Robinhood Chain) doesn't break quoting or balances.
// Writes (swaps, approvals) still go through the wallet's signer, since only the
// wallet can sign and broadcast transactions.
const readProviderCache = {};

function getReadProvider(chainId) {
    if (readProviderCache[chainId]) return readProviderCache[chainId];

    const chain = CHAINS[chainId];
    const urls = ((chain && chain.rpcUrls) || (chain && chain.rpcUrl ? [chain.rpcUrl] : []))
        .filter(url => url && url !== '0x...');

    let result;
    if (urls.length === 0) {
        result = provider; // no known-good RPC configured yet, fall back to the wallet's provider
    } else if (urls.length === 1) {
        result = new ethers.providers.JsonRpcProvider(urls[0]);
    } else {
        const fallbackConfigs = urls.map((url, index) => ({
            provider: new ethers.providers.JsonRpcProvider(url),
            priority: index,
            weight: 1,
            stallTimeout: 2500
        }));
        result = new ethers.providers.FallbackProvider(fallbackConfigs, 1);
    }

    readProviderCache[chainId] = result;
    return result;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupSlippageControls();
    populateTokenList();
    loadTokenPrices();
    updateContractAddresses();
    updateFeeDisplay();
});

// Debounces a function so it only runs `delay` ms after the last call -- used on the
// swap amount input so every keystroke doesn't fire an RPC/0x API request.
function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

const debouncedCalculateSwapAmount = debounce(calculateSwapAmount, 350);

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

// Not every page (bridge.html, info.html, admin.html) has the swap-form elements --
// this guards each wire-up so a missing element is skipped instead of throwing and
// aborting the rest of setup (which used to silently break e.g. info.html's contract
// address display, since it never got past the first missing element).
function on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

function setupEventListeners() {
    // Connect/Disconnect wallet button
    on('connectWallet', 'click', toggleWalletConnection);

    // Chain selector
    on('chainSelect', 'change', switchChain);

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Token selection buttons
    on('fromToken', 'click', () => openTokenModal('from'));
    on('toToken', 'click', () => openTokenModal('to'));
    on('tokenASelect', 'click', () => openTokenModal('tokenA'));
    on('tokenBSelect', 'click', () => openTokenModal('tokenB'));
    on('limitFromToken', 'click', () => openTokenModal('limitFrom'));
    on('limitToToken', 'click', () => openTokenModal('limitTo'));
    on('bridgeToken', 'click', () => openTokenModal('bridge'));

    // Swap tokens button
    on('swapTokens', 'click', swapTokenPositions);

    // Amount inputs
    on('fromAmount', 'input', debouncedCalculateSwapAmount);
    on('limitFromAmount', 'input', calculateLimitAmount);
    on('limitPrice', 'input', calculateLimitAmount);
    on('bridgeAmount', 'input', calculateBridgeAmount);

    // Action buttons
    on('swapButton', 'click', executeSwap);
    on('addLiquidityButton', 'click', addLiquidity);
    on('limitOrderButton', 'click', createLimitOrder);
    on('bridgeButton', 'click', executeBridge);

    // Token filter (All / Top / Meme)
    document.querySelectorAll('.token-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => setTokenFilter(btn.dataset.category));
    });

    // Limit order type
    document.querySelectorAll('.limit-type').forEach(btn => {
        btn.addEventListener('click', () => setLimitOrderType(btn.dataset.type));
    });

    // Bridge chain selectors
    on('fromChain', 'change', updateBridgeChains);
    on('toChain', 'change', updateBridgeChains);

    // Modal close
    const closeBtn = document.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', closeTokenModal);
    on('tokenModal', 'click', (e) => {
        if (e.target.id === 'tokenModal') closeTokenModal();
    });

    // Token search
    on('tokenSearch', 'input', filterTokens);
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
        limitPulse: CHAINS[369]?.limitOrderAddress || '0x...',
        routerBase: CHAINS[8453]?.routerAddress || '0x...',
        factoryBase: CHAINS[8453]?.factoryAddress || '0x...',
        limitBase: CHAINS[8453]?.limitOrderAddress || '0x...',
        routerRobinhood: CHAINS[4663]?.routerAddress || '0x...',
        factoryRobinhood: CHAINS[4663]?.factoryAddress || '0x...',
        limitRobinhood: CHAINS[4663]?.limitOrderAddress || '0x...'
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
    updateFeeDisplay();
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
                        rpcUrls: chain.rpcUrls && chain.rpcUrls.length ? chain.rpcUrls : [chain.rpcUrl],
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
    if (!tokenList) return;
    tokenList.innerHTML = '';

    const tokens = TOKEN_LISTS[currentChainId] || [];

    tokens.forEach(token => {
        const tokenItem = document.createElement('div');
        tokenItem.className = 'token-item';
        tokenItem.dataset.category = token.category || 'top';
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

    applyTokenFilters();

    if (currentAccount) {
        updateAllTokenBalances();
    }
}

function setTokenFilter(category) {
    activeTokenFilter = category;
    document.querySelectorAll('.token-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    applyTokenFilters();
}

function applyTokenFilters() {
    const searchTerm = (document.getElementById('tokenSearch')?.value || '').toLowerCase();
    document.querySelectorAll('.token-item').forEach(item => {
        const matchesSearch = item.textContent.toLowerCase().includes(searchTerm);
        const matchesCategory = activeTokenFilter === 'all' || item.dataset.category === activeTokenFilter;
        item.style.display = (matchesSearch && matchesCategory) ? 'flex' : 'none';
    });
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
    const readProvider = getReadProvider(currentChainId);

    for (const token of tokens) {
        try {
            let balance;
            if (token.address === NATIVE_ADDRESS) {
                balance = await readProvider.getBalance(currentAccount);
            } else {
                const contract = new ethers.Contract(token.address, ERC20_ABI, readProvider);
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
        const readProvider = getReadProvider(currentChainId);
        let balance;
        if (token.address === NATIVE_ADDRESS) {
            balance = await readProvider.getBalance(currentAccount);
        } else {
            const contract = new ethers.Contract(token.address, ERC20_ABI, readProvider);
            balance = await contract.balanceOf(currentAccount);
        }

        const formattedBalance = ethers.utils.formatUnits(balance, token.decimals);
        document.getElementById(`${type}Balance`).textContent = `Balance: ${parseFloat(formattedBalance).toFixed(4)}`;
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

function buildSwapPath(chain, from, to) {
    if (from.address === NATIVE_ADDRESS) return [chain.wethAddress, to.address];
    if (to.address === NATIVE_ADDRESS) return [from.address, chain.wethAddress];
    return [from.address, to.address];
}

function updateFeeDisplay() {
    const source = getLiquiditySource();
    const feePct = (RANGER_FEE_BPS / 100).toFixed(2);
    const tradingFeeEl = document.getElementById('tradingFee');
    if (tradingFeeEl) tradingFeeEl.textContent = `${feePct}%`;

    const feeInfoEl = document.querySelector('#swap .fee-info small');
    if (feeInfoEl) {
        feeInfoEl.textContent = source.type === 'own'
            ? `Trading fee goes to liquidity providers. RangerSwap takes ${feePct}% on each trade.`
            : `Liquidity is routed through ${source.label}. RangerSwap adds a ${feePct}% fee on top of their price -- no separate RangerSwap pool involved.`;
    }
}

function updateRouteInfo() {
    if (!fromToken || !toToken) {
        document.getElementById('routePath').textContent = 'Select tokens to see route';
        return;
    }

    const chain = CHAINS[currentChainId];
    const source = getLiquiditySource();
    let route;

    if (source.type === 'aggregator') {
        route = `${fromToken.symbol} → ${toToken.symbol} (best price via ${source.label})`;
    } else if (source.type === 'external-router') {
        route = `${fromToken.symbol} → ${toToken.symbol} (via ${source.label})`;
    } else if (fromToken.address === NATIVE_ADDRESS || toToken.address === NATIVE_ADDRESS) {
        route = `${fromToken.symbol} → ${toToken.symbol}`;
    } else {
        route = `${fromToken.symbol} → WETH → ${toToken.symbol}`;
    }

    document.getElementById('routePath').textContent = route;
    updateFeeDisplay();
}

// Quoting/execution is split by liquidity source:
// - 'own'             : RangerSwap's own factory/router (needs real deployed liquidity)
// - 'external-router'  : an existing Uniswap-V2-style router that already has liquidity
//                        (e.g. PulseX). Our fee is a plain transfer taken before the swap.
// - 'aggregator'       : the 0x Swap API, which sources price across many DEXs and can
//                        skim our fee automatically in the same transaction.
let currentQuote = null;
let quoteRequestId = 0;

async function calculateSwapAmount() {
    const fromAmount = document.getElementById('fromAmount').value;
    const requestId = ++quoteRequestId;

    if (!fromAmount || !fromToken || !toToken || fromAmount === '0') {
        document.getElementById('toAmount').value = '';
        document.getElementById('exchangeRate').textContent = '-';
        currentQuote = null;
        updateMinReceived();
        return;
    }

    const chain = CHAINS[currentChainId];
    const source = getLiquiditySource();

    try {
        let amountOut;

        if (source.type === 'aggregator') {
            const quote = await fetchAggregatorQuote(source, fromAmount);
            if (requestId !== quoteRequestId) return; // a newer keystroke already superseded this
            amountOut = ethers.utils.formatUnits(quote.buyAmount, toToken.decimals);
            currentQuote = { type: 'aggregator', quote };
        } else if (source.type === 'external-router') {
            if (source.routerAddress === '0x...') {
                throw new Error(`${source.label} router address not configured yet`);
            }
            const router = new ethers.Contract(source.routerAddress, ROUTER_ABI, getReadProvider(currentChainId));
            const amountIn = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
            const feeAmount = amountIn.mul(RANGER_FEE_BPS).div(10000);
            const swapAmountIn = amountIn.sub(feeAmount);
            const path = buildSwapPath(chain, fromToken, toToken);
            const amounts = await router.getAmountsOut(swapAmountIn, path);
            if (requestId !== quoteRequestId) return;
            amountOut = ethers.utils.formatUnits(amounts[amounts.length - 1], toToken.decimals);
            currentQuote = { type: 'external-router', path, feeAmount, swapAmountIn };
        } else {
            if (chain.routerAddress === '0x...') {
                document.getElementById('toAmount').value = '';
                document.getElementById('exchangeRate').textContent = 'Router not deployed';
                currentQuote = null;
                updateMinReceived();
                return;
            }
            const router = new ethers.Contract(chain.routerAddress, ROUTER_ABI, getReadProvider(currentChainId));
            const path = buildSwapPath(chain, fromToken, toToken);
            const amountIn = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
            const amounts = await router.getAmountsOut(amountIn, path);
            if (requestId !== quoteRequestId) return;
            amountOut = ethers.utils.formatUnits(amounts[amounts.length - 1], toToken.decimals);
            currentQuote = { type: 'own', path };
        }

        document.getElementById('toAmount').value = parseFloat(amountOut).toFixed(6);

        const rate = parseFloat(amountOut) / parseFloat(fromAmount);
        document.getElementById('exchangeRate').textContent = `1 ${fromToken.symbol} = ${rate.toFixed(6)} ${toToken.symbol}`;

        updateMinReceived();

    } catch (error) {
        if (requestId !== quoteRequestId) return;
        console.error('Error calculating swap amount:', error);
        document.getElementById('toAmount').value = '';
        document.getElementById('exchangeRate').textContent = 'No liquidity';
        currentQuote = null;
        updateMinReceived();
    }
}

// Builds a 0x Swap API (v2, AllowanceHolder) quote. Docs: https://docs.0x.org
// swapFeeRecipient/swapFeeBps/swapFeeToken are 0x's built-in integrator-fee mechanism --
// they skim RangerSwap's cut atomically as part of the same swap transaction.
async function fetchAggregatorQuote(source, fromAmountStr) {
    if (!ZEROX_API_KEY) {
        throw new Error('0x API key not configured (see ZEROX_API_KEY in tokens-data.js)');
    }

    const amountIn = ethers.utils.parseUnits(fromAmountStr, fromToken.decimals);
    const sellToken = fromToken.address === NATIVE_ADDRESS ? 'ETH' : fromToken.address;
    const buyToken = toToken.address === NATIVE_ADDRESS ? 'ETH' : toToken.address;

    const params = new URLSearchParams({
        sellToken,
        buyToken,
        sellAmount: amountIn.toString(),
        chainId: String(source.chainId),
        swapFeeBps: String(RANGER_FEE_BPS),
        swapFeeToken: buyToken,
        swapFeeRecipient: RANGER_FEE_RECIPIENT
    });
    if (currentAccount) params.set('taker', currentAccount);

    const response = await fetch(`${source.apiBaseUrl}/swap/allowance-holder/quote?${params.toString()}`, {
        headers: {
            '0x-api-key': ZEROX_API_KEY,
            '0x-version': 'v2'
        }
    });

    if (!response.ok) {
        throw new Error(`0x quote failed (${response.status}): ${await response.text()}`);
    }

    const quote = await response.json();
    if (quote.liquidityAvailable === false) {
        throw new Error('No liquidity available for this pair');
    }
    return quote;
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

    const chain = CHAINS[currentChainId];
    const source = getLiquiditySource();

    try {
        let tx;

        if (source.type === 'aggregator') {
            tx = await executeAggregatorSwap(source, fromAmount);
        } else if (source.type === 'external-router') {
            tx = await executeExternalRouterSwap(chain, source, fromAmount, toAmount, slippage);
        } else {
            tx = await executeOwnRouterSwap(chain, fromAmount, toAmount, slippage);
        }

        alert('Swap submitted! Transaction hash: ' + tx.hash);

        document.getElementById('fromAmount').value = '';
        document.getElementById('toAmount').value = '';
        currentQuote = null;
        updateBalance('from');
        updateBalance('to');
        updateAllTokenBalances();
        updateMinReceived();

    } catch (error) {
        console.error('Error executing swap:', error);
        alert('Swap failed: ' + (error.reason || error.message));
    }
}

async function executeOwnRouterSwap(chain, fromAmount, toAmount, slippage) {
    if (chain.routerAddress === '0x...') {
        throw new Error('Router contract not deployed on this chain yet');
    }

    const router = new ethers.Contract(chain.routerAddress, ROUTER_ABI, signer);
    const amountIn = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
    const amountOutMin = ethers.utils.parseUnits(
        (parseFloat(toAmount) * (1 - slippage / 100)).toString(),
        toToken.decimals
    );
    const to = currentAccount;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const path = buildSwapPath(chain, fromToken, toToken);

    if (fromToken.address === NATIVE_ADDRESS) {
        return router.swapExactETHForTokens(amountOutMin, path, to, deadline, { value: amountIn });
    }
    await approveToken(fromToken.address, chain.routerAddress, amountIn);
    if (toToken.address === NATIVE_ADDRESS) {
        return router.swapExactTokensForETH(amountIn, amountOutMin, path, to, deadline);
    }
    return router.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
}

// Routes through an external AMM (e.g. PulseX) that already has real liquidity.
// RangerSwap's fee is taken as a plain transfer BEFORE the swap, then the remainder
// is swapped through the external router straight to the user's wallet.
async function executeExternalRouterSwap(chain, source, fromAmount, toAmount, slippage) {
    if (source.routerAddress === '0x...') {
        throw new Error(`${source.label} router address not configured yet`);
    }
    if (RANGER_FEE_RECIPIENT === '0x...') {
        throw new Error('Fee recipient wallet not configured yet (see tokens-data.js)');
    }

    const router = new ethers.Contract(source.routerAddress, ROUTER_ABI, signer);
    const amountIn = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
    const feeAmount = amountIn.mul(RANGER_FEE_BPS).div(10000);
    const swapAmountIn = amountIn.sub(feeAmount);
    const amountOutMin = ethers.utils.parseUnits(
        (parseFloat(toAmount) * (1 - slippage / 100)).toString(),
        toToken.decimals
    );
    const to = currentAccount;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const path = buildSwapPath(chain, fromToken, toToken);

    if (fromToken.address === NATIVE_ADDRESS) {
        const feeTx = await signer.sendTransaction({ to: RANGER_FEE_RECIPIENT, value: feeAmount });
        await feeTx.wait();
        return router.swapExactETHForTokens(amountOutMin, path, to, deadline, { value: swapAmountIn });
    }

    const tokenContract = new ethers.Contract(fromToken.address, ERC20_ABI, signer);
    const feeTx = await tokenContract.transfer(RANGER_FEE_RECIPIENT, feeAmount);
    await feeTx.wait();
    await approveToken(fromToken.address, source.routerAddress, swapAmountIn);

    if (toToken.address === NATIVE_ADDRESS) {
        return router.swapExactTokensForETH(swapAmountIn, amountOutMin, path, to, deadline);
    }
    return router.swapExactTokensForTokens(swapAmountIn, amountOutMin, path, to, deadline);
}

// Routes through the 0x Swap API. 0x's own contracts pull the fee atomically as part of
// the swap, so this is a single swap transaction (plus an ERC20 approve if needed).
async function executeAggregatorSwap(source, fromAmount) {
    const quote = await fetchAggregatorQuote(source, fromAmount); // fresh quote right before sending

    if (fromToken.address !== NATIVE_ADDRESS) {
        const spender = (quote.issues && quote.issues.allowance && quote.issues.allowance.spender)
            || quote.allowanceTarget;
        const amountIn = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
        await approveToken(fromToken.address, spender, amountIn);
    }

    return signer.sendTransaction({
        to: quote.transaction.to,
        data: quote.transaction.data,
        value: quote.transaction.value ? ethers.BigNumber.from(quote.transaction.value) : undefined
    });
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
    const source = getLiquiditySource();
    if (source.type !== 'own') {
        alert(`Liquidity on ${CHAINS[currentChainId].name} is provided by ${source.label}, not by RangerSwap's own pools. Trades are routed through their existing liquidity, so there's nothing to add here yet.`);
        return;
    }
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
    const source = getLiquiditySource();

    if (source.type !== 'own') {
        positionsContainer.innerHTML = `<div class="no-positions"><p>Liquidity on ${CHAINS[currentChainId].name} is provided by ${source.label}'s existing pools, not by RangerSwap. There's no separate RangerSwap position to show here yet.</p></div>`;
        return;
    }

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
    applyTokenFilters();
}

// Make copyToClipboard globally accessible
window.copyToClipboard = copyToClipboard;