export const SERVICE_URLS = {
  MARKET: {
    ORDER_BOOK: "/orderbook",
    RECENT_TRADE: "/recentTrades",
    CANDLE_STICK_DATA: "/candlestickData",
    EXCHANGE_INFO: "/exchangeInfo",
    MARKET_DATA: "/marketData",
    META: "/meta",
    STATUS: "/status",
    SYMBOLS: "/marketData/symbols",
    CONTRACT_ADDRESSES: "/marketData/contractAddresses",
    TICKER: "/ticker",
    MASTER_INFO: "/masterInfo",
    FUNDING_RATE: "/fundingRate",
    CONFIG: "/config",
  },
  USER: {
    USER_POSITIONS: "/userPosition",
    USER_TRADES: "/userTrades",
    ORDERS: "/orders",
    ACCOUNT: "/account",
    VERIFY_DEPOSIT: "/account/verifyDeposit",
    USER_TRANSACTION_HISTORY: "/userTransactionHistory",
    AUTHORIZE: "/authorize",
    ADJUST_LEVERAGE: "/account/adjustLeverage",
    FUND_GAS: "/account/fundGas",
    TRANSFER_HISTORY: "/userTransferHistory",
    FUNDING_HISTORY: "/userFundingHistory",
    CANCEL_ON_DISCONNECT: "/dms-countdown",
    GENERATE_READONLY_TOKEN: "/generateReadOnlyToken",
    USER_TRADES_HISTORY: "/userTradesHistory",
    SUBACCOUNT_1CT: "/account/addSubAccountFor1CT",
    EXPIRED_SUBACCOUNT_1CT: "/account/expired1CTAccounts",
  },
  GROWTH: {
    REFERRER_INFO: "/growth/getReferrerInfo",
    CAMPAIGN_DETAILS: "/growth/campaignDetails",
    CAMPAIGN_REWARDS: "/growth/campaignRewards",
    AFFILIATE_PAYOUTS: "/growth/affiliate/payouts",
    AFFILIATE_REFEREE_DETAILS: "/growth/affiliate/refereeDetails",
    AFFILIATE_REFEREES_COUNT: "/growth/refereesCount",
    USER_REWARDS_HISTORY: "/growth/userRewards/history",
    USER_REWARDS_SUMMARY: "/growth/userRewards/summary",
    REWARDS_OVERVIEW: "/growth/tradeAndEarn/rewardsOverview",
    REWARDS_DETAILS: "/growth/tradeAndEarn/rewardsDetail",
    TOTAL_HISTORICAL_TRADING_REWARDS:
      "/growth/tradeAndEarn/totalHistoricalTradingRewards",
    MAKER_REWARDS_SUMMARY: "/growth/marketMaker/maker-rewards-summary",
    MAKER_REWARDS_DETAILS: "/growth/marketMaker/maker-rewards-detail",
    MAKER_WHITELIST_STATUS: "/growth/marketMaker/whitelist-status",
    GENERATE_CODE: "/growth/generateCode",
    AFFILIATE_LINK_REFERRED_USER: "/growth/affiliate/linkReferee",

    OPEN_REFERRAL_REFEREE_DETAILS: "/growth/openReferral/refereeDetails",
    OPEN_REFERRAL_PAYOUTS: "/growth/openReferral/payoutsHistory",
    OPEN_REFERRAL_GENERATE_CODE: "/growth/generateAutoReferralCode",
    OPEN_REFERRAL_LINK_REFERRED_USER: "growth/openReferral/linkReferee",
    OPEN_REFERRAL_OVERVIEW: "/growth/openReferral/rewardsOverview",
    OPEN_REFERRAL_REFEREES_COUNT: "/growth/refereesCount",
  },
  ORDERS: {
    ORDERS: "/orders",
    ORDERS_HASH: "/orders/hash",
    ORDERS_HASH_V2: "/v2/user/orders/hash",
  },
};

export const VAULT_URLS = {
  VAULT: {
    CONFIG: "/vaultDetails/vaultConfigs",
    DETAILS: "/vaultDetails",
    PENDING_WITHDRAW_REQUESTS: "/vaultPendingWithdrawRequests",
  },

  USER:
  {
    VAULT_USER: "/userVaultDetails",
    VAULT_USER_SUMMARY: "/userVaultDetailsSummary"
  }


};
