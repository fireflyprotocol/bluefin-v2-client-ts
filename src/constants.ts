import { Network } from "../submodules/library-sui/src/interfaces/deployment";

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
    faucet: "http://localhost:5003",
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

export const CONTRACT_ADDRESSES = {
  "DOGE-PERP": {
    USDC: "0xF926692B7241F48fbCB549B3a78E96082af97E55",
    Guardian: "0xcAb80648BeD7C04A17BE0D8D45670f4071a20Cc8",
    Evaluator: "0x131a8AB53391f014c567fE616f2e07102A158fb8",
    Perpetual: "0x40a8b29408D33847835B826A09badE3eA8A06EE9",
    MarginBank: "0xA7b6057372c7dc6cA705332bB95d696666E5578C",
    MarginMath: "0x9c2076A31A441Df89d1250D0B1eaBa42D9217175",
    IsolatedADL: "0xbef86347D7c95887062de16977a5AE0e863a0e12",
    FundingOracle: "0x63bDe2c602b983b44F9CBa478FEa4FD00a378f53",
    IsolatedTrader: "0x815144100E97867e1C2688e23151e5E69bEBd0cc",
    DummyPriceOracle: "0xe8364FaE01a1E2D42A582D58c6AD02F6637Eb21F",
    PriceOracleProxy: "0xe8364FaE01a1E2D42A582D58c6AD02F6637Eb21F",
    IsolatedLiquidation: "0x0F6F304C881f5AE572D004DC33E76D23b1A72bAf",
  },
  "BTC-PERP": {
    USDC: "0xF926692B7241F48fbCB549B3a78E96082af97E55",
    Guardian: "0xcAb80648BeD7C04A17BE0D8D45670f4071a20Cc8",
    Evaluator: "0x2E8991Aa5853c152d46bB78085caE743a6b45ff2",
    Perpetual: "0x55414492f7B20B73D1B2725c5D09B3683DabA9af",
    MarginBank: "0xA7b6057372c7dc6cA705332bB95d696666E5578C",
    MarginMath: "0xbC01C3D4727d760E07828ABb9d59E011fD21f22A",
    FundingOracle: "0x440BdBF4a48507e50b5C68E75d6E402B73D457Ab",
    IsolatedTrader: "0xD01e6a5106CA141ea8FD13b19CC06C097181A4c1",
    PriceOracleProxy: "0x0439cBd52ad71fA5C5CCFc0B3F09Ce197f5d71F9",
    IsolatedLiquidation: "0x1eE539094dF529a6a0494AB1526e6E27E535C582",
    PriceOracleAggregator: "0x0439cBd52ad71fA5C5CCFc0B3F09Ce197f5d71F9",
  },
  "ETH-PERP": {
    USDC: "0xF926692B7241F48fbCB549B3a78E96082af97E55",
    Guardian: "0xcAb80648BeD7C04A17BE0D8D45670f4071a20Cc8",
    Evaluator: "0xD319a31e3ad3f8c86184Bde2B1728aFDb19767e2",
    Perpetual: "0xD7a4c67F23757DA9927e67F7Bf50b99C9aa5c652",
    MarginBank: "0xA7b6057372c7dc6cA705332bB95d696666E5578C",
    MarginMath: "0xf1C7183E242F0C8b2C7220f4C5E4A5bCa34A2bd8",
    FundingOracle: "0x7f97321D17da7B3BB45B4da1232a9a79369Af1f8",
    IsolatedTrader: "0x934Dd6503795ef6EE6a36e3b3f1d7Be6c7096955",
    PriceOracleProxy: "0x8a7f10de6d2cE66E242936465a485C504884Ab53",
    IsolatedLiquidation: "0x08a1959d27e49E09A2F87245e13eD64c1067Ffb1",
    PriceOracleAggregator: "0x8a7f10de6d2cE66E242936465a485C504884Ab53",
  },
  auxiliaryContractsAddresses: {
    USDC: "0xF926692B7241F48fbCB549B3a78E96082af97E55",
    MarginBank: "0xA7b6057372c7dc6cA705332bB95d696666E5578C",
  },
};
