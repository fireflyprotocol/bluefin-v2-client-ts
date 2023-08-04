import { AwsKmsSigner } from "ethers-aws-kms-signer";

import {
  toBigNumberStr,
  toBigNumber,
  toBaseNumber,
  usdcToBaseNumber,
  DAPIKlineResponse,
  MarketSymbol,
  Order,
  OrderSigner,
  Transaction,
  bigNumber,
  ADJUST_MARGIN,
  MARGIN_TYPE,
  ORDER_SIDE,
  ORDER_STATUS,
  ORDER_TYPE,
  TIME_IN_FORCE,
  OnboardingSigner,
  hexToBuffer,
  bnToHex,
  encodeOrderFlags,
} from "@firefly-exchange/library-sui";
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
  AdjustLeverageResponse,
  AuthorizeHashResponse,
  CancelOrderResponse,
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
  OrderCancelSignatureRequest,
  OrderCancellationRequest,
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
import { generateRandomNumber, readFile } from "../utils/utils";
import { ContractCalls } from "./exchange/contractService";
import { ResponseSchema } from "./exchange/contractErrorHandling.service";

// import { Contract } from "ethers";

export class BluefinClient {
  protected readonly network: ExtendedNetwork;

  private orderSigner: OrderSigner | any;

  private apiService: APIService;

  public sockets: Sockets;

  public webSockets: WebSockets | undefined;

  public kmsSigner: AwsKmsSigner | undefined;

  public marketSymbols: string[] = []; // to save array market symbols [DOT-PERP, SOL-PERP]

  private walletAddress = ""; // to save user's public address when connecting from UI

  private signer: RawSigner | any; // to save signer when connecting from UI

  private contractCalls: ContractCalls | undefined;

  private provider: any | undefined; // to save raw web3 provider when connecting from UI

  private isTermAccepted = false;

  private maxSaltLimit = 2 ** 60;

  // the number of decimals supported by USDC contract
  private MarginTokenPrecision = 6;

  /**
   * initializes the class instance
   * @param _isTermAccepted boolean indicating if exchange terms and conditions are accepted
   * @param _network containing network rpc url and chain id
   * @param _account accepts either privateKey or AWS-KMS-SIGNER object if user intend to sign using kms
   * @param _scheme signature scheme to be used
   */
  constructor(
    _isTermAccepted: boolean,
    _network: ExtendedNetwork,
    _account?: string | Keypair | AwsKmsSigner,
    _scheme?: any,
    _isUI?: boolean,
    _uiSignerObject?: any
  ) {
    this.network = _network;

    this.provider = new JsonRpcProvider(
      new Connection({ fullnode: _network.url })
    );

    this.apiService = new APIService(this.network.apiGateway);

    this.sockets = new Sockets(this.network.socketURL);
    if (this.network.webSocketURL) {
      this.webSockets = new WebSockets(this.network.webSocketURL);
    }

    this.isTermAccepted = _isTermAccepted;

    if (_isUI) {
      this.initializeWithHook(_uiSignerObject);
    }
    // if input is string then its seed phrase else it should be AwsKmsSigner object
    else if (_account && _scheme && typeof _account === "string") {
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
   * @description
   * initializes the required objects
   * @param userOnboarding boolean indicating if user onboarding is required
   * @param deployment
   */
  init = async (userOnboarding: boolean = true, deployment: any = null) => {
    if (!this.signer) {
      throw Error("Signer not initialized");
    }
    await this.initContractCalls(deployment);
    this.walletAddress = await this.signer.getAddress();
    if (userOnboarding) {
      // await this.userOnBoarding(); // uncomment once DAPI-SUI is up
    }
  };

  initializeWithHook = async (uiSignerObject: any): Promise<void> => {
    try {
      this.signer = uiSignerObject;
      this.orderSigner = uiSignerObject;
      this.walletAddress = this.signer.getAddress();
    } catch (err) {
      console.log(err);
      throw Error("Failed to initialize through UI");
    }
  };

  /**
   * @description
   * initializes client with AwsKmsSigner object
   * @param awsKmsSigner AwsKmsSigner object
   * @returns void
   * */
  initializeWithKMS = async (awsKmsSigner: AwsKmsSigner): Promise<void> => {
    try {
      this.kmsSigner = awsKmsSigner;
      // fetching public address of the account
      this.walletAddress = await this.kmsSigner.getAddress();
    } catch (err) {
      console.log(err);
      throw Error("Failed to initialize KMS");
    }
  };

  /**
   * @description
   * initializes web3 and wallet with the given account private key
   * @param keypair key pair for the account to be used for placing orders
   */
  initializeWithKeyPair = async (keypair: Keypair): Promise<void> => {
    this.signer = new RawSigner(keypair, this.provider);
    this.walletAddress = await this.signer.getAddress();
    this.initOrderSigner(keypair);
  };

  /**
   * @description
   * initializes web3 and wallet with the given account private key
   * @param seed seed for the account to be used for placing orders
   * @param scheme signature scheme to be used
   * @returns void
   */
  initializeWithSeed = (seed: string, scheme: any): void => {
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
  };

  /**
   * @description
   * initializes contract calls
   * @param deployment (optional) The deployment json provided by deployer
   */
  initContractCalls = async (deployment?: any) => {
    if (!this.signer) {
      throw Error("Signer not Initialized");
    }
    const _deployment = deployment || this.getDeploymentJson();

    this.contractCalls = new ContractCalls(
      this.getSigner(),
      this.getProvider(),
      _deployment
    );
  };

  /**
   * @description
   * Gets the RawSigner of the client
   * @returns RawSigner
   * */
  getSigner = (): RawSigner => {
    if (!this.signer) {
      throw Error("Signer not initialized");
    }
    return this.signer;
  };

  /**
   * @description
   * Gets the RPC Provider of the client
   * @returns JsonRPCProvider
   * */
  getProvider = (): JsonRpcProvider => {
    return this.provider;
  };

  /**
   * @description
   * Creates message to be signed, creates signature and authorize it from dapi
   * @returns auth token
   */
  userOnBoarding = async (token?: string) => {
    let userAuthToken = token;
    if (!userAuthToken) {
      let signature: string;

      if (this.kmsSigner !== undefined) {
        // const hashedMessageSHA = sha256(
        //   hexToBuffer(this.network.onboardingUrl)
        // );
        // /*
        //   For every orderHash sent to etherium etherium will hash it and wrap
        //   it with "\\x19Ethereum Signed Message:\\n" + message.length + message
        //   Hence for that we have to hash it again.
        // */
        // //@ts-ignore
        // const hashedMessageETH =
        // this.signer.signData(hashedMessageSHA);
        // (signature = await this.kmsSigner._signDigest(hashedMessageETH));
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

  /**
   * @description
   * Gets the wallets Public address
   * @returns string
   * */
  getPublicAddress = (): string => {
    if (!this.signer) {
      Error("Signer not initialized");
    }
    return this.walletAddress;
  };

  /**
   * @description
   * Gets the SignerWithProvider of the client
   * @returns SignerWithProvider
   * */
  getSignerWithProvider = (): SignerWithProvider => {
    if (!this.signer) {
      throw Error("Signer not initialized");
    }
    return this.signer.connect(this.provider);
  };

  /**
   * @description
   * Gets a signed order from the client
   * @returns OrderSignatureResponse
   * @param order OrderSignatureRequest
   * */

  getSerializedOrder(order: Order): string {
    // encode order flags
    const orderFlags = encodeOrderFlags(order);

    const buffer = Buffer.alloc(144);
    buffer.set(hexToBuffer(bnToHex(order.price)), 0);
    buffer.set(hexToBuffer(bnToHex(order.quantity)), 16);
    buffer.set(hexToBuffer(bnToHex(order.leverage)), 32);
    buffer.set(hexToBuffer(bnToHex(order.salt)), 48);
    buffer.set(hexToBuffer(bnToHex(order.expiration, 16)), 64);
    buffer.set(hexToBuffer(order.maker), 72);
    buffer.set(hexToBuffer(order.market), 104);
    buffer.set(hexToBuffer(bnToHex(orderFlags, 2)), 136);
    buffer.set(Buffer.from("Bluefin", "utf8"), 137);

    return buffer.toString("hex");
  }

  signOrder = async (orderToSign: Order) => {
    const serializedOrder = new TextEncoder().encode(
      this.getSerializedOrder(orderToSign)
    );
    return this.signer.signData(serializedOrder);
  };

  createSignedOrder = async (
    order: OrderSignatureRequest
  ): Promise<OrderSignatureResponse> => {
    if (!this.orderSigner) {
      throw Error("Order Signer not initialized");
    }
    const orderToSign: Order = this.createOrderToSign(order);
    const signature = await this.signOrder(orderToSign);
    const signedOrder: OrderSignatureResponse = {
      symbol: order.symbol,
      price: order.price,
      quantity: order.quantity,
      side: order.side,
      orderType: order.orderType,
      triggerPrice:
        order.orderType === ORDER_TYPE.STOP_MARKET ||
        order.orderType === ORDER_TYPE.LIMIT
          ? order.triggerPrice || 0
          : 0,
      postOnly: orderToSign.postOnly,
      leverage: toBaseNumber(orderToSign.leverage),
      reduceOnly: orderToSign.reduceOnly,
      salt: Number(orderToSign.salt),
      expiration: Number(orderToSign.expiration),
      maker: orderToSign.maker,
      orderSignature: signature,
      orderbookOnly: orderToSign.orderbookOnly,
      timeInForce: order.timeInForce || TIME_IN_FORCE.GOOD_TILL_TIME,
    };
    return signedOrder;
  };

  /**
   * @description
   * Places a signed order on bluefin exchange
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
        orderbookOnly: true,
        postOnly: params.postOnly || false,
        clientId: params.clientId
          ? `bluefin-client: ${params.clientId}`
          : "bluefin-client",
      },
      { isAuthenticationRequired: true }
    );

    return response;
  };

  /**
   * @description
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
      orderbookOnly: true,
    });

    return response;
  };

  /**
   * @description
   * Creates signature for cancelling orders
   * @param params OrderCancelSignatureRequest containing market symbol and order hashes to be cancelled
   * @returns generated signature string
   */
  createOrderCancellationSignature = async (
    params: OrderCancelSignatureRequest
  ): Promise<string> => {
    // TODO: serialize correctly, this is the default method from suiet wallet docs
    const serialized = new TextEncoder().encode(JSON.stringify(params));
    return this.signer.signData(serialized);
  };

  /**
   * @description
   * Posts to exchange for cancellation of provided orders with signature
   * @param params OrderCancellationRequest containing order hashes to be cancelled and cancellation signature
   * @returns response from exchange server
   */
  placeCancelOrder = async (params: OrderCancellationRequest) => {
    const response = await this.apiService.delete<CancelOrderResponse>(
      SERVICE_URLS.ORDERS.ORDERS_HASH,
      {
        symbol: params.symbol,
        orderHashes: params.hashes,
        cancelSignature: params.signature,
        parentAddress: params.parentAddress,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * @description
   * Creates signature and posts order for cancellation on exchange of provided orders
   * @param params OrderCancelSignatureRequest containing order hashes to be cancelled
   * @returns response from exchange server
   */
  postCancelOrder = async (params: OrderCancelSignatureRequest) => {
    if (params.hashes.length <= 0) {
      throw Error(`No orders to cancel`);
    }
    const signature = await this.createOrderCancellationSignature(params);
    const response = await this.placeCancelOrder({
      ...params,
      signature,
    });
    return response;
  };

  /**
   * @description
   * Cancels all open orders for a given market
   * @param symbol DOT-PERP, market symbol
   * @returns cancellation response
   */
  cancelAllOpenOrders = async (
    symbol: MarketSymbol,
    parentAddress?: string
  ) => {
    const openOrders = await this.getUserOrders({
      symbol,
      statuses: [
        ORDER_STATUS.OPEN,
        ORDER_STATUS.PARTIAL_FILLED,
        ORDER_STATUS.PENDING,
      ],
      parentAddress,
    });

    const hashes = openOrders.data?.map((order) => order.hash) as string[];

    const response = await this.postCancelOrder({
      hashes,
      symbol,
      parentAddress,
    });

    return response;
  };

  /**
   * @description
   * Returns the USDC balance of user in USDC contract
   * @returns list of User's coins in USDC contract
   */
  getUSDCCoins = async (
    amount?: number,
    limit?: number,
    cursor?: string
  ): Promise<any[]> => {
    if (amount) {
      const coin =
        await this.contractCalls.onChainCalls.getUSDCoinHavingBalance({
          amount,
          address: await this.signer.getAddress(),
          currencyID: this.contractCalls.onChainCalls.getCurrencyID(),
          limit,
          cursor,
        });
      if (coin) {
        coin.balance = usdcToBaseNumber(coin.balance);
      }
      return coin;
    }
    const coins = await this.contractCalls.onChainCalls.getUSDCCoins({
      address: await this.signer.getAddress(),
    });
    coins.data.forEach((coin) => {
      coin.balance = usdcToBaseNumber(coin.balance);
    });

    return coins;
  };

  /**
   * @description
   * Returns the usdc Balance(Free Collateral) of the account in Margin Bank contract
   * @param contract (optional) address of Margin Bank contract
   * @returns Number representing balance of user in Margin Bank contract
   */
  getMarginBankBalance = async (): Promise<number> => {
    return this.contractCalls.getMarginBankBalance();
  };

  /**
   * @description
   * Returns the usdc Balance(Free Collateral) of the account in USDC contract
   * @returns Number representing balance of user in USDC contract
   */
  getUSDCBalance = async (): Promise<number> => {
    return this.contractCalls.onChainCalls.getUSDCBalance(
      {
        address: await this.signer.getAddress(),
        currencyID: this.contractCalls.onChainCalls.getCurrencyID(),
      },
      this.signer
    );
  };

  /**
   * @description
   * Faucet function, mints 10K USDC to wallet - Only works on Testnet
   * Assumes that the user wallet has native gas Tokens on Testnet
   * @returns Boolean true if user is funded, false otherwise
   */
  mintTestUSDC = async (amount?: number): Promise<boolean> => {
    if (this.network === Networks.PRODUCTION_SUI) {
      throw Error(`Function does not work on PRODUCTION`);
    }
    // mint 10000 USDC
    const mintAmount = amount || 10000;
    const txResponse = await this.contractCalls.onChainCalls.mintUSDC({
      amount: toBigNumberStr(mintAmount, this.MarginTokenPrecision),
      to: await this.signer.getAddress(),
      gasBudget: 1000000000,
    });
    if (Transaction.getStatus(txResponse) === "success") {
      return true;
    }
    return false;
  };

  /**
   * @description
   * Updates user's leverage to given leverage
   * @param symbol market symbol get information about
   * @param leverage new leverage you want to change to
   * @returns ResponseSchema
   */
  adjustLeverage = async (
    params: adjustLeverageRequest
  ): Promise<ResponseSchema> => {
    const userPosition = await this.getUserPosition({
      symbol: params.symbol,
      parentAddress: params.parentAddress,
    });
    if (!userPosition.data) {
      throw Error(`User positions data doesn't exist`);
    }

    const position = userPosition.data as any as GetPositionResponse;

    if (Object.keys(position).length > 0) {
      return this.contractCalls.adjustLeverageContractCall(
        params.leverage,
        params.symbol,
        params.parentAddress
      );
    }
    const {
      ok,
      data,
      response: { errorCode, message },
    } = await this.updateLeverage({
      symbol: params.symbol,
      leverage: params.leverage,
      parentAddress: params.parentAddress,
    });
    const response: ResponseSchema = { ok, data, code: errorCode, message };
    return response;
  };

  /**
   * @description
   * Add or remove margin from the open position
   * @param symbol market symbol of the open position
   * @param operationType operation you want to perform `Add` | `Remove` margin
   * @param amount (number) amount user wants to add or remove from the position
   * @returns ResponseSchema
   */

  adjustMargin = async (
    symbol: MarketSymbol,
    operationType: ADJUST_MARGIN,
    amount: number
  ): Promise<ResponseSchema> => {
    return this.contractCalls.adjustMarginContractCall(
      symbol,
      operationType,
      amount
    );
  };

  /**
   * @description
   * Deposits USDC to Margin Bank contract
   * @param amount amount of USDC to deposit
   * @param coinID coinID of USDC coint to use
   * @returns ResponseSchema
   */
  depositToMarginBank = async (
    amount: number,
    coinID?: string
  ): Promise<ResponseSchema> => {
    let coin = coinID;
    if (amount && !coinID) {
      coin = (
        await this.contractCalls.onChainCalls.getUSDCoinHavingBalance(
          {
            amount,
          },
          this.signer
        )
      )?.coinObjectId;
    }
    if (coin) {
      return this.contractCalls.depositToMarginBankContractCall(amount, coin);
    }
    throw Error(`User has no coin with amount ${amount} to deposit`);
  };

  /**
   * @description
   * withdraws USDC from Margin Bank contract
   * @param amount amount of USDC to withdraw
   * @returns ResponseSchema
   */
  withdrawFromMarginBank = async (amount?: number): Promise<ResponseSchema> => {
    if (amount) {
      return this.contractCalls.withdrawFromMarginBankContractCall(amount);
    }
    return this.contractCalls.withdrawAllFromMarginBankContractCall();
  };

  /**
   * @description
   * Sets subaccount to wallet.
   * @param publicAddress the address to add as sub account
   * @param status true to add, false to remove
   * @returns ResponseSchema
   */
  setSubAccount = async (
    publicAddress: string,
    status: boolean
  ): Promise<ResponseSchema> => {
    return this.contractCalls.setSubAccount(publicAddress, status);
  };

  /**
   * @description
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
      return toBaseNumber(accDataByMarket[0].selectedLeverage);
    }
    /// user is new and symbol data is not present in accountDataByMarket
    const exchangeInfo = await this.getExchangeInfo(symbol);
    if (!exchangeInfo.data) {
      throw Error(`Provided Market Symbol(${symbol}) does not exist`);
    }
    return toBaseNumber(exchangeInfo.data.defaultLeverage);
  };

  /**
   * @description
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
   * @description
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
   * @description
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
   * @description
   * Gets user trades
   * @param params GetUserTradesRequest
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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
   * @description
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

  //= ==============================================================//
  //                    PRIVATE HELPER FUNCTIONS
  //= ==============================================================//

  /**
   * @description
   * Initializes order signer
   * @param keypair keypair of the account to be used for placing orders
   * @returns void
   */
  private initOrderSigner = (keypair: Keypair) => {
    this.orderSigner = new OrderSigner(keypair);
  };

  /**
   * @description
   * Gets deployment json from local file (will get from DAPI in future)
   * @returns deployment json
   * */
  private getDeploymentJson = (): any => {
    // will be fetched from DAPI, may be stored in configs table
    return readFile("./deployment.json");
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
        ? bigNumber(params.salt)
        : bigNumber(generateRandomNumber(1_000));
    return {
      market: this.contractCalls.onChainCalls.getPerpetualID(params.symbol),
      price: toBigNumber(params.price),
      isBuy: params.side === ORDER_SIDE.BUY,
      quantity: toBigNumber(params.quantity),
      leverage: toBigNumber(params.leverage || 1),
      maker: parentAddress || this.getPublicAddress().toLocaleLowerCase(),
      reduceOnly: params.reduceOnly || false,
      expiration: bigNumber(
        params.expiration || Math.floor(expiration.getTime())
      ), // /1000 to convert time in seconds
      postOnly: params.postOnly || false,
      salt,
      orderbookOnly: params.orderbookOnly || true,
      ioc: params.timeInForce === TIME_IN_FORCE.IMMEDIATE_OR_CANCEL || false,
    };
  };

  /**
   * @description
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
   * @description
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
   * @description
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
    if (response.status === 503) {
      throw Error(
        `Cancel on Disconnect (dead-mans-switch) feature is currently unavailable`
      );
    }
    return response;
  };

  /**
   * @description
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
    if (response.status === 503) {
      throw Error(
        `Cancel on Disconnect (dead-mans-switch) feature is currently unavailable`
      );
    }
    return response;
  };
}
