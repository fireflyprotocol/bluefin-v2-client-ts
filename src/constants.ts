import { Network } from "@firefly-exchange/library-sui";

export const Networks = {
  TESTNET_SUI: {
    name: "testnet",
    rpc: "https://fullnode.devnet.sui.io:443",
    apiGateway: "https://dapi.api.arbitrum-staging.firefly.exchange",
    dmsURL: "https://api.arbitrum-staging.firefly.exchange/dead-man-switch",
    socketURL: "wss://dapi.api.arbitrum-staging.firefly.exchange",
    webSocketURL: "wss://notifications.api.arbitrum-staging.firefly.exchange/",
    onboardingUrl: "https://testnet.firefly.exchange",
    faucet: "https://faucet.devnet.sui.io",
  },
  PRODUCTION_SUI: {
    name: "production",
    rpc: "https://arb1.arbitrum.io/rpc/",
    apiGateway: "https://dapi.api.arbitrum-prod.firefly.exchange",
    socketURL: "wss://dapi.api.arbitrum-prod.firefly.exchange",
    dmsURL: "https://api.arbitrum-prod.firefly.exchange/dead-man-switch",
    webSocketURL: "wss://notifications.api.arbitrum-prod.firefly.exchange/",
    onboardingUrl: "https://trade-arb.firefly.exchange",
    faucet: "does not exist",
  },
  LOCAL_SUI: {
    name: "local",
    rpc: "http://127.0.0.1:9000",
    apiGateway: "https://dapi.api.arbitrum-staging.firefly.exchange",
    dmsURL: "https://api.arbitrum-staging.firefly.exchange/dead-man-switch",
    socketURL: "wss://dapi.api.arbitrum-staging.firefly.exchange",
    webSocketURL: "wss://notifications.api.arbitrum-staging.firefly.exchange/",
    onboardingUrl: "https://testnet.firefly.exchange",
    faucet: "http://127.0.0.1:9123/gas",
  },
};

export const DEFAULT_PRECISION = 6;
export const SUI_NETWROK = "sui";

export const EXTRA_FEES = 10000;

//adding this here as it's temporary support for socket.io
export interface ExtendedNetwork extends Network {
  apiGateway: string;
  socketURL: string;
  onboardingUrl: string;
  webSocketURL: string;
  dmsURL?: string;
}
