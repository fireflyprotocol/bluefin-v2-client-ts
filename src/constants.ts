export const Networks = {
  DEVNET_SUI: {
    name: "devnet",
    url: "https://fullnode.testnet.sui.io:443",
    apiGateway: "https://dapi.api.sui-dev.bluefin.io",
    dmsURL: "https://dapi.api.sui-dev.bluefin.io/dead-man-switch",
    vaultURL: "https://vault.api.sui-dev.bluefin.io",
    socketURL: "wss://dapi.api.sui-dev.bluefin.io",
    webSocketURL: "wss://notifications.api.sui-dev.bluefin.io",
    onboardingUrl: "https://devnet.bluefin.io",
    faucet: "https://faucet.devnet.sui.io",
    UUID: "",
  },
  TESTNET_SUI: {
    name: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
    apiGateway: "https://dapi.api.sui-staging.bluefin.io",
    dmsURL: "https://dapi.api.sui-staging.bluefin.io/dead-man-switch",
    vaultURL: "https://vault.api.sui-staging.bluefin.io",
    socketURL: "wss://dapi.api.sui-staging.bluefin.io",
    webSocketURL: "wss://notifications.api.sui-staging.bluefin.io",
    onboardingUrl: "https://testnet.bluefin.io",
    faucet: "https://faucet.devnet.sui.io",
    UUID: "",
  },
  PRODUCTION_SUI: {
    name: "production",
    url: "https://fullnode.mainnet.sui.io:443",
    apiGateway: "https://dapi.api.sui-prod.bluefin.io",
    socketURL: "wss://dapi.api.sui-prod.bluefin.io",
    dmsURL: "https://dapi.api.sui-prod.bluefin.io/dead-man-switch",
    vaultURL: "https://vault.api.sui-prod.bluefin.io",
    webSocketURL: "wss://notifications.api.sui-prod.bluefin.io",
    onboardingUrl: "https://trade-sui.bluefin.exchange",
    faucet: "does not exist",
    UUID: "",
  },
  PRODUCTION_SUI_INTERNAL: {
    name: "production",
    url: "https://fullnode.mainnet.sui.io:443",
    apiGateway: "https://dapi.api.sui-prod.int.bluefin.io",
    socketURL: "wss://dapi.api.sui-prod.int.bluefin.io",
    dmsURL: "https://dapi.api.sui-prod.int.bluefin.io/dead-man-switch",
    vaultURL: "https://vault.api.sui-prod.int.bluefin.io",
    webSocketURL: "wss://notifications.api.sui-prod.int.bluefin.io",
    onboardingUrl: "https://trade-sui.bluefin.exchange",
    faucet: "does not exist",
    UUID: "",
  },
};

export const SUI_NETWROK = "sui";
export const POST_ORDER_BASE = 18;
export const USER_REJECTED_MESSAGE = "Rejected from user";

export enum Errors {
  WALLET_PAYLOAD_SIGNING_FAILED = "WALLET_SIGNING_FAILED",
  ZK_PAYLOAD_SIGNING_FAILED = "ZK_SIGNING_FAILED",
  KEYPAIR_PAYLOAD_SIGNING_FAILED = "KEYPAIR_SIGNING_FAILED",
  WALLET_TRANSACTION_SIGNING_FAILED = "WALLET_TRANSACTION_SIGNING_FAILED",
  ZK_TRANSACTION_SIGNING_FAILED = "ZK_TRANSACTION_SIGNING_FAILED",
  KEYPAIR_TRANSACTION_SIGNING_FAILED = "KEYPAIR_TRANSACTION_SIGNING_FAILED",
  EXECUTE_TRANSACTION_FAILED = "EXECUTE_TRANSACTION_FAILED",
  EXECUTE_SPONSORED_TRANSACTION_FAILED = "EXECUTE_SPONSORED_TRANSACTION_FAILED",
  BUILD_GASLESS_PAYLOAD_TX_PAYLOAD_BYTES_FAILED = "BUILD_GASLESS_PAYLOAD_TX_PAYLOAD_BYTES_FAILED",
  DAPI_ERROR = "DAPI_ERROR",
  SIGN_UPSERT_SUB_ACCOUNT_CONTRACT_CALLED_FAILED = "SIGN_UPSERT_SUB_ACCOUNT_CONTRACT_CALLED_FAILED",
  DEPOSIT_TO_BANK_CONTRACT_CALL_FAILED = "DEPOSIT_TO_BANK_CONTRACT_CALL_FAILED",
  FAILED_TO_FETCH_USDC_COIN_HAVING_BALANCE = "FAILED_TO_FETCH_USDC_COIN_HAVING_BALANCE",
  FAILED_TO_FETCH_USDC_COINS = "FAILED_TO_FETCH_USDC_COINS",
  FAILED_TO_MERGE_USDC_COINS = "FAILED_TO_MERGE_USDC_COINS",
  FAILED_TO_INITIALIZE_CLIENT = "FAILED_TO_INITIALIZE_CLIENT",
  FAILED_TO_INITIALIZE_CLIENT_FOR_UI_WALLET = "FAILED_TO_INITIALIZE_CLIENT_FOR_UI_WALLET",
  FAILED_TO_INITIALIZE_CLIENT_FOR_ZK_ACCOUNT = "FAILED_TO_INITIALIZE_CLIENT_FOR_ZK_ACCOUNT",
  UNKNOWN = "UNKNOWN",
}

export enum OffchainOrderUpdateAction {
  sentForSettlement = "SENT_FOR_SETTLEMENT",
  orderRequeued = "REQUEUING_ORDER",
  orderCancelledOnReversion = "CANCELLING_ORDER",
}
