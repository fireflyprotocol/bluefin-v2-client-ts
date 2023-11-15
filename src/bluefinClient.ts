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
  SigPK,
  getKeyPairFromPvtKey,
  parseSigPK,
  Secp256k1Keypair,
  Ed25519Keypair,
  WalletContextState,
  SuiClient,
  Keypair,
  SIGNER_TYPES,
  PartialZkLoginSignature,
  DecodeJWT,
  ZkPayload,
} from "@firefly-exchange/library-sui";

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
  ExtendedNetwork,
  ExtendedWalletContextState,
  ConfigResponse,
  GetTotalHistoricalTradingRewardsResponse,
  GetTradeAndEarnRewardsDetailRequest,
  GetTradeAndEarnRewardsDetailResponse,
  GetUserRewardsSummaryResponse,
  GetUserRewardsHistoryResponse,
  GetUserRewardsHistoryRequest,
  GetAffiliateRefereeDetailsRequest,
  GetAffiliateRefereeDetailsResponse,
  GetAffiliateRefereeCountResponse,
  GetTradeAndEarnRewardsOverviewResponse,
  GetMakerRewardsSummaryResponse,
  GetMakerRewardDetailsRequest,
  GetMakerRewardDetailsResponse,
  GetUserWhiteListStatusForMarkeMakerResponse,
  GetAffiliatePayoutsResponse,
  GetCampaignRewardsResponse,
  GetCampaignDetailsResponse,
  GetReferrerInfoResponse,
  LinkReferredUserRequest,
  LinkReferredUserResponse,
  GenerateReferralCodeResponse,
  GenerateReferralCodeRequest,
  GetUserTradesHistoryResponse,
  GetUserTradesHistoryRequest,
  OpenReferralDetails,
  OpenReferralOverview,
  OpenReferralPayoutList,
  OpenReferralRefereeDetails,
} from "./interfaces/routes";
import { APIService } from "./exchange/apiService";
import { SERVICE_URLS } from "./exchange/apiUrls";
import { Sockets } from "./exchange/sockets";
import { WebSockets } from "./exchange/WebSocket";
import { generateRandomNumber, readFile } from "../utils/utils";
import { ContractCalls } from "./exchange/contractService";
import { ResponseSchema } from "./exchange/contractErrorHandling.service";
import { Networks, POST_ORDER_BASE } from "./constants";
import { sha256 } from "@noble/hashes/sha256";
import { SignatureScheme } from "@mysten/sui.js/src/cryptography/signature-scheme";
import { parseSerializedSignature } from "@mysten/sui.js/cryptography";
import { toB64 } from "@mysten/bcs";
import { publicKeyFromRawBytes } from "@mysten/sui.js/verify";
import { getZkLoginSignature, genAddressSeed } from "@mysten/zklogin";
import { SerializedSignature } from "@mysten/sui.js/dist/cjs/cryptography";

export class BluefinClient {
  protected readonly network: ExtendedNetwork;

  private orderSigner: OrderSigner;

  private apiService: APIService;

  public sockets: Sockets;

  public webSockets: WebSockets | undefined;

  public marketSymbols: string[] = []; // to save array market symbols [DOT-PERP, SOL-PERP]

  private walletAddress = ""; // to save user's public address when connecting from UI

  private signer: Keypair; // to save signer when connecting from UI

  private uiWallet: WalletContextState | any; // to save signer when connecting from UI

  private isZkLogin: boolean = false;

  private contractCalls: ContractCalls | undefined;

  private provider: SuiClient | undefined; // to save raw web3 provider when connecting from UI

  private isTermAccepted = false;

  private maxSaltLimit = 2 ** 60;

  // the number of decimals supported by USDC contract
  private MarginTokenPrecision = 6;

  private maxEpoch: number;

  private proof: PartialZkLoginSignature;

  private decodedJWT: DecodeJWT;

  private salt: string;

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
    _account?: string | Keypair,
    _scheme?: SignatureScheme,
    _isUI?: boolean,
    _uiSignerObject?: any
  ) {
    this.network = _network;

    this.provider = new SuiClient({ url: _network.url });

    this.apiService = new APIService(this.network.apiGateway);

    this.sockets = new Sockets(this.network.socketURL);
    if (this.network.webSocketURL) {
      this.webSockets = new WebSockets(this.network.webSocketURL);
    }

    this.isTermAccepted = _isTermAccepted;

    if (_account && _scheme && typeof _account === "string") {
      if (_account.split(" ")[1]) {
        // can split with a space then its seed phrase
        this.initializeWithSeed(_account, _scheme);
      } else if (!_account.split(" ")[1]) {
        // splitting with a space gives undefined then its a private key
        const keyPair = getKeyPairFromPvtKey(_account, _scheme);
        this.initializeWithKeyPair(keyPair);
      }
    } else if (
      _account &&
      (_account instanceof Secp256k1Keypair ||
        _account instanceof Ed25519Keypair)
    ) {
      this.initializeWithKeyPair(_account);
    }
  }

  /**
   * @description
   * initializes the required objects
   * @param userOnboarding boolean indicating if user onboarding is required
   * @param deployment
   */
  init = async (
    userOnboarding: boolean = true,
    deployment: any = null,
    apiToken = ""
  ) => {
    console.log("init");
    if (apiToken) {
      this.apiService.setApiToken(apiToken);
      // for socket
      this.sockets.setApiToken(apiToken);
      this.webSockets?.setApiToken(apiToken);
    } else {
      if (!this.signer) {
        throw Error("Signer not initialized");
      }
      await this.initContractCalls(deployment);
      this.walletAddress = this.isZkLogin
        ? this.walletAddress
        : this.signer.toSuiAddress();
      // onboard user if not onboarded
      if (userOnboarding) {
        await this.userOnBoarding();
      }
    }

    if (this.network.UUID) {
      this.setUUID(this.network.UUID);
    }
  };

  initializeWithHook = async (
    uiSignerObject: ExtendedWalletContextState
  ): Promise<void> => {
    try {
      console.log("initializeWithHook");
      console.log(uiSignerObject, "uiSignerObject");
      this.uiWallet = uiSignerObject.wallet;
      this.signer = uiSignerObject as any;
      this.walletAddress = await (
        this.signer as any as ExtendedWalletContextState
      ).getAddress();
      this.isZkLogin = false;

      console.log(this.walletAddress, "walltttt address");
    } catch (err) {
      console.log(err);
      throw Error("Failed to initialize through UI");
    }
  };

  initializeForZkLogin = ({
    _account,
    walletAddress,
    maxEpoch,
    proof,
    decodedJWT,
    salt,
  }: {
    _account: string;
    walletAddress: string;
    maxEpoch: number;
    salt: string;
    proof: PartialZkLoginSignature;
    decodedJWT: DecodeJWT;
  }) => {
    console.log("initializeForZkLogin");
    const keyPair = getKeyPairFromPvtKey(_account, "ZkLogin");
    this.signer = keyPair;
    this.walletAddress = walletAddress;
    this.isZkLogin = true;
    this.maxEpoch = maxEpoch;
    this.decodedJWT = decodedJWT;
    this.proof = proof;
    this.salt = salt;

    console.log(
      {
        signer: this.signer,
        walletAddress: this.walletAddress,
        maxEpoch: this.maxEpoch,
        decodedJWT: this.decodedJWT,
        proof: this.proof,
        salt: this.salt,
      },
      "valueesss"
    );
  };

  /***
   * Set UUID to api headers for colocation partners
   */
  setUUID = (uuid: string) => {
    this.apiService.setUUID(uuid);
  };
  /**
   * @description
   * initializes web3 and wallet with the given account private key
   * @param keypair key pair for the account to be used for placing orders
   */
  initializeWithKeyPair = async (keypair: Keypair): Promise<void> => {
    this.signer = keypair;
    this.walletAddress = await this.signer.toSuiAddress();
    this.initOrderSigner(keypair as Keypair);
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
        Ed25519Keypair.deriveKeypair(seed);
        this.initOrderSigner(Ed25519Keypair.deriveKeypair(seed));
        break;
      case "Secp256k1":
        Secp256k1Keypair.deriveKeypair(seed);
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
    const _deployment = deployment || (await this.getDeploymentJson());

    this.contractCalls = new ContractCalls(this.getSigner(), _deployment);
  };

  /**
   * @description
   * Gets the RawSigner of the client
   * @returns RawSigner
   * */
  getSigner = (): Keypair => {
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
  getProvider = (): SuiClient => {
    return this.provider;
  };

  /**
   * Generate and receive readOnlyToken, this can only be accessed at the time of generation
   * @returns readOnlyToken string
   */
  generateReadOnlyToken = async () => {
    const response = await this.apiService.post<string>(
      SERVICE_URLS.USER.GENERATE_READONLY_TOKEN,
      {},
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * @description
   * Creates message to be signed, creates signature and authorize it from dapi
   * @returns auth token
   */
  userOnBoarding = async (token?: string) => {
    let userAuthToken = token;
    if (!userAuthToken) {
      const signature = await this.createOnboardingSignature();
      // authorize signature created by dAPI
      console.log(
        this.getPublicAddress(),
        "public address from before authorizeSignedHash"
      );

      const authTokenResponse = await this.authorizeSignedHash(signature);
      console.log(authTokenResponse, "authTokenResponse");

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

  createZkSignature({
    userSignature,
    zkPayload,
  }: {
    userSignature: string;
    zkPayload: ZkPayload;
  }) {
    const { salt, decodedJWT, proof, maxEpoch } = zkPayload;
    const addressSeed: string = genAddressSeed(
      BigInt(salt!),
      "sub",
      decodedJWT.sub,
      decodedJWT.aud
    ).toString();

    const zkLoginSignature: SerializedSignature = getZkLoginSignature({
      inputs: {
        ...proof,
        addressSeed,
      },
      maxEpoch: maxEpoch,
      userSignature,
    });

    return zkLoginSignature;
  }

  getZkPayload = (): ZkPayload => {
    return {
      decodedJWT: this.decodedJWT,
      proof: this.proof,
      salt: this.salt,
      maxEpoch: this.maxEpoch,
    };
  };

  createOnboardingSignature = async () => {
    let signature: SigPK;

    const onboardingSignature = {
      onboardingUrl: this.network.onboardingUrl,
    };

    console.log(onboardingSignature, "payload");
    if (this.uiWallet) {
      signature = await OrderSigner.signPayloadUsingWallet(
        onboardingSignature,
        this.uiWallet
      );
    } else if (this.isZkLogin) {
      console.log("signing payload for zk login");
      signature = await OrderSigner.signPayloadUsingZKSignature({
        payload: onboardingSignature,
        signer: this.signer,
        zkPayload: this.getZkPayload(),
      });
      console.log(signature, "signature");
    } else {
      signature = this.orderSigner.signPayload(onboardingSignature);
    }

    console.log(
      this.getPublicAddress(),
      "public address from createOnboardingSignature"
    );

    return `${signature?.signature}${signature?.publicKey}`;
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

  parseAndShapeSignedData = ({
    signature,
    isParsingRequired = true,
  }: {
    signature: string;
    isParsingRequired?: boolean;
  }): SigPK => {
    let data: SigPK;
    let parsedSignature = parseSerializedSignature(signature);
    console.log(parsedSignature, "parsed sinature");
    if (isParsingRequired && parsedSignature.signatureScheme === "ZkLogin") {
      console.log("parsing zk signature.....");
      //zk login signature
      const { userSignature } = parsedSignature.zkLogin;
      console.log(userSignature, "userSignature");

      //convert user sig to b64
      const convertedUserSignature = toB64(userSignature as any);
      console.log(convertedUserSignature, "convertedUserSignature");
      //reparse b64 converted user sig
      const parsedUserSignature = parseSerializedSignature(
        convertedUserSignature
      );
      console.log(parsedUserSignature, "parsedUserSignature");

      data = {
        signature:
          Buffer.from(parsedSignature.serializedSignature).toString("hex") +
          "3",
        publicKey: publicKeyFromRawBytes(
          parsedUserSignature.signatureScheme,
          parsedUserSignature.publicKey
        ).toBase64(),
      };
    } else {
      data = {
        signature:
          Buffer.from(parsedSignature.signature).toString("hex") +
          SIGNER_TYPES.UI_ED25519,
        publicKey: publicKeyFromRawBytes(
          parsedSignature.signatureScheme,
          parsedSignature.publicKey
        ).toBase64(),
      };
    }
    return data;
  };


  signOrder = async (orderToSign: Order): Promise<SigPK> => {
    let signature: SigPK;
    if (this.uiWallet) {
      signature = await OrderSigner.signOrderUsingWallet(
        orderToSign,
        this.uiWallet
      );
    } else if (this.isZkLogin) {
      signature = await OrderSigner.signOrderUsingZkSignature({
        order: orderToSign,
        signer: this.signer,
        zkPayload: this.getZkPayload(),
      });
    } else {
      if (this.orderSigner.signOrder)
        signature = this.orderSigner.signOrder(orderToSign);
      else
        throw Error(
          "On of OrderSginer or uiWallet needs to be initilized before signing order "
        );
    }
    return signature;
  };

  /**
   * @description
   * Gets a signed order from the client
   * @returns OrderSignatureResponse
   * @param order OrderSignatureRequest
   * */
  createSignedOrder = async (
    order: OrderSignatureRequest
  ): Promise<OrderSignatureResponse> => {
    if (!this.orderSigner && !this.uiWallet) {
      throw Error("Order Signer not initialized");
    }
    const orderToSign: Order = this.createOrderToSign(order);
    let signature: SigPK;
    try {
      signature = await this.signOrder(orderToSign);
    } catch (e) {
      throw Error("Failed to Sign Order: User Rejected Signature");
    }

    const signedOrder: OrderSignatureResponse = {
      symbol: order.symbol,
      price: order.price,
      quantity: order.quantity,
      side: order.side,
      orderType: order.orderType,
      triggerPrice:
        order.orderType === ORDER_TYPE.STOP_MARKET ||
        order.orderType === ORDER_TYPE.STOP_LIMIT
          ? order.triggerPrice || 0
          : 0,
      postOnly: orderToSign.postOnly,
      cancelOnRevert: orderToSign.cancelOnRevert,
      leverage: toBaseNumber(orderToSign.leverage),
      reduceOnly: orderToSign.reduceOnly,
      salt: Number(orderToSign.salt),
      expiration: Number(orderToSign.expiration),
      maker: orderToSign.maker,
      orderSignature: `${signature?.signature}${signature?.publicKey}`,
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
        triggerPrice: toBigNumberStr(
          params.triggerPrice || "0",
          POST_ORDER_BASE
        ),
        quantity: toBigNumberStr(params.quantity),
        leverage: toBigNumberStr(params.leverage),
        side: params.side,
        reduceOnly: params.reduceOnly,
        salt: params.salt,
        expiration: params.expiration,
        orderSignature: params.orderSignature,
        timeInForce: params.timeInForce || TIME_IN_FORCE.GOOD_TILL_TIME,
        orderbookOnly: true,
        postOnly: params.postOnly == true,
        cancelOnRevert: params.cancelOnRevert == true,
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
      postOnly: params.postOnly == true,
      cancelOnRevert: params.cancelOnRevert == true,
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
    // const serialized = new TextEncoder().encode(JSON.stringify(params));
    // return this.signer.signData(serialized);
    try {
      let signature: SigPK;

      //taking the hash of list of hashes of cancel signature
      const hashOfHash = Buffer.from(
        sha256(JSON.stringify(params.hashes))
      ).toString("hex");
      let payloadValue: string[] = [];
      payloadValue.push(hashOfHash);
      if (this.uiWallet) {
        signature = await OrderSigner.signPayloadUsingWallet(
          { orderHashes: payloadValue },
          this.uiWallet
        );
      } else if (this.isZkLogin) {
        signature = await OrderSigner.signPayloadUsingZKSignature({
          payload: { orderHashes: payloadValue },
          signer: this.signer,
          zkPayload: {
            decodedJWT: this.decodedJWT,
            proof: this.proof,
            salt: this.salt,
            maxEpoch: this.maxEpoch,
          },
        });
      } else {
        signature = this.orderSigner.signPayload({
          orderHashes: payloadValue,
        });
      }
      return `${signature?.signature}${signature?.publicKey}`;
    } catch {
      throw Error("Siging cancelled by user");
    }
  };

  /**
   * @description
   * Posts to exchange for cancellation of provided orders with signature
   * @param params OrderCancellationRequest containing order hashes to be cancelled and cancellation signature
   * @returns response from exchange server
   */
  placeCancelOrder = async (params: OrderCancellationRequest) => {
    const response = await this.apiService.delete<CancelOrderResponse>(
      SERVICE_URLS.ORDERS.ORDERS_HASH_V2,
      {
        symbol: params.symbol,
        orderHashes: params.hashes,
        cancelSignature: params.signature,
        parentAddress: params.parentAddress,
        fromUI: true,
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
      signature: signature,
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
          address: this.uiWallet
            ? await (
                this.signer as any as ExtendedWalletContextState
              ).getAddress()
            : this.signer.toSuiAddress(),
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
      address: await this.signer.toSuiAddress(),
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
        address: this.uiWallet
          ? await (
              this.signer as any as ExtendedWalletContextState
            ).getAddress()
          : this.signer.toSuiAddress(),
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
      to: await this.signer.toSuiAddress(),
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
    if (!amount) throw Error(`No amount specified for deposit`);

    //if CoinID provided
    if (coinID)
      return this.contractCalls.depositToMarginBankContractCall(amount, coinID);

    // Check for a single coin containing enough balance
    const coinHavingBalance = (
      await this.contractCalls.onChainCalls.getUSDCoinHavingBalance(
        {
          amount,
        },
        this.signer
      )
    )?.coinObjectId;
    if (coinHavingBalance) {
      return this.contractCalls.depositToMarginBankContractCall(
        amount,
        coinHavingBalance
      );
    }

    // Try merging users' coins if they have more than one coins
    const usdcCoins = await this.contractCalls.onChainCalls.getUSDCCoins(
      {},
      this.signer
    );
    if (usdcCoins.data.length > 1) {
      await this.contractCalls.onChainCalls.mergeAllUsdcCoins(
        this.contractCalls.onChainCalls.getCoinType(),
        this.signer
      );

      let coinHavingbalanceAfterMerge,
        retries = 5;

      while (!coinHavingbalanceAfterMerge && retries--) {
        //sleep for 1 second to merge the coins
        await new Promise((resolve) => setTimeout(resolve, 1000));
        coinHavingbalanceAfterMerge = (
          await this.contractCalls.onChainCalls.getUSDCoinHavingBalance(
            {
              amount,
            },
            this.signer
          )
        )?.coinObjectId;
      }

      if (coinHavingbalanceAfterMerge) {
        return this.contractCalls.depositToMarginBankContractCall(
          amount,
          coinHavingbalanceAfterMerge
        );
      }
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
   * Gets user trades history
   * @param params GetUserTradesHistoryRequest
   * @returns GetUserTradesHistoryResponse
   */
  getUserTradesHistory = async (params: GetUserTradesHistoryRequest) => {
    const response = await this.apiService.get<GetUserTradesHistoryResponse>(
      SERVICE_URLS.USER.USER_TRADES_HISTORY,
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

  /**
   * Generates referral code
   * @param params GenerateReferralCodeRequest
   * @returns GenerateReferralCodeResponse
   */
  generateReferralCode = async (params: GenerateReferralCodeRequest) => {
    const response = await this.apiService.post<GenerateReferralCodeResponse>(
      SERVICE_URLS.GROWTH.GENERATE_CODE,
      params,
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Links referred user
   * @param params LinkReferredUserRequest
   * @returns LinkReferredUserResponse
   */
  linkReferredUser = async (params: LinkReferredUserRequest) => {
    const response = await this.apiService.post<LinkReferredUserResponse>(
      SERVICE_URLS.GROWTH.LINK_REFERRED_USER,
      params,
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets referrer Info
   * @param campaignId
   * @returns GetReferrerInfoResponse
   */
  getReferrerInfo = async (campaignId: number) => {
    const response = await this.apiService.get<GetReferrerInfoResponse>(
      SERVICE_URLS.GROWTH.REFERRER_INFO,
      { campaignId },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets campaign details
   * @returns Array of GetCampaignDetailsResponse
   */
  getCampaignDetails = async () => {
    const response = await this.apiService.get<GetCampaignDetailsResponse[]>(
      SERVICE_URLS.GROWTH.CAMPAIGN_DETAILS
    );
    return response;
  };

  /**
   * Gets campaign reward details
   * @param campaignId
   * @returns GetCampaignRewardsResponse
   */
  getCampaignRewards = async (campaignId: number) => {
    const response = await this.apiService.get<GetCampaignRewardsResponse>(
      SERVICE_URLS.GROWTH.CAMPAIGN_REWARDS,
      { campaignId },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets affiliate payout details
   * @param campaignId
   * @returns Array of GetAffiliatePayoutsResponse
   */
  getAffiliatePayouts = async (campaignId: number) => {
    const response = await this.apiService.get<GetAffiliatePayoutsResponse[]>(
      SERVICE_URLS.GROWTH.AFFILIATE_PAYOUTS,
      { campaignId },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets affiliate referree details
   * @param GetAffiliateRefereeDetailsRequest
   * @returns GetAffiliateRefereeDetailsResponse
   */
  getAffiliateRefereeDetails = async (
    params: GetAffiliateRefereeDetailsRequest
  ) => {
    const response =
      await this.apiService.get<GetAffiliateRefereeDetailsResponse>(
        SERVICE_URLS.GROWTH.AFFILIATE_REFEREE_DETAILS,
        params,
        { isAuthenticationRequired: true }
      );
    return response;
  };

  /**
   * Gets affiliate referree count
   * @param campaignId
   * @returns GetAffiliateRefereeCountResponse
   */
  getAffiliateRefereeCount = async (campaignId: number) => {
    const response =
      await this.apiService.get<GetAffiliateRefereeCountResponse>(
        SERVICE_URLS.GROWTH.GROWTH_REFEREES_COUNT,
        { campaignId },
        { isAuthenticationRequired: true }
      );
    return response;
  };
  /**
   * Gets affiliate referree count
   * @param campaignId
   * @returns GetAffiliateRefereeCountResponse
   */
  getRefereeCount = async (campaignId: number) => {
    const response =
      await this.apiService.get<GetAffiliateRefereeCountResponse>(
        SERVICE_URLS.GROWTH.GROWTH_REFEREES_COUNT,
        { campaignId },
        { isAuthenticationRequired: true }
      );
    return response;
  };

  /**
   * Gets user rewards history
   * @param optional params GetUserRewardsHistoryRequest
   * @returns GetUserRewardsHistoryResponse
   */
  getUserRewardsHistory = async (params?: GetUserRewardsHistoryRequest) => {
    const response = await this.apiService.get<GetUserRewardsHistoryResponse>(
      SERVICE_URLS.GROWTH.USER_REWARDS_HISTORY,
      params,
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets user rewards summary
   * @returns GetUserRewardsSummaryResponse
   */
  getUserRewardsSummary = async () => {
    const response = await this.apiService.get<GetUserRewardsSummaryResponse>(
      SERVICE_URLS.GROWTH.USER_REWARDS_SUMMARY,
      {},
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets rewards overview
   * @param campaignId
   * @returns GetTradeAndEarnRewardsOverviewResponse
   */
  getTradeAndEarnRewardsOverview = async (campaignId: number) => {
    const response =
      await this.apiService.get<GetTradeAndEarnRewardsOverviewResponse>(
        SERVICE_URLS.GROWTH.REWARDS_OVERVIEW,
        { campaignId },
        { isAuthenticationRequired: true }
      );
    return response;
  };

  /**
   * Gets rewards details
   * @param GetTradeAndEarnRewardsDetailRequest
   * @returns GetTradeAndEarnRewardsDetailResponse
   */
  getTradeAndEarnRewardsDetail = async (
    params: GetTradeAndEarnRewardsDetailRequest
  ) => {
    const response =
      await this.apiService.get<GetTradeAndEarnRewardsDetailResponse>(
        SERVICE_URLS.GROWTH.REWARDS_DETAILS,
        params,
        { isAuthenticationRequired: true }
      );
    return response;
  };

  /**
   * Gets total historical trading reward details
   * @returns GetTotalHistoricalTradingRewardsResponse
   */
  getTotalHistoricalTradingRewards = async () => {
    const response =
      await this.apiService.get<GetTotalHistoricalTradingRewardsResponse>(
        SERVICE_URLS.GROWTH.TOTAL_HISTORICAL_TRADING_REWARDS,
        {},
        { isAuthenticationRequired: true }
      );
    return response;
  };

  /**
   * Gets maker rewards summary
   * @returns GetMakerRewardsSummaryResponse
   */
  getMakerRewardsSummary = async () => {
    const response = await this.apiService.get<GetMakerRewardsSummaryResponse>(
      SERVICE_URLS.GROWTH.MAKER_REWARDS_SUMMARY,
      {},
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets maker reward details
   * @param GetMakerRewardDetailsRequest
   * @returns GetMakerRewardDetailsResponse
   */
  getMakerRewardDetails = async (params: GetMakerRewardDetailsRequest) => {
    const response = await this.apiService.get<GetMakerRewardDetailsResponse>(
      SERVICE_URLS.GROWTH.MAKER_REWARDS_DETAILS,
      params,
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets market maker whitelist status
   * @returns GetUserWhiteListStatusForMarkeMaker
   */
  getUserWhiteListStatusForMarketMaker = async () => {
    const response =
      await this.apiService.get<GetUserWhiteListStatusForMarkeMakerResponse>(
        SERVICE_URLS.GROWTH.MAKER_WHITELIST_STATUS,
        {},
        { isAuthenticationRequired: true }
      );
    return response;
  };
  //Open referral Program
  /**
   * get open referral referee details
   * @param payload
   * @returns OpenReferralRefereeDetails
   */
  getOpenReferralRefereeDetails = async (payload: {
    cursor: string;
    pageSize: number;
  }) => {
    const response = await this.apiService.get<{
      data: OpenReferralRefereeDetails;
      nextCursor: string;
      isMoreDataAvailable: boolean;
    }>(SERVICE_URLS.GROWTH.OPEN_REFERRAL_REFEREE_DETAILS, payload, {
      isAuthenticationRequired: true,
    });
    return response;
  };

  /**
   * get open referral payouts
   * @param payload
   * @returns OpenReferralDetails
   */
  getOpenReferralDetails = async (payload: { campaignId: number }) => {
    const response = await this.apiService.get<OpenReferralDetails>(
      SERVICE_URLS.GROWTH.OPEN_REFERRAL_REFEREES_COUNT,
      payload,
      { isAuthenticationRequired: true }
    );
    return response;
  };
  /**
   * get open referral payouts
   * @param payload
   * @returns OpenReferralPayoutList
   */
  getOpenReferralPayouts = async (payload: {
    cursor: string;
    pageSize: number;
  }) => {
    const response = await this.apiService.get<{
      data: OpenReferralPayoutList;
      nextCursor: string;
      isMoreDataAvailable: boolean;
    }>(SERVICE_URLS.GROWTH.OPEN_REFERRAL_PAYOUTS, payload, {
      isAuthenticationRequired: true,
    });
    return response;
  };

  /**
   * generate open referral code
   * @param campaignId
   * @returns OpenReferralOverview
   */
  generateOpenReferralReferralCode = async (payload: {
    campaignId: string;
  }) => {
    const response = await this.apiService.post<{
      referralAddress: string;
      referralCode: string;
      message: string;
    }>(SERVICE_URLS.GROWTH.OPEN_REFERRAL_GENERATE_CODE, payload, {
      isAuthenticationRequired: true,
    });
    return response;
  };

  /**
   * get open referral overview
   * @returns OpenReferralOverview
   */
  getOpenReferralOverview = async () => {
    const response = await this.apiService.get<OpenReferralOverview>(
      SERVICE_URLS.GROWTH.OPEN_REFERRAL_OVERVIEW,
      undefined,
      {
        isAuthenticationRequired: true,
      }
    );
    return response;
  };

  /**
   * Link open referral
   * @param referralCode
   * @returns boolean
   */

  openReferralLinkReferredUser = async (payload: { referralCode: string }) => {
    const response = await this.apiService.post(
      SERVICE_URLS.GROWTH.OPEN_REFERRAL_LINK_REFERRED_USER,
      payload,
      {
        isAuthenticationRequired: true,
      }
    );
    return response;
  };

  //Open referral Program

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
  private getDeploymentJson = async (): Promise<any> => {
    try {
      // Fetch data from the given URL
      const response = await this.apiService.get<ConfigResponse>(
        SERVICE_URLS.MARKET.CONFIG
      );
      // The data property of the response object contains our configuration
      return response.data.deployment;
    } catch (error) {
      // If Axios threw an error, it will be stored in error.response
      if (error.response) {
        throw new Error(`Failed to fetch deployment: ${error.response.status}`);
      } else {
        throw new Error(`An error occurred: ${error}`);
      }
    }
  };

  /**
   * Function to create order payload that is to be signed on-chain
   * @param params OrderSignatureRequest
   * @returns Order
   */
  public createOrderToSign = (
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
      reduceOnly: params.reduceOnly == true,
      expiration: bigNumber(
        params.expiration || Math.floor(expiration.getTime())
      ), // /1000 to convert time in seconds
      postOnly: params.postOnly == true,
      cancelOnRevert: params.cancelOnRevert == true,
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
    console.log(
      this.getPublicAddress(),
      "public address inside authorizeSignedHash"
    );
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
