import {
  address, CANCEL_REASON, Interval, MARGIN_TYPE, MarketSymbol, ORDER_SIDE, ORDER_STATUS, ORDER_TYPE, SuiClient, TIME_IN_FORCE, BaseWallet
} from "@firefly-exchange/library-sui";

export interface GetTransactionHistoryRequest {
  symbol?: MarketSymbol; // will fetch orders of provided market
  pageSize?: number; // will get only provided number of orders must be <= 50
  pageNumber?: number; // will fetch particular page records. A single page contains 50 records.
}

export interface GetFundingHistoryRequest {
  symbol?: MarketSymbol; // will fetch orders of provided market
  pageSize?: number; // will get only provided number of orders must be <= 50
  cursor?: number; // will fetch particular page records. A single page contains 50 records.
  parentAddress?: string;
}

export interface GetTransferHistoryRequest {
  pageSize?: number; // will get only provided number of orders must be <= 50
  cursor?: number; // will fetch particular page records. A single page contains 50 records.
  action?: string; // Deposit / Withdraw
}
export interface GetOrderRequest extends GetTransactionHistoryRequest {
  symbol?: MarketSymbol;
  orderId?: number;
  orderHashes?: string[];
  statuses: ORDER_STATUS[]; // status of orders to be fetched
  orderType?: ORDER_TYPE[]; // order type LIMIT / MARKET
  pageSize?: number;
  pageNumber?: number;
  parentAddress?: string;
}

export interface GetPositionRequest extends GetTransactionHistoryRequest {
  parentAddress?: string;
}

export interface RequiredOrderFields {
  symbol: MarketSymbol; // market for which to create order
  price: number; // price at which to place order. Will be zero for a market order
  quantity: number; // quantity/size of order
  side: ORDER_SIDE; // BUY/SELL
  orderType: ORDER_TYPE; // MARKET/LIMIT
  triggerPrice?: number; // optional, send triggerPrice for stop orders
  postOnly?: boolean; // true/false, default is false
  cancelOnRevert?: boolean; // true/false, default is false
  orderbookOnly?: boolean; // true/false, default is true
  timeInForce?: TIME_IN_FORCE; // IOC/GTT by default all orders are GTT
}

export interface OrderSignatureRequest extends RequiredOrderFields {
  leverage?: number; // leverage to take, default is 1
  reduceOnly?: boolean; // is order to be reduce only true/false, default its false
  salt?: number; // random number for uniqueness of order. Generated randomly if not provided
  expiration?: number; // time at which order will expire. Will be set to 1 month if not provided
  maker?: address; // address of the parent account on behalf user wants to place the order
  isBuy?: boolean;
}

export interface OrderSignatureResponse extends RequiredOrderFields {
  leverage: number;
  reduceOnly: boolean;
  salt: number;
  expiration: number;
  orderSignature: string;
  maker: address;
}

export interface PlaceOrderRequest extends OrderSignatureResponse {
  clientId?: string;
}

export interface PostOrderRequest extends OrderSignatureRequest {
  clientId?: string;
}

interface OrderResponse {
  id: number;
  clientId: string;
  requestTime: number;
  cancelReason: CANCEL_REASON;
  orderStatus: ORDER_STATUS;
  hash: string;
  symbol: MarketSymbol;
  orderType: ORDER_TYPE;
  timeInForce: TIME_IN_FORCE;
  userAddress: address;
  side: ORDER_SIDE;
  price: string;
  triggerPrice: string;
  quantity: string;
  leverage: string;
  reduceOnly: boolean;
  expiration: number;
  salt: number;
  filledQty: string;
  avgFillPrice: string;
  createdAt: number;
  updatedAt: number;
  makerFee: string;
  takerFee: string;
  openQty: string;
  cancelOnRevert?: boolean;
}

export interface GetOrderResponse extends OrderResponse {
  fee: string;
  postOnly: boolean;
  cancelOnRevert: boolean;
  triggerPrice: string;
  margin: string;
}

export interface GetOrderResponse extends OrderResponse {
  fee: string;
  postOnly: boolean;
  cancelOnRevert: boolean;
  triggerPrice: string;
  margin: string;
}
export interface PlaceOrderResponse extends OrderResponse {
  postOnly?: boolean;
  cancelOnRevert?: boolean;
}

export interface OrderCancelSignatureRequest {
  symbol: MarketSymbol;
  hashes: string[];
  parentAddress?: string;
}

export interface OrderCancellationRequest extends OrderCancelSignatureRequest {
  signature: string;
}

export type CancelOrder = {
  hash: string;
  reason?: string;
};

export type CancelOrderResponse = {
  message: string;
  data: {
    acceptedForCancelling: CancelOrder[];
    failedCancelling: CancelOrder[];
  };
};

export interface GetOrderbookRequest {
  symbol: MarketSymbol;
  limit: number; // number of bids/asks to retrieve, should be <= 50
}

export interface GetPositionResponse {
  userAddress: address;
  symbol: MarketSymbol;
  marginType: MARGIN_TYPE;
  side: ORDER_SIDE;
  avgEntryPrice: string;
  quantity: string;
  margin: string;
  leverage: string;
  positionSelectedLeverage: string;
  liquidationPrice: string;
  positionValue: string;
  unrealizedProfit: string;
  unrealizedProfitPercent: string;
  midMarketPrice: string;
  oraclePrice?: string;
  indexPrice?: string;
  updatedAt: number;
  createdAt: number;
}

export interface GetOrderBookResponse {
  asks: string[][];
  bids: string[][];
  midPrice: string;
  symbol: MarketSymbol;
  lastUpdatedAt: number;
  orderbookUpdateId: number;
  responseSentAt: number;

  bestBidPrice: string;
  bestBidQty: string;
  bestAskPrice: string;
  bestAskQty: string;
  oraclePrice: string;
  oraclePriceLastUpdateAt: number;
  firstUpdateId?: number;
  lastUpdateId?: number;

  limit?: number;
}

export interface GetUserTradesRequest {
  symbol?: MarketSymbol;
  maker?: boolean;
  fromId?: number;
  startTime?: number;
  endTime?: number;
  pageSize?: number;
  pageNumber?: number;
  type?: ORDER_TYPE;
  parentAddress?: string;
}

export interface GetUserTradesResponse {
  id: number;
  symbol: MarketSymbol;
  commission: string;
  commissionAsset: string;
  maker: boolean;
  orderHash: string;
  side: ORDER_SIDE;
  price: string;
  quantity: string;
  quoteQty: string;
  realizedPnl: string;
  time: number;
  clientId: string;
  orderId: number;
  tradeType: string;
}

export interface GetUserTradesHistoryRequest {
  symbol?: MarketSymbol;
  maker?: boolean;
  fromId?: number;
  startTime?: number;
  endTime?: number;
  limit?: number;
  cursor?: number;
  type?: ORDER_TYPE;
  parentAddress?: string;
}

export interface GetUserTradesHistoryResponse {
  data: GetUserTradesResponse[];
  nextCursor: number;
  isMoreDataAvailable: boolean;
}

export interface MarketAccountData {
  symbol: MarketSymbol;
  positionQtyReduced: string;
  positionQtyReducible: string;
  unrealizedProfit: string;
  positionMargin: string;
  expectedPnl: string;
  selectedLeverage: string;
}

export interface GetAccountDataResponse {
  address: address;
  feeTier: string;
  canTrade: boolean;
  totalPositionMargin: string;
  totalPositionQtyReduced: string;
  totalPositionQtyReducible: string;
  totalExpectedPnl: string;
  totalUnrealizedProfit: string;
  walletBalance: string;
  freeCollateral: string;
  accountValue: string;
  accountDataByMarket: MarketAccountData[];
  updateTime: number;
}

export interface GetUserTransactionHistoryResponse {
  id: number;
  symbol: MarketSymbol;
  commission: string;
  commissionAsset: string;
  maker: boolean;
  side: ORDER_SIDE;
  price: string;
  quantity: string;
  quoteQty: string;
  realizedPnl: string;
  time: number;
  orderHash: string;
  traderType: string;
}

export interface UserTransferHistoryResponse {
  id: number;
  status: string;
  action: string;
  amount: string;
  userAddress: string;
  blockNumber: number;
  latestTxHash: string;
  time: number;
  createdAt: number;
  updatedAt: number;
}

export interface GetUserTransferHistoryResponse {
  data: UserTransferHistoryResponse[];
  nextCursor: number;
  isMoreDataAvailable: boolean;
}

export interface GetFundingRateResponse {
  symbol: MarketSymbol;
  createdAt: number;
  nextTime: number;
  fundingRate: string;
}

export interface UserFundingHistoryResponse {
  id: number;
  symbol: MarketSymbol;
  userAddress: string;
  quantity: string;
  time: number;
  appliedFundingRate: string;
  isFundingRatePositive: boolean;
  payment: string;
  isPaymentPositive: boolean;
  oraclePrice: string;
  side: ORDER_SIDE;
  blockNumber: number;
  isPositionPositive: boolean;
}

export interface GetUserFundingHistoryResponse {
  data: UserFundingHistoryResponse[];
  nextCursor: number;
  isMoreDataAvailable: boolean;
}

export interface GetMarketRecentTradesRequest {
  symbol: MarketSymbol;
  pageSize?: number;
  pageNumber?: number;
  traders?: address;
}

export interface GetMarketRecentTradesResponse {
  symbol: MarketSymbol;
  id: number;
  price: string;
  quantity: string;
  quoteQty: string;
  time: number;
  side: ORDER_SIDE;
}

export interface GetCandleStickRequest {
  symbol: MarketSymbol;
  interval: Interval;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

/* Market Endpoints */
export interface ExchangeInfo {
  symbol: MarketSymbol;
  status: string;
  baseAssetSymbol: string;
  baseAssetName: string;
  quoteAssetSymbol: string;
  quoteAssetName: string;
  maintenanceMarginReq: string;
  initialMarginReq: string;
  stepSize: number;
  tickSize: number;
  minOrderSize: number;
  maxLimitOrderSize: string;
  maxMarketOrderSize: string;
  minOrderPrice: string;
  maxOrderPrice: string;
  defaultMakerFee: string;
  defaultTakerFee: string;
  insurancePoolPercentage: string;
  mtbLong: string;
  mtbShort: string;
  defaultLeverage: string;
  maxAllowedOIOpen: [];
}

export interface MarketData {
  symbol: MarketSymbol;
  lastQty: string;
  lastTime: string;
  lastPrice: string;
  _24hrHighPrice: string;
  _24hrLowPrice: string;
  _24hrVolume: string;
  _24hrQuoteVolume: string;
  _24hrClosePrice: string;
  _24hrOpenPrice: string;
  _24hrCloseTime: string;
  _24hrOpenTime: string;
  _24hrCount: string;
  oraclePrice?: string;
  indexPrice?: string;
  midMarketPrice: string;
  _24hrFirstId: number;
  _24hrLastId: number;
  bestBidPrice: string;
  bestBidQty: string;
  bestAskPrice: string;
  bestAskQty: string;
  lastFundingRate: string;
  nextFundingTime: string;
  time: string;
  _24hrPriceChange: string;
  midMarketPriceDirection: number;
  _24hrPriceChangePercent: string;
  marketPrice: string;
  marketPriceDirection: number;
}

export interface MarketMeta {
  symbol: MarketSymbol;
  domainHash: string;
  onboardingWebsiteUrl: string;
  rpcURI: string;
  networkID: string;
  orderAddress: address;
  liquidationAddress: address;
  perpetualAddress: address;
}

export interface MasterInfoData {
  symbol: string;
  meta: MarketMeta;
  exchangeInfo: ExchangeInfo;
  marketData: MarketData;
}

export interface MasterInfo {
  _24hrTrades: string;
  _24hrVolume: string;
  data: MasterInfoData[];
}

export interface TickerData {
  symbol: MarketSymbol;
  _24hrPriceChange: string;
  _24hrPriceChangePercent: string;
  openTime: number;
  closeTime: number;
  price: string;
  priceDirection: number;
  _24hrVolume: string;
  oraclePrice?: string;
  indexPrice?: string;
}

export interface StatusResponse {
  isAlive: boolean;
  serverTime: number;
}

export interface AuthorizeHashResponse {
  token: string;
}

export interface adjustLeverageRequest {
  symbol: MarketSymbol;
  leverage: number;
  parentAddress?: string;
  signedTransaction?: string;
}
export interface AdjustLeverageResponse {
  symbol: string;
  address: string;
  leverage: string;
  marginType: string;
  maxNotionalValue: string;
}

export interface FundGasResponse {
  message: string;
}

export interface UserSubscriptionAck {
  success: boolean;
  message: string;
}
export interface verifyDepositResponse {
  verificationStatus: string;
}
export interface CountDown {
  symbol: string;
  countDown: number;
}
export interface PostTimerAttributes {
  countDowns: CountDown[];
  parentAddress?: string;
}
export interface FailedCountDownResetResponse {
  symbol: string;
  reason: string;
}
export interface PostTimerResponse {
  acceptedToReset: string[];
  failedReset: FailedCountDownResetResponse[];
}
export interface GetCountDownsResponse {
  countDowns: CountDown[];
  timestamp: number;
}

export interface NetworkConfigs {
  name?: string;
  rpc?: string;
  faucet?: string;
  url?: string;
}
// adding this here as it's temporary support for socket.io
export interface ExtendedNetwork extends NetworkConfigs {
  apiGateway?: string; // making it optional for backward compatibility
  socketURL?: string;
  onboardingUrl?: string;
  webSocketURL: string;
  dmsURL?: string;
  UUID?: string;
}

export interface ConfigResponse {
  deployment: {
    objects: {
      Bank: ObjectDetails;
      package: ObjectDetails;
      Currency?: ObjectDetails;
      BankTable?: ObjectDetails;
      UpgradeCap?: ObjectDetails;
      OrderStatus?: ObjectDetails;
      SubAccounts?: ObjectDetails;
      TreasuryCap?: ObjectDetails;
      SettlementCap?: ObjectDetails;
      FundingRateCap?: ObjectDetails;
      DeleveragingCap?: ObjectDetails;
      CapabilitiesSafe?: ObjectDetails;
      ExchangeAdminCap?: ObjectDetails;
      ExchangeGuardianCap?: ObjectDetails;
    };
    markets: {
      [market: string]: {
        Objects: {
          Perpetual?: ObjectDetails;
          BankAccount?: ObjectDetails;
          PriceOracle?: ObjectDetails;
          PositionsTable?: ObjectDetails;
        };
      };
    };
  };
}

export interface ObjectDetails {
  id: string;
  owner: string;
  dataType: string;
}

export interface ExtendedWalletContextState
  extends Omit<BaseWallet, "signMessage"> {
  wallet: BaseWallet;
  provider: SuiClient;
  signData: (data: Uint8Array) => Promise<string>;
  getAddress: () => string | undefined;
  signMessage: (
    data: Uint8Array
  ) => Promise<{ messageBytes: string; signature: string }>;
}

export interface GetReferrerInfoResponse {
  isReferee: boolean;
}
export interface GetCampaignDetailsResponse {
  id: number;
  campaignName: string;
  parentCampaignName?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  epochDurationSeconds: number;
  config: {
    cashShare: string;
    tokenShare: string;
    shareOfFees: string;
    refereeDiscount: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GetCampaignRewardsResponse {
  campaignName: string;
  campaignConfig: {
    cashShare: string;
    tokenShare: string;
    shareOfFees: string;
    refereeDiscount: string;
  };
  cashReward: string;
  tokenReward: string;
}

export interface GetAffiliatePayoutsResponse {
  epStartDate: string;
  epEndDate: string;
  isActive: boolean;
  totalReferralFees: string;
  cashReward: string;
  tokenReward: string;
  epochNumber: string;
}

export interface GetAffiliateRefereeDetailsRequest {
  campaignId: number;
  pageNumber?: number;
  pageSize?: number;
  parentAddress?: string;
}
export interface GetAffiliateRefereeDetailsResponse {
  data: AffiliateRefereeDetailsData[];
  nextCursor: number;
  isMoreDataAvailable: boolean;
}
interface AffiliateRefereeDetailsData {
  userAddress: string;
  lastTraded?: string;
  dateJoined: string;
  feesPaid: string;
}

export interface GetAffiliateRefereeCountResponse {
  referralCode: string;
  referralCount: number;
}

export interface GetUserRewardsHistoryRequest {
  pageSize?: number;
  cursor?: number;
  parentAddress?: string;
}
export interface GetUserRewardsHistoryResponse {
  data: UserRewardsHistoryData[];
  nextCursor: number;
  isMoreDataAvailable: boolean;
}
interface UserRewardsHistoryData {
  programName: string;
  parentProgramName?: string;
  startDate: string;
  endDate: string;
  cashReward: string;
  tokenReward: string;
  isActive: boolean;
  cursor: string;
  epochNumber: string;
}

export interface GetUserRewardsSummaryResponse {
  totalTokenReward: string;
  totalCashReward: string;
  campaignData: RewardsSummaryData[];
}
interface RewardsSummaryData {
  campaignName: string;
  totalCashReward: string;
  totalTokenReward: string;
}

export interface GetTradeAndEarnRewardsOverviewResponse {
  totalHistoricalRewards: string;
  totalActiveRewards: string;
  totalFeePaid: string;
  latestEpochNumber: string;
  latestEpochStart: number;
  latestEpochEnd: number;
  latestEpochTotalFee: string;
  latestEpochTotalRewards: string;
}

export interface GetTradeAndEarnRewardsDetailRequest {
  campaignId: number;
  pageSize?: number;
  cursor?: number;
  parentAddress?: string;
}

export interface GetTradeAndEarnRewardsDetailResponse {
  data: TradeAndEarnRewardsDetailData[];
  nextCursor: string;
  isMoreDataAvailable: boolean;
}
interface TradeAndEarnRewardsDetailData {
  tradingRewards: string;
  feePaid: string;
  cursor: string;
  id: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  epochNumber: string;
}

export interface GetTotalHistoricalTradingRewardsResponse {
  totalTokenRewards: string;
}

export interface GetMakerRewardsSummaryResponse {
  latestEpochStart: number;
  latestEpochEnd: number;
  latestEpochNumber: string;
  latestEpochTotalRewards: string;
  totalActiveRewards: string;
  totalHistoricalRewards: string;
}
export interface GetMakerRewardDetailsRequest {
  symbol?: string;
  pageSize?: number;
  cursor?: number;
  parentAddress?: string;
}

export interface GetMakerRewardDetailsResponse {
  data: MakerRewardDetailsData[];
  nextCursor: number;
  isMoreDataAvailable: boolean;
}
interface MakerRewardDetailsData {
  latestEpochNumber: string;
  status: string;
  makerVolume: string;
  volumePercentage: string;
  rewardPoolPercentage: string;
  makerRewards: string;
  startDate: string;
  endDate: string;
  cursor: string;
  liquidityScore?: string; //come if symbol provided in request
  uptimePercentage?: string; //come if symbol provided in request
}

export interface GetUserWhiteListStatusForMarkeMakerResponse {
  isWhitelist: boolean;
}

export interface GenerateReferralCodeRequest {
  referralCode: string;
  campaignId: number;
}
export interface GenerateReferralCodeResponse {
  referralAddress: string;
  referralCode: string;
  message?: string;
}

export interface LinkReferredUserRequest {
  referralCode: string;
}
export interface LinkReferredUserResponse {
  referralCode: string;
  refereeAddress: string;
  campaignId: number;
  message?: string;
}

export interface MatchedOrderData {
  fillPrice: string;
  quantity: string;
}

export interface OrderSentForSettlementUpdateResponse {
  orderHash: string;
  userAddress: string;
  symbol: string;
  message: string;
  quantitySentForSettlement: string;
  orderQuantity: string;
  isMaker: boolean;
  isBuy: boolean;
  avgFillPrice: string;
  fillId: string;
  timestamp: number;
  matchedOrders: MatchedOrderData[];
}

export interface OrderRequeueUpdateResponse {
  orderHash: string;
  userAddress: string;
  symbol: string;
  message: string;
  isBuy: boolean;
  fillId: string;
  quantitySentForRequeue: string;
  timestamp: number;
}
export interface OrderBookPartialDepth {
  symbol: string;
  orderbookUpdateId: number;
  depth: number;
  asks: string[][];
  bids: string[][];
}

export interface OrderCancellationOnReversionUpdateResponse {
  orderHash: string;
  userAddress: string;
  symbol: string;
  message: string;
  isBuy: boolean;
  fillId: string;
  quantitySentForCancellation: string;
  timestamp: number;
}

export interface Callbacks {
  [event: string]: Function;
}

export type OpenReferralPayout = {
  epochNumber: number;
  epStartDate: string;
  epEndDate: string;
  isActive: true;
  referralPoints: string;
  referralTradeAndEarnPoints: string;
  rewardedPoints: string;
  cursor: string;
};
export type OpenReferralPayoutList = OpenReferralPayout[];

export type OpenReferralOverview = {
  totalHistoricalRewardedPoints: string;
  totalHistoricalRefereePoints: string;
  totalHistoricalReferralPoints: string;
  totalActiveRewardedPoints: string;
  totalActiveRefereePoints: string;
  totalActiveReferralPoints: string;
  latestEpochNumber: number;
  latestEpochStart: string;
  latestEpochEnd: string;
  latestEpochReferralMultiplier: string;
  latestEpochRefereeMultiplier: string;
};

export type OpenReferralRefereeDetail = {
  refereeAddress: string;
  tradeAndEarnPoints: string;
  refereePoints: string;
  rewardedPoints: string; // as a referrer,
  lastTraded: string;
  dateJoined: string;
};

export type OpenReferralRefereeDetails = OpenReferralRefereeDetail[];

export type OpenReferralDetails = {
  referralCode: string;
  referralCount: number;
};
