// Shared chain + token configuration for RangerSwap.
// Loaded by index.html, bridge.html, info.html, and admin.html BEFORE script.js/admin.js.
// admin.html can export a fresh copy of this file after you add/edit tokens.

// --- RangerSwap's fee, on top of whichever liquidity source a chain uses below ---
// This is separate from (and in addition to) whatever fee the underlying AMM/aggregator
// already charges its own LPs -- you don't run your own pools yet, so this is the only
// revenue RangerSwap collects right now.
const RANGER_FEE_RECIPIENT = '0x...'; // TODO: your treasury/fee wallet address
const RANGER_FEE_BPS = 25; // 25 basis points = 0.25%. 1 bps = 0.01%.

// TODO: get a free API key at https://dashboard.0x.org and paste it here to enable the
// '0x' aggregator liquidity mode below (used for Base). Docs: https://docs.0x.org
const ZEROX_API_KEY = '';

// --- Liquidity source per chain ---
// type 'own'             -> use RangerSwap's own factory/router (needs real deployed
//                            liquidity, i.e. someone has added LP -- not the case yet).
// type 'external-router'  -> route swaps through an existing Uniswap-V2-style router
//                            that already has real liquidity (e.g. PulseX on PulseChain).
//                            RangerSwap's fee is taken as a plain transfer before the
//                            swap. No API key needed, fully permissionless.
// type 'aggregator'       -> route swaps through the 0x Swap API, which sources the best
//                            price across many DEXs (including Uniswap) and can skim
//                            RangerSwap's fee automatically in the same transaction.
//                            Needs ZEROX_API_KEY above and is only available on chains
//                            0x supports (NOT PulseChain, NOT brand-new chains).

// Each chain lists rpcUrls as an ARRAY (not just one rpcUrl) so the app can fail over
// to the next endpoint if the first one is down/rate-limited/slow. Add more mirrors as
// you find reliable ones -- this is the fix for the RPC flakiness other DEXes are hitting.
const CHAINS = {
    369: {
        name: 'PulseChain',
        rpcUrls: ['https://rpc.pulsechain.com'], // REPLACE/ADD more RPC mirrors if you have them
        explorerUrl: 'https://scan.pulsechain.com',
        nativeCurrency: { name: 'PLS', symbol: 'PLS', decimals: 18 },
        factoryAddress: '0x...', // REPLACE WITH YOUR DEPLOYED FACTORY ADDRESS
        routerAddress: '0x...', // REPLACE WITH YOUR DEPLOYED ROUTER ADDRESS
        limitOrderAddress: '0x...', // REPLACE WITH LIMIT ORDER CONTRACT
        wethAddress: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27',
        liquiditySource: {
            type: 'external-router',
            label: 'PulseX',
            // TODO: PulseX's Router02 address -- verify on scan.pulsechain.com before use.
            routerAddress: '0x...'
        }
    },
    8453: {
        name: 'Base',
        rpcUrls: ['https://mainnet.base.org'], // REPLACE/ADD more RPC mirrors if you have them
        explorerUrl: 'https://basescan.org',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        factoryAddress: '0x...', // REPLACE WITH YOUR DEPLOYED FACTORY ADDRESS
        routerAddress: '0x...', // REPLACE WITH YOUR DEPLOYED ROUTER ADDRESS
        limitOrderAddress: '0x...', // REPLACE WITH LIMIT ORDER CONTRACT
        wethAddress: '0x4200000000000000000000000000000000000006',
        liquiditySource: {
            type: 'aggregator',
            label: '0x + Uniswap',
            aggregator: '0x',
            apiBaseUrl: 'https://api.0x.org',
            chainId: 8453
        }
    },
    998899: {
        name: 'HyperEVM',
        rpcUrls: ['https://api.hyperliquid-testnet.xyz/evm'], // REPLACE/ADD more RPC mirrors if you have them
        explorerUrl: 'https://explorer.hyperliquid-testnet.xyz',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        factoryAddress: '0x...', // REPLACE WITH YOUR DEPLOYED FACTORY ADDRESS
        routerAddress: '0x...', // REPLACE WITH YOUR DEPLOYED ROUTER ADDRESS
        limitOrderAddress: '0x...', // REPLACE WITH LIMIT ORDER CONTRACT
        wethAddress: '0x...',
        liquiditySource: { type: 'own' } // testnet -- no known external liquidity source
    },
    // Robinhood Chain -- values below are what you pasted from the chain's listing page.
    4663: {
        name: 'Robinhood Chain',
        rpcUrls: [
            'https://rpc.mainnet.chain.robinhood.com'
            // TODO: add backup RPC endpoints here as you find them -- having 2-3 mirrors
            // is what actually fixes the "RPC struggling" problem, a single endpoint will
            // always eventually rate-limit or fall behind during high load.
        ],
        explorerUrl: 'https://robinhoodchain.blockscout.com',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        factoryAddress: '0x...', // REPLACE WITH YOUR DEPLOYED FACTORY ADDRESS
        routerAddress: '0x...', // REPLACE WITH YOUR DEPLOYED ROUTER ADDRESS
        limitOrderAddress: '0x...', // REPLACE WITH LIMIT ORDER CONTRACT
        // TODO: confirm the official wrapped-ETH contract address for Robinhood Chain on
        // the Blockscout explorer above before enabling swaps -- do NOT guess this one,
        // sending ETH to the wrong "WETH" address is unrecoverable.
        wethAddress: '0x...',
        v3ComingSoon: true, // shows the "V3 Pools - Coming Soon" tab when this chain is selected
        liquiditySource: {
            type: 'external-router',
            label: 'TBD',
            // TODO: 0x/1inch/Uniswap don't support brand-new chains on day one, and
            // Robinhood Chain isn't listed with any aggregator as of this writing.
            // Point this at whichever DEX router ends up with real liquidity there,
            // confirmed on robinhoodchain.blockscout.com.
            routerAddress: '0x...'
        }
    }
};

// Token lists with logos and price info.
// `logo` can be a file path (./images/tokens/...) or a base64 data URI (what the admin
// dashboard produces when you upload an icon). `category` is 'top' or 'meme' and is used
// to filter the token-select modal.
const TOKEN_LISTS = {
    369: [
        {
            symbol: 'PLS',
            name: 'PulseChain',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            logo: './images/tokens/pls.png',
            fallbackLogo: '🔵',
            coingeckoId: 'pulsechain',
            category: 'top'
        },
        {
            symbol: 'PLSX',
            name: 'PulseX',
            address: '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab',
            decimals: 18,
            logo: './images/tokens/plsx.png',
            fallbackLogo: '⚡',
            coingeckoId: 'pulsex',
            category: 'top'
        },
        {
            symbol: 'HEX',
            name: 'HEX',
            address: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39',
            decimals: 8,
            logo: './images/tokens/hex.png',
            fallbackLogo: '⬡',
            coingeckoId: 'hex',
            category: 'top'
        },
        {
            symbol: 'WPLS',
            name: 'Wrapped PLS',
            address: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27',
            decimals: 18,
            logo: './images/tokens/wpls.png',
            fallbackLogo: '🔴',
            coingeckoId: 'pulsechain',
            category: 'top'
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
            coingeckoId: 'ethereum',
            category: 'top'
        },
        {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            decimals: 6,
            logo: './images/tokens/usdc.png',
            fallbackLogo: '💵',
            coingeckoId: 'usd-coin',
            category: 'top'
        },
        {
            symbol: 'WETH',
            name: 'Wrapped Ether',
            address: '0x4200000000000000000000000000000000000006',
            decimals: 18,
            logo: './images/tokens/weth.png',
            fallbackLogo: '🔷',
            coingeckoId: 'ethereum',
            category: 'top'
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
            coingeckoId: 'ethereum',
            category: 'top'
        },
        {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0x...',
            decimals: 6,
            logo: './images/tokens/usdc.png',
            fallbackLogo: '💵',
            coingeckoId: 'usd-coin',
            category: 'top'
        }
    ],
    // Robinhood Chain top tokens. Contract addresses are placeholders (0x...) --
    // fill these in from the Blockscout explorer once you've confirmed the real
    // deployed addresses. Add meme coins for this chain from the admin dashboard.
    4663: [
        {
            symbol: 'ETH',
            name: 'Ethereum',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            logo: './images/tokens/eth.png',
            fallbackLogo: '⟠',
            coingeckoId: 'ethereum',
            category: 'top'
        },
        {
            symbol: 'WETH',
            name: 'Wrapped Ether',
            address: '0x...', // TODO: confirm on robinhoodchain.blockscout.com
            decimals: 18,
            logo: './images/tokens/weth.png',
            fallbackLogo: '🔷',
            coingeckoId: 'ethereum',
            category: 'top'
        },
        {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0x...', // TODO: confirm on robinhoodchain.blockscout.com
            decimals: 6,
            logo: './images/tokens/usdc.png',
            fallbackLogo: '💵',
            coingeckoId: 'usd-coin',
            category: 'top'
        },
        {
            symbol: 'USDG',
            name: 'Global Dollar',
            address: '0x...', // TODO: confirm on robinhoodchain.blockscout.com
            decimals: 6,
            logo: './images/tokens/usdg.png',
            fallbackLogo: '💲',
            coingeckoId: 'global-dollar',
            category: 'top'
        }
    ]
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CHAINS, TOKEN_LISTS };
}
