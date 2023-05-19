/* eslint-disable prettier/prettier */

import { AwsKmsSigner } from "ethers-aws-kms-signer";

import {
  toBigNumberStr,
  toBigNumber,
  bigNumber,
  bnStrToBaseNumber,
} from "../submodules/library-sui/src/library";
import {
  AdjustLeverageResponse,
  AuthorizeHashResponse,
  ExchangeInfo,
  GetAccountDataResponse,
  GetCandleStickRequest,
  GetCountDownsResponse,
  GetFundingHistoryRequest,
  GetFundingRateResponse,
  GetMarketRecentTradesRequest,
  GetMarketRecentTradesResponse,
  GetOrderBookResponse,
  GetOrderRequest,
  GetOrderResponse,
  GetOrderbookRequest,
  GetPositionRequest,
  GetPositionResponse,
  GetTransactionHistoryRequest,
  GetTransferHistoryRequest,
  GetUserFundingHistoryResponse,
  GetUserTradesRequest,
  GetUserTradesResponse,
  GetUserTransactionHistoryResponse,
  GetUserTransferHistoryResponse,
  MarketData,
  MarketMeta,
  MasterInfo,
  OrderSignatureRequest,
  OrderSignatureResponse,
  PlaceOrderRequest,
  PlaceOrderResponse,
  PostOrderRequest,
  PostTimerAttributes,
  PostTimerResponse,
  StatusResponse,
  TickerData,
  adjustLeverageRequest,
  verifyDepositResponse,
} from "./interfaces/routes";
import { APIService } from "./exchange/apiService";
import { SERVICE_URLS } from "./exchange/apiUrls";
import { Sockets } from "./exchange/sockets";
import { ExtendedNetwork, Networks } from "./constants";
import { WebSockets } from "./exchange/WebSocket";
import {
  Connection,
  Ed25519Keypair,
  JsonRpcProvider,
  Keypair,
  RawSigner,
  Secp256k1Keypair,
  SignerWithProvider,
} from "@mysten/sui.js";
import {
  DAPIKlineResponse,
  MarketSymbol,
  Order,
  OrderSigner,
  Transaction,
} from "../submodules/library-sui/src";
import {
  ADJUST_MARGIN,
  MARGIN_TYPE,
  ORDER_SIDE,
  ORDER_TYPE,
  TIME_IN_FORCE,
} from "../submodules/library-sui/src/enums";
import { generateRandomNumber } from "../utils/utils";
import { ContractCalls } from "./exchange/contractService";
import { ResponseSchema } from "./exchange/contractErrorHandling.service";
import { OnboardingSigner } from "../submodules/library-sui/src/classes/onBoardSigner";
import { createOrder } from "../submodules/library-sui/src/utils";

// import { Contract } from "ethers";

export class BluefinClient {
  protected readonly network: ExtendedNetwork;

  private orderSigner: OrderSigner | undefined;

  private apiService: APIService;
  public sockets: Sockets;
  public webSockets: WebSockets | undefined;
  public kmsSigner: AwsKmsSigner | undefined;

  public marketSymbols: string[] = []; // to save array market symbols [DOT-PERP, SOL-PERP]

  private walletAddress = ""; // to save user's public address when connecting from UI

  private signer: RawSigner | undefined; // to save signer when connecting from UI
  private contractCalls: ContractCalls | undefined;
  private provider: any | undefined; // to save raw web3 provider when connecting from UI

  private isTermAccepted = false;

  private maxSaltLimit = 2 ** 60;

  // the number of decimals supported by USDC contract
  private MarginTokenPrecision = 6;
  contractAddresses: any;

  /**
   * initializes the class instance
   * @param _isTermAccepted boolean indicating if exchange terms and conditions are accepted
   * @param _network containing network rpc url and chain id
   * @param _account accepts either privateKey or AWS-KMS-SIGNER object if user intend to sign using kms
   */
  constructor(
    _isTermAccepted: boolean,
    _network: ExtendedNetwork,
    _account?: string | Keypair | AwsKmsSigner,
    _scheme?: any
  ) {
    this.network = _network;
    this.provider = new JsonRpcProvider(
      new Connection({ fullnode: _network.rpc })
    );

    this.apiService = new APIService(this.network.apiGateway);

    this.sockets = new Sockets(this.network.socketURL);
    if (this.network.webSocketURL) {
      this.webSockets = new WebSockets(this.network.webSocketURL);
    }

    this.isTermAccepted = _isTermAccepted;
    //if input is string then its seed phrase else it should be AwsKmsSigner object
    if (_account && _scheme && typeof _account == "string") {
      this.initializeWithSeed(_account, _scheme);
    } else if (
      _account &&
      (_account instanceof Secp256k1Keypair ||
        _account instanceof Ed25519Keypair)
    ) {
      this.initializeWithKeyPair(_account);
    } else if (_account instanceof AwsKmsSigner) {
      this.initializeWithKMS(_account);
    }
  }

  /**
   * onboards user
   */
  init = async (userOnboarding: boolean = true) => {};

  initializeWithKMS = async (awsKmsSigner: AwsKmsSigner): Promise<void> => {
    try {
      this.kmsSigner = awsKmsSigner;
      //fetching public address of the account
      this.walletAddress = await this.kmsSigner.getAddress();
    } catch (err) {
      console.log(err);
      throw Error("Failed to initialize KMS");
    }
  };

  /**
   * initializes web3 and wallet with the given account private key
   * @param keypair key pair for the account to be used for placing orders
   *
   */
  initializeWithKeyPair = async (keypair: Keypair): Promise<void> => {
    this.signer = new RawSigner(keypair, this.provider);
    this.walletAddress = await this.signer.getAddress();
    this.initOrderSigner(keypair);
  };

  /**
   * initializes web3 and wallet with the given account private key
   * @param seed seed for the account to be used for placing orders
   * @param scheme signature scheme to be used
   */
  initializeWithSeed = async (seed: string, scheme: any): Promise<void> => {
    switch (scheme) {
      case "ED25519":
        this.signer = new RawSigner(
          Ed25519Keypair.deriveKeypair(seed),
          this.provider
        );
        this.initOrderSigner(Ed25519Keypair.deriveKeypair(seed));
        break;
      case "Secp256k1":
        this.signer = new RawSigner(
          Secp256k1Keypair.deriveKeypair(seed),
          this.provider
        );
        this.initOrderSigner(Secp256k1Keypair.deriveKeypair(seed));
        break;
      default:
        throw new Error("Provided scheme is invalid");
    }
    this.walletAddress = await this.signer.getAddress();
  };

  initContractCalls = async (deployment?: any) => {
    if (!this.signer) {
      throw Error("Signer not Initialized");
    }
    const _deployment = deployment | this.getDeploymentJson();
    this.contractCalls = new ContractCalls(
      this.getSigner(),
      this.getProvider(),
      _deployment
    );
  };

  getSigner = (): RawSigner => {
    if (!this.signer) {
      throw Error("Signer not initialized");
    }
    return this.signer;
  };

  getProvider = (): JsonRpcProvider => {
    return this.provider;
  };

  getPublicAddress = (): string => {
    if (!this.signer) {
      Error("Signer not initialized");
    }
    return this.walletAddress;
  };

  getSignerWithProvider = (): SignerWithProvider => {
    if (!this.signer) {
      throw Error("Signer not initialized");
    }
    return this.signer.connect(this.provider);
  };

  createSignedOrder = async (
    order: OrderSignatureRequest
  ): Promise<OrderSignatureResponse> => {
    if (!this.orderSigner) {
      throw Error("Order Signer not initialized");
    }
    const orderToSign: Order = createOrder(order);
    const signature = this.orderSigner.signOrder(orderToSign);
    const signedOrder: OrderSignatureResponse = {
      symbol: order.symbol,
      price: order.price,
      quantity: order.quantity,
      side: order.side,
      orderType: order.orderType,
      triggerPrice: order.triggerPrice,
      postOnly: order.postOnly,
      leverage: order.leverage,
      reduceOnly: order.reduceOnly,
      salt: order.salt,
      expiration: order.expiration,
      maker: order.maker,
      orderSignature: signature,
    };
    return signedOrder;
  };

  /**
   * Places a signed order on firefly exchange
   * @param params PlaceOrderRequest containing the signed order created using createSignedOrder
   * @returns PlaceOrderResponse containing status and data. If status is not 201, order placement failed.
   */
  placeSignedOrder = async (params: PlaceOrderRequest) => {
    const response = await this.apiService.post<PlaceOrderResponse>(
      SERVICE_URLS.ORDERS.ORDERS,
      {
        symbol: params.symbol,
        userAddress: params.maker,
        orderType: params.orderType,
        price: toBigNumberStr(params.price),
        triggerPrice: toBigNumberStr(params.triggerPrice || "0"),
        quantity: toBigNumberStr(params.quantity),
        leverage: toBigNumberStr(params.leverage),
        side: params.side,
        reduceOnly: params.reduceOnly,
        salt: params.salt,
        expiration: params.expiration,
        orderSignature: params.orderSignature,
        timeInForce: params.timeInForce || TIME_IN_FORCE.GOOD_TILL_TIME,
        postOnly: params.postOnly || false,
        clientId: params.clientId
          ? `firefly-client: ${params.clientId}`
          : "firefly-client",
      },
      { isAuthenticationRequired: true }
    );

    return response;
  };

  /**
   * Given an order payload, signs it on chain and submits to exchange for placement
   * @param params PostOrderRequest
   * @returns PlaceOrderResponse
   */
  postOrder = async (params: PostOrderRequest) => {
    const signedOrder = await this.createSignedOrder(params);
    const response = await this.placeSignedOrder({
      ...signedOrder,
      timeInForce: params.timeInForce,
      postOnly: params.postOnly,
      clientId: params.clientId,
    });

    return response;
  };

  /**
   * Returns the USDC balance of user in USDC contract
   * @returns list of User's coins in USDC contract
   */
  getUSDCCoins = async (limit?: number, cursor?: string): Promise<any[]> => {
    return await this.contractCalls.onChainCalls.getUSDCCoins({
      address: await this.signer.getAddress(),
      currencyType: this.contractCalls.onChainCalls.getCurrencyID(),
      limit: limit,
      cursor: cursor,
    });
  };

  /**
   * Returns the usdc Balance(Free Collateral) of the account in Margin Bank contract
   * @param contract (optional) address of Margin Bank contract
   * @returns Number representing balance of user in Margin Bank contract
   */
  getMarginBankBalance = async (): Promise<number> => {
    return await this.contractCalls.onChainCalls.getUSDCBalance(
      {
        address: await this.signer.getAddress(),
        currencyID: this.contractCalls.onChainCalls.getCurrencyID(),
      },
      this.signer
    );
  };

  /**
   * Faucet function, mints 10K USDC to wallet - Only works on Testnet
   * Assumes that the user wallet has native gas Tokens on Testnet
   * @returns Boolean true if user is funded, false otherwise
   */
  mintTestUSDC = async (): Promise<boolean> => {
    if (this.network === Networks.PRODUCTION_SUI) {
      throw Error(`Function does not work on PRODUCTION`);
    }
    // mint 10000 USDC
    const txResponse = await this.contractCalls.onChainCalls.mintUSDC({
      amount: toBigNumberStr(10000, 6),
      to: await this.signer.getAddress(),
    });
    if (Transaction.getStatus(txResponse) == "success") {
      return true;
    } else {
      return false;
    }
  };

  /**
   * Updates user's leverage to given leverage
   * @param symbol market symbol get information about
   * @param leverage new leverage you want to change to
   * @returns ResponseSchema
   */
  adjustLeverage = async (
    params: adjustLeverageRequest
  ): Promise<ResponseSchema> => {
    const tx = await this.contractCalls.onChainCalls.adjustLeverage({
      leverage: params.leverage,
      account: await this.signer.getAddress(),
      perpID: this.contractCalls.onChainCalls.getPerpetualID(params.symbol),
    });
    if (Transaction.getStatus(tx) == "success") {
      return {
        ok: true,
        data: {},
        message: "leveraged adjusted successfully",
        code: 200,
        stack: "",
      };
    } else {
      return {
        ok: false,
        data: {},
        message: "leveraged adjustment failed",
        code: 500,
        stack: "",
      };
    }
  };

  /**
   * Gets Users default leverage.
   * @param symbol market symbol get information about
   * @returns user default leverage
   */
  getUserDefaultLeverage = async (
    symbol: MarketSymbol,
    parentAddress?: string
  ) => {
    const accData = await this.getUserAccountData(parentAddress);
    if (!accData.data) {
      throw Error(`Account data does not exist`);
    }

    const accDataByMarket = accData.data.accountDataByMarket.filter((data) => {
      return data.symbol === symbol;
    });
    /// found accountDataByMarket
    if (accDataByMarket && accDataByMarket.length > 0) {
      return bnStrToBaseNumber(accDataByMarket[0].selectedLeverage);
    }
    /// user is new and symbol data is not present in accountDataByMarket
    const exchangeInfo = await this.getExchangeInfo(symbol);
    if (!exchangeInfo.data) {
      throw Error(`Provided Market Symbol(${symbol}) does not exist`);
    }
    return bnStrToBaseNumber(exchangeInfo.data.defaultLeverage);
  };

  /**
   * Add or remove margin from the open position
   * @param symbol market symbol of the open position
   * @param operationType operation you want to perform `Add` | `Remove` margin
   * @param amount (number) amount user wants to add or remove from the position
   * @param perpetualAddress (address) address of Perpetual contract
   * @returns ResponseSchema
   */
  adjustMargin = async (
    symbol: MarketSymbol,
    operationType: ADJUST_MARGIN,
    amount: number,
    perpetualAddress?: string
  ): Promise<ResponseSchema> => {
    return;
  };

  /**
   * Gets Orders placed by the user. Returns the first 50 orders by default.
   * @param params of type OrderRequest,
   * @returns OrderResponse array
   */
  getUserOrders = async (params: GetOrderRequest) => {
    const response = await this.apiService.get<GetOrderResponse[]>(
      SERVICE_URLS.USER.ORDERS,
      {
        ...params,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets user open position. If the market is not specified then will return first 50 open positions for 50 markets.
   * @param params GetPositionRequest
   * @returns GetPositionResponse
   */
  getUserPosition = async (params: GetPositionRequest) => {
    const response = await this.apiService.get<GetPositionResponse[]>(
      SERVICE_URLS.USER.USER_POSITIONS,
      { ...params },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets state of orderbook for provided market. At max top 50 bids/asks are retrievable
   * @param params GetOrdebookRequest
   * @returns GetOrderbookResponse
   */
  getOrderbook = async (params: GetOrderbookRequest) => {
    const response = await this.apiService.get<GetOrderBookResponse>(
      SERVICE_URLS.MARKET.ORDER_BOOK,
      params
    );

    return response;
  };

  /**
   * Gets user trades
   * @param params PlaceOrderResponse
   * @returns GetUserTradesResponse
   */
  getUserTrades = async (params: GetUserTradesRequest) => {
    const response = await this.apiService.get<GetUserTradesResponse>(
      SERVICE_URLS.USER.USER_TRADES,
      { ...params },
      { isAuthenticationRequired: true }
    );

    return response;
  };

  /**
   * Gets user Account Data
   * @returns GetAccountDataResponse
   */
  getUserAccountData = async (parentAddress?: string) => {
    const response = await this.apiService.get<GetAccountDataResponse>(
      SERVICE_URLS.USER.ACCOUNT,
      { parentAddress },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets verification status of user account
   * @param amount deposit amount
   * @returns verification status of user
   */
  verifyDeposit = async (amount: number) => {
    const response = await this.apiService.get<verifyDepositResponse>(
      SERVICE_URLS.USER.VERIFY_DEPOSIT,
      { depositAmount: amount },
      { isAuthenticationRequired: true }
    );

    return response;
  };

  /**
   * Gets user transaction history
   * @param params GetTransactionHistoryRequest
   * @returns GetUserTransactionHistoryResponse
   */
  getUserTransactionHistory = async (params: GetTransactionHistoryRequest) => {
    const response = await this.apiService.get<
      GetUserTransactionHistoryResponse[]
    >(
      SERVICE_URLS.USER.USER_TRANSACTION_HISTORY,
      {
        ...params,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets user funding history
   * @param params GetFundingHistoryRequest
   * @returns GetUserTransactionHistoryResponse
   */
  getUserFundingHistory = async (params: GetFundingHistoryRequest) => {
    const response = await this.apiService.get<GetUserFundingHistoryResponse>(
      SERVICE_URLS.USER.FUNDING_HISTORY,
      {
        ...params,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets user transfer history
   * @param params GetTransferHistoryRequest
   * @returns GetUserTransferHistoryResponse
   */
  getUserTransferHistory = async (params: GetTransferHistoryRequest) => {
    const response = await this.apiService.get<GetUserTransferHistoryResponse>(
      SERVICE_URLS.USER.TRANSFER_HISTORY,
      {
        ...params,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets market funding rate
   * @param symbol market symbol to fetch funding rate of
   * @returns GetFundingRateResponse
   */
  getMarketFundingRate = async (symbol: MarketSymbol) => {
    const response = await this.apiService.get<GetFundingRateResponse>(
      SERVICE_URLS.MARKET.FUNDING_RATE,
      {
        symbol,
      }
    );
    return response;
  };

  /**
   * Gets market recent trades
   * @param params GetMarketRecentTradesRequest
   * @returns GetMarketRecentTradesResponse
   */
  getMarketRecentTrades = async (params: GetMarketRecentTradesRequest) => {
    const response = await this.apiService.get<GetMarketRecentTradesResponse>(
      SERVICE_URLS.MARKET.RECENT_TRADE,
      params
    );
    return response;
  };

  /**
   * Gets market candle stick data
   * @param params GetMarketRecentTradesRequest
   * @returns DAPIKlineResponse
   */
  getMarketCandleStickData = async (params: GetCandleStickRequest) => {
    const response = await this.apiService.get<DAPIKlineResponse>(
      SERVICE_URLS.MARKET.CANDLE_STICK_DATA,
      params
    );
    return response;
  };

  /**
   * Gets publically available market info about market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns ExchangeInfo or ExchangeInfo[] in case no market was provided as input
   */
  getExchangeInfo = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<ExchangeInfo>(
      SERVICE_URLS.MARKET.EXCHANGE_INFO,
      { symbol }
    );
    return response;
  };

  /**
   * Gets MarketData data for market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns MarketData or MarketData[] in case no market was provided as input
   */
  getMarketData = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<MarketData>(
      SERVICE_URLS.MARKET.MARKET_DATA,
      { symbol }
    );
    return response;
  };

  /**
   * Gets Meta data of the market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns MarketMeta or MarketMeta[] in case no market was provided as input
   */
  getMarketMetaInfo = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<MarketMeta>(
      SERVICE_URLS.MARKET.META,
      { symbol }
    );
    return response;
  };

  /**
   * Gets Master Info of the market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns MasterInfo
   */
  getMasterInfo = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<MasterInfo>(
      SERVICE_URLS.MARKET.MASTER_INFO,
      { symbol }
    );
    return response;
  };

  /**
   * Gets the list of market symbols available on exchange
   * @returns array of strings representing MARKET SYMBOLS
   */
  getMarketSymbols = async () => {
    const response = await this.apiService.get<string[]>(
      SERVICE_URLS.MARKET.SYMBOLS
    );
    return response;
  };

  /**
   * Gets contract addresses of market
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns deployed contract addresses
   */
  getContractAddresses = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<Record<string, object>>(
      SERVICE_URLS.MARKET.CONTRACT_ADDRESSES,
      { symbol }
    );
    return response;
  };

  /**
   * Gets status of the exchange
   * @returns StatusResponse
   */
  getExchangeStatus = async () => {
    const response = await this.apiService.get<StatusResponse>(
      SERVICE_URLS.MARKET.STATUS
    );
    return response;
  };

  /**
   * Gets ticker data of any market
   * @param symbol market symbol to get information about, if not provided fetches data of all markets
   * @returns TickerData
   */
  getTickerData = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<TickerData>(
      SERVICE_URLS.MARKET.TICKER,
      { symbol }
    );
    return response;
  };

  /**
   * Creates message to be signed, creates signature and authorize it from dapi
   * @returns auth token
   */
  userOnBoarding = async (token?: string) => {
    let userAuthToken = token;
    if (!userAuthToken) {
      let signature: string;

      if (this.kmsSigner !== undefined) {
        // const hashedMessageSHA = this.web3.utils.sha3(
        //   this.network.onboardingUrl
        // );
        // /*
        //   For every orderHash sent to etherium etherium will hash it and wrap
        //   it with "\\x19Ethereum Signed Message:\\n" + message.length + message
        //   Hence for that we have to hash it again.
        // */
        // //@ts-ignore
        // const hashedMessageETH =
        //   this.web3.eth.accounts.hashMessage(hashedMessageSHA);
        // signature = await this.kmsSigner._signDigest(hashedMessageETH);
      } else {
        // sign onboarding message
        signature = await OnboardingSigner.createOnboardSignature(
          this.network.onboardingUrl,
          this.signer
        );
      }
      // authorize signature created by dAPI
      const authTokenResponse = await this.authorizeSignedHash(signature);

      if (!authTokenResponse.ok || !authTokenResponse.data) {
        throw Error(
          `Authorization error: ${authTokenResponse.response.message}`
        );
      }
      userAuthToken = authTokenResponse.data.token;
    }
    // for api
    this.apiService.setAuthToken(userAuthToken);
    // this.apiService.setWalletAddress(this.getPublicAddress());
    // for socket
    this.sockets.setAuthToken(userAuthToken);
    this.webSockets?.setAuthToken(userAuthToken);
    // TODO: remove this when all endpoints on frontend are integrated from client library
    return userAuthToken;
  };

  //= ==============================================================//
  //                    PRIVATE HELPER FUNCTIONS
  //= ==============================================================//

  private initOrderSigner = (keypair: Keypair) => {
    this.orderSigner = new OrderSigner(keypair);
  };

  private getDeploymentJson = (): any => {
    return {}; // will be fteched from DAPI, may be stored in configs table
  };

  /**
   * Private function to get the contract address of given contract name mapped with respective factory
   * @param contractName name of the contract eg: `Perpetual`, `USDC` etc
   * @param contract address of contract
   * @param market name of the specific market to get address for
   * @returns Contract | MarginBank | IsolatedTrader or throws error
   */
  private getContract = (
    contractName: string,
    contractAddress?: string,
    market?: MarketSymbol
  ): any => {};

  /**
   * Gets the contract address of provided name
   * @param contractName name of the contract eg: `Perpetual`, `USDC` etc
   * @param contract address of contract
   * @param market name of the specific market to get address for
   * @returns contract address of given name
   */
  private getContractAddressByName = (
    contractName: string,
    contract?: string,
    market?: MarketSymbol
  ): string => {
    // if a market name is provided and contract address is not provided
    if (market && !contract) {
      try {
        contract = this.contractAddresses[market][contractName];
      } catch (e) {
        contract = "";
      }
    }

    // if contract address is not provided and also market name is not provided
    if (!market && !contract) {
      try {
        contract =
          this.contractAddresses.auxiliaryContractsAddresses[contractName];
      } catch (e) {
        contract = "";
      }
    }

    if (contract === "" || contract === undefined) {
      throw Error(`Contract "${contractName}" not found in contract addresses`);
    }

    return contract;
  };

  /**
   * Private function to create order payload that is to be signed on-chain
   * @param params OrderSignatureRequest
   * @returns Order
   */
  private createOrderToSign = (
    params: OrderSignatureRequest,
    parentAddress?: string
  ): Order => {
    const expiration = new Date();
    // MARKET ORDER - set expiration of 1 minute
    if (params.orderType === ORDER_TYPE.MARKET) {
      expiration.setMinutes(expiration.getMinutes() + 1);
    }
    // LIMIT ORDER - set expiration of 1 month
    else {
      expiration.setMonth(expiration.getMonth() + 1);
    }

    const salt =
      params.salt && params.salt < this.maxSaltLimit
        ? toBigNumber(params.salt)
        : toBigNumber(generateRandomNumber(1_000));

    return {
      market: this.contractCalls.onChainCalls.getPerpetualID(),
      price: toBigNumber(params.price),
      isBuy: params.side === ORDER_SIDE.BUY,
      quantity: toBigNumber(params.quantity),
      leverage: toBigNumber(params.leverage || 1),
      maker: parentAddress
        ? parentAddress
        : this.getPublicAddress().toLocaleLowerCase(),
      reduceOnly: params.reduceOnly || false,
      expiration:
        toBigNumber(params.expiration) ||
        toBigNumber(Math.floor(expiration.getTime() / 1000)), // /1000 to convert time in seconds
      postOnly: params.postOnly || false,
      salt,
    };
  };

  /**
   * Posts signed Auth Hash to dAPI and gets token in return if signature is valid
   * @returns GetAuthHashResponse which contains auth hash to be signed
   */
  private authorizeSignedHash = async (signedHash: string) => {
    const response = await this.apiService.post<AuthorizeHashResponse>(
      SERVICE_URLS.USER.AUTHORIZE,
      {
        signature: signedHash,
        userAddress: this.getPublicAddress(),
        isTermAccepted: this.isTermAccepted,
      }
    );
    return response;
  };

  /**
   * Posts signed Auth Hash to dAPI and gets token in return if signature is valid
   * @returns GetAuthHashResponse which contains auth hash to be signed
   */
  private updateLeverage = async (params: adjustLeverageRequest) => {
    const response = await this.apiService.post<AdjustLeverageResponse>(
      SERVICE_URLS.USER.ADJUST_LEVERGAE,
      {
        symbol: params.symbol,
        address: params.parentAddress
          ? params.parentAddress
          : this.getPublicAddress(),
        leverage: toBigNumberStr(params.leverage),
        marginType: MARGIN_TYPE.ISOLATED,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Reset timer for cancel on disconnect for open orders
   * @param params PostTimerAttributes containing the countdowns of all markets
   * @returns PostTimerResponse containing accepted and failed countdowns. If status is not 201, request wasn't successful.
   */
  resetCancelOnDisconnectTimer = async (params: PostTimerAttributes) => {
    const response = await this.apiService.post<PostTimerResponse>(
      SERVICE_URLS.USER.CANCEL_ON_DISCONNECT,
      params,
      { isAuthenticationRequired: true },
      this.network.dmsURL
    );
    if (response.status == 503) {
      throw Error(
        `Cancel on Disconnect (dead-mans-switch) feature is currently unavailable`
      );
    }
    return response;
  };

  /**
   * Gets user Cancel on Disconnect timer
   * @returns GetCountDownsResponse
   */
  getCancelOnDisconnectTimer = async (
    symbol?: string,
    parentAddress?: string
  ) => {
    const response = await this.apiService.get<GetCountDownsResponse>(
      SERVICE_URLS.USER.CANCEL_ON_DISCONNECT,
      {
        parentAddress,
        symbol,
      },
      { isAuthenticationRequired: true },
      this.network.dmsURL
    );
    if (response.status == 503) {
      throw Error(
        `Cancel on Disconnect (dead-mans-switch) feature is currently unavailable`
      );
    }
    return response;
  };
}
