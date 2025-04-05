# Bluefin Client Library

[<img alt="Firefly logo" src="https://raw.githubusercontent.com/fireflyprotocol/firefly_exchange_client/main/res/banner.png" />](#)

<div align="center">

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/fireflyprotocol/bluefin-v2-client-ts/publish_to_npm.yml)
![GitHub package.json version](https://img.shields.io/github/package-json/v/fireflyprotocol/bluefin-client)
![GitHub](https://img.shields.io/github/license/fireflyprotocol/bluefin-client)

</div>

A typescript Bluefin client library for creating signed orders and placing them on exchange. The library provides an interface to connect with on-chain contracts and off-chain orderbook and listen to socket events emitted from both Bluefin's on-chain and off-chain parts of the protocol.

The documentation about the library can be found [here](https://bluefin-exchange.readme.io/v2.0/reference/introduction).

Examples on how to use the library are available [here](https://github.com/fireflyprotocol/bluefin-v2-client-ts/tree/main/examples).

---

## Overview

The **BluefinClient** class exposes a wide range of functions that can be grouped as follows:

### Initialization & Configuration
- **Constructor & init**  
  - **constructor** – Initializes the client with network configuration, account details, signing schemes, and flags (e.g. UI-based or ZK-login).
  - **init** – Sets up the client by configuring contracts, sockets, and performing user onboarding.
- **Initialization Helpers**  
  - **initializeWithHook**, **initializeForZkLogin**, **initializeWithKeyPair**, **initializeWithSeed**  
    – Different strategies to initialize the client using various inputs (UI wallet, ZK login, key pair, seed).
  - **initContractCalls**, **initInteractorCalls**  
    – Set up on-chain contract calls and vault (interactor) configurations using deployment JSON/config.

### Onboarding & Signature Methods
- **createOnboardingSignature** – Creates and signs an onboarding payload using wallet or ZK signing methods.
- **createZkSignature** – Generates a Zero-Knowledge signature based on user signature and ZK payload.
- **signPayloadUsingZkWallet** and **signBytesPayloadUsingZkWallet** – Sign custom payloads (object or bytes) using a ZK wallet.
- **parseAndShapeSignedData** – Parses and reformats signature data for consistent downstream usage.
- **signOrder** and **createSignedOrder** – Sign an order payload and build a fully signed order ready for submission.

### Order Management
- **placeSignedOrder** – Submits a signed order to the exchange.
- **postOrder** – Combines order creation, signing, and placement into one call.
- **Order Cancellation Methods**  
  - **createOrderCancellationSignature**, **placeCancelOrder**, **postCancelOrder** – Create cancellation signatures and submit requests.
  - **cancelAllOpenOrders** – Cancel all open orders for a given market symbol.

### Transaction & Contract Interaction
- **Leverage & Margin Adjustments**  
  - **adjustLeverage** – Adjusts the leverage of an open position, with support for sponsored transactions.
- **Deposits and Withdrawals**  
  - **depositToMarginBank**, **depositToMarginBankSponsored** – Deposit USDC into the Margin Bank.
  - **withdrawFromMarginBank** – Withdraw USDC from the Margin Bank.
  - **setSubAccount** – Add or remove subaccounts for One Click Trading.
- **Fund Transfers & Transaction Signing**  
  - **transferCoins**, **transferCoinObjects** – Transfer coins between wallets.
  - **signTransactionUsingWallet**, **signTransactionUsingZK**, **signTransactionUsingKeypair** – Sign a transaction block using different methods.
  - **executeSponseredTransactionBlock**, **buildGaslessTxPayloadBytes**, **signAndExecuteSponsoredTx**, **signAndExecuteAdjustLeverageSponsoredTx** – Support for gasless or sponsored transaction flows.
- **ZK-Specific Execution**  
  - **signAndExecuteZkTransaction** – Sign and execute a transaction using Zero-Knowledge signing.

### Market Data & Query Functions
- **Order & Position Queries**  
  - **getUserOrders**, **getUserPosition** – Retrieve orders and current positions for the user.
- **Market Snapshot & History**  
  - **getOrderbook**, **getUserTrades**, **getUserTradesHistory**, **getUserAccountData** – Fetch market data, trade history, and account information.
- **Balance & Fund Queries**  
  - **getSUIBalance**, **getUSDCBalance**, **getMarginBankBalance**, **getUSDCCoins** – Retrieve various token and balance information.
- **Test Functions**  
  - **mintTestUSDC** – Mint test USDC (for Testnet use only).

### Market Information
- **Market Data Functions**  
  - **getMarketFundingRate**, **getMarketRecentTrades**, **getMarketCandleStickData** – Get funding rates, trade data, and candlestick charts.
- **General Market Info**  
  - **getExchangeInfo**, **getMarketData**, **getMarketMetaInfo**, **getMasterInfo** – Retrieve exchange and market metadata.
- **Miscellaneous Queries**  
  - **getMarketSymbols**, **getContractAddresses**, **getExchangeStatus**, **getTickerData** – Additional queries to get supported markets and real-time exchange status.

### Vault & Reward APIs
- **Vault Details & Operations**  
  - **getUserVaultDetails**, **getVaultDetails**, **getPendingWithdrawRequests**, **getUserVaultDetailsSummary** – Get vault and user vault summary data.
  - **withdrawFromVault**, **depositToVault** – Withdraw or deposit funds in a vault.
  - **claimFromVaultBatch**, **claimFromVault**, **claimRewards** – Claim funds or rewards from vault contracts.
  - **getVaultTVL** – Retrieve time series data of vault TVL.
  
### Growth & Referral Functions
- **Referral and Campaign Management**  
  - **generateReferralCode**, **affiliateLinkReferredUser**, **getReferrerInfo** – Manage referral codes and track referred users.
  - **getCampaignDetails**, **getCampaignRewards**, **getAffiliatePayouts**, **getAffiliateRefereeDetails**, **getAffiliateRefereeCount** – Retrieve campaign and affiliate reward details.
  - **getUserRewardsHistory**, **getUserRewardsSummary**, **getTradeAndEarnRewardsOverview**, **getTradeAndEarnRewardsDetail**, **getTotalHistoricalTradingRewards**, **getMakerRewardsSummary**, **getMakerRewardDetails**, **getUserWhiteListStatusForMarketMaker** – Access an array of reward summary and detailed reward data.
  - **Open Referral Program Methods:**  
    - **getOpenReferralRefereeDetails**, **getOpenReferralDetails**, **getOpenReferralPayouts**, **generateOpenReferralReferralCode**, **getOpenReferralOverview**, **openReferralLinkReferredUser**

### Helper Methods
- **initOrderSigner** – Initializes the order signing mechanism.
- **getDeploymentJson**, **getVaultConfigsForInteractor** – Retrieve deployment and configuration data.
- **transformPoolId** – Helper to rename object properties (e.g. `pool_id` to `poolID`).

---

## How It Works

BluefinClient simplifies interacting with the Bluefin exchange by consolidating many tasks – including signing orders, adjusting margin or leverage, depositing/withdrawing funds, and querying market or vault data – into one unified interface. This integration between on-chain operations and off-chain API calls enables efficient trading and account management.

## How To?

- Typescript version should be >= 5.
- Build the library using `yarn build`
- To run tests, do `yarn test`
- To run linter, use `yarn lint`

## Additional Information

For detailed API documentation, please refer to [Bluefin Exchange Documentation](https://bluefin-exchange.readme.io/v2.0/reference/introduction).
