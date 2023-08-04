//import { Network } from "@firefly-exchange/library-sui";

export const Networks = {
  TESTNET_SUI: {
    name: "testnet",
    url: "https://rpc.ankr.com/sui_testnet/4a4cd7c3b641d0a38e81b12eefdba15c08ecc8b227b84f9052f1e8b7d7952af2",
    apiGateway: "https://dapi.api.sui-staging.bluefin.io",
    dmsURL: "https://dapi.api.sui-staging.bluefin.io/dead-man-switch",
    socketURL: "wss://https://dapi.api.sui-staging.bluefin.io",
    webSocketURL: "wss://notifications.api.sui-staging.bluefin.io",
    
    faucet: "https://rpc.ankr.com/sui_testnet/4a4cd7c3b641d0a38e81b12eefdba15c08ecc8b227b84f9052f1e8b7d7952af2/gas",
  },
  PRODUCTION_SUI: {
    name: "production",
    url: "https://arb1.arbitrum.io/rpc/",
    apiGateway: "https://dapi.api.arbitrum-prod.firefly.exchange",
    socketURL: "wss://dapi.api.arbitrum-prod.firefly.exchange",
    dmsURL: "https://api.arbitrum-prod.firefly.exchange/dead-man-switch",
    webSocketURL: "wss://notifications.api.arbitrum-prod.firefly.exchange/",
    onboardingUrl: "https://trade-arb.firefly.exchange",
    faucet: "does not exist",
  },
  LOCAL_SUI: {
    name: "local",
    url: "http://127.0.0.1:9000",
    apiGateway: "https://dapi.api.sui-staging.bluefin.io",
    dmsURL: "https://dapi.api.sui-staging.bluefin.io/dead-man-switch",
    socketURL: "wss://https://dapi.api.sui-staging.bluefin.io",
    webSocketURL: "wss://notifications.api.sui-staging.bluefin.io",
    onboardingUrl: "https://testnet.bluefin.io",
    faucet: "http://127.0.0.1:5003/gas",
  },
};

export const DEFAULT_PRECISION = 6;
export const SUI_NETWROK = "sui";

export const EXTRA_FEES = 10000;

export interface Network {
  name?: string;
  rpc?: string;
  faucet?: string;
  url?: string;
}

//adding this here as it's temporary support for socket.io
// adding this here as it's temporary support for socket.io
export interface ExtendedNetwork extends Network {
  apiGateway?: string; // making it optional for backward compatibility
  socketURL?: string;
  onboardingUrl?: string;
  webSocketURL: string;
  dmsURL?: string;
}
