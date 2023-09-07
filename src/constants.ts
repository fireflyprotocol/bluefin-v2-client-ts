// import { Network } from "@firefly-exchange/library-sui";

export const Networks = {
  TESTNET_SUI: {
    name: "testnet",
    url: "https://fullnode.devnet.sui.io:443",
    apiGateway: "https://dapi.api.sui-staging.bluefin.io",
    dmsURL: "https://dapi.api.sui-staging.bluefin.io/dead-man-switch",
    socketURL: "wss://dapi.api.sui-staging.bluefin.io",
    webSocketURL: "wss://notifications.api.sui-staging.bluefin.io",
    onboardingUrl: "https://testnet.bluefin.io",
    faucet: "https://faucet.devnet.sui.io",
  },
  PRODUCTION_SUI: {
    name: "production",
    url: "https://fullnode.mainnet.sui.io:443",
    apiGateway: "https://dapi.api.sui-prod.bluefin.io",
    socketURL: "wss://dapi.api.sui-prod.bluefin.io",
    dmsURL: "https://dapi.api.sui-prod.bluefin.io/dead-man-switch",
    webSocketURL: "wss://notifications.api.sui-prod.bluefin.io",
    onboardingUrl: "https://trade-sui.bluefin.exchange",
    faucet: "does not exist",
  },
  LOCAL_SUI: {
    name: "testnet",
    url: "https://fullnode.devnet.sui.io:443",
    apiGateway: "https://dapi.api.sui-staging.bluefin.io",
    dmsURL: "https://dapi.api.sui-staging.bluefin.io/dead-man-switch",
    socketURL: "wss://dapi.api.sui-staging.bluefin.io",
    webSocketURL: "wss://notifications.api.sui-staging.bluefin.io",
    onboardingUrl: "https://testnet.bluefin.io",
    faucet: "https://faucet.devnet.sui.io",
  },
};

export const DEFAULT_PRECISION = 6;
export const SUI_NETWROK = "sui";

export const EXTRA_FEES = 10000;

export const POST_ORDER_BASE = 18;
