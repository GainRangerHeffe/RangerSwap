# RangerSwap

A multi-chain DEX front end with its own Uniswap V2 style contracts. It can swap through RangerSwap's own router, through an existing router that already has liquidity (for example PulseX on PulseChain), or through the 0x aggregator, and takes a small configurable fee on top.

Configured chains: Ethereum, Base, PulseChain, HyperEVM and Robinhood Chain.

## What is in this repo

**Front end** (static, no build step)

| File | Purpose |
|---|---|
| `index.html` | Swap interface |
| `bridge.html` | Links to third-party bridges for the supported chains |
| `info.html` | Project status, routing, fees and links to the contract source |
| `admin.html`, `admin.js` | Token manager: add or edit chains and tokens in the browser, then export a new `tokens-data.js` |
| `tokens-data.js` | Chain list, RPC endpoints, token lists, fee settings and liquidity source per chain |
| `script.js` | Wallet connection, quoting and swap logic |
| `styles.css` | Styles |

**Contracts** (Solidity)

| File | Contract |
|---|---|
| `factory.sol` | `RangerSwapFactory`, a Uniswap V2 factory |
| `rangerrouter.sol` | `RangerSwapRouter`, a Uniswap V2 router |
| `rangerfeerouter.sol` | `RangerSwapFeeRouter`, wraps an external router and collects the RangerSwap fee |
| `limitorder.sol` | `RangerSwapLimitOrders`, on-chain limit orders |

The contracts have not been audited.

## Run locally

```bash
npx serve .
```

Open the printed URL in a browser with a wallet extension.

## Configuration

Edit the top of `tokens-data.js`, or use `admin.html` and export:

- `RANGER_FEE_RECIPIENT`: wallet that receives the swap fee
- `RANGER_FEE_BPS`: fee in basis points (default 25, which is 0.25%)
- `ZEROX_API_KEY`: needed only for chains set to the `aggregator` liquidity mode; get one at [dashboard.0x.org](https://dashboard.0x.org)
- Per-chain liquidity source: `own`, `external-router` or `aggregator`

## Status

Work in progress. Swaps work; the liquidity, pools and limit order tabs are interface only until the contracts are deployed. Token and bridge logo images are not in the repo, so tokens show their built-in fallback icons. The fee recipient and 0x key are placeholders, and RangerSwap's own pools have no liquidity yet, so chains should use the `external-router` or `aggregator` modes.
