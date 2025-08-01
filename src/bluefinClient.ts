import {
  ADJUST_MARGIN,
  BaseWallet,
  bigNumber,
  createZkSignature,
  DAPIKlineResponse,
  DecodeJWT,
  Ed25519Keypair,
  ExtendedWalletContextState,
  getKeyPairFromPvtKey,
  isEmpty,
  MARGIN_TYPE,
  MarketSymbol,
  Order,
  OrderSigner,
  ORDER_SIDE,
  ORDER_STATUS,
  ORDER_TYPE,
  PartialZkLoginSignature,
  Secp256k1Keypair,
  SIGNER_TYPES,
  SigPK,
  SuiClient,
  TIME_IN_FORCE,
  toBaseNumber,
  toBigNumber,
  toBigNumberStr,
  Transaction,
  TransactionBlock,
  TRANSFERABLE_COINS,
  usdcToBaseNumber,
  ZkPayload,
  SuiBlocks,
  SuiTransactionBlockResponse,
  Signer,
  Keypair,
} from "@firefly-exchange/library-sui";
import {
  type SignaturePayload,
  toBase64,
  fromBase64,
} from "@firefly-exchange/library-sui/blv";
import interpolate from "interpolate";

import { SignatureScheme } from "@mysten/sui/cryptography";
import { publicKeyFromRawBytes } from "@mysten/sui/verify";
import { genAddressSeed, getZkLoginSignature } from "@mysten/zklogin";
import { sha256 } from "@noble/hashes/sha256";
import { parseSerializedSignature } from "@mysten/sui/cryptography";
import {
  combineAndEncode,
  filterDelistedMarkets,
  generateRandomNumber,
  throwCustomError,
} from "../utils/utils";
import {
  Errors,
  Networks,
  POST_ORDER_BASE,
  USER_REJECTED_MESSAGE,
} from "./constants";
import { APIService } from "./exchange/apiService";
import { SERVICE_URLS, VAULT_URLS } from "./exchange/apiUrls";
import {
  ResponseSchema,
  SuccessMessages,
  VaultTVLInterval,
} from "./exchange/contractErrorHandling.service";
import { ContractCalls } from "./exchange/contractService";
import { InteractorCalls } from "./exchange/interactorService";
import { Sockets } from "./exchange/sockets";
import { WebSockets } from "./exchange/WebSocket";
import {
  adjustLeverageRequest,
  AdjustLeverageResponse,
  AuthorizeHashResponse,
  BatchClaimPayload,
  CancelOrderResponse,
  ConfigResponse,
  ExchangeInfo,
  Expired1CTSubAccountsResponse,
  ExtendedNetwork,
  GenerateReferralCodeRequest,
  GenerateReferralCodeResponse,
  GetAccountDataResponse,
  GetAffiliatePayoutsResponse,
  GetAffiliateRefereeCountResponse,
  GetAffiliateRefereeDetailsRequest,
  GetAffiliateRefereeDetailsResponse,
  GetCampaignDetailsResponse,
  GetCampaignRewardsResponse,
  GetCandleStickRequest,
  GetCountDownsResponse,
  GetFundingHistoryRequest,
  GetFundingRateResponse,
  GetMakerRewardDetailsRequest,
  GetMakerRewardDetailsResponse,
  GetMakerRewardsSummaryResponse,
  GetMarketRecentTradesRequest,
  GetMarketRecentTradesResponse,
  GetOffchainSettlementUpdatesRequest,
  GetOffchainSettlementUpdatesResponse,
  GetOrderbookRequest,
  GetOrderBookResponse,
  GetOrderRequest,
  GetOrderResponse,
  GetPositionRequest,
  GetPositionResponse,
  GetReferrerInfoResponse,
  GetTotalHistoricalTradingRewardsResponse,
  GetTradeAndEarnRewardsDetailRequest,
  GetTradeAndEarnRewardsDetailResponse,
  GetTradeAndEarnRewardsOverviewResponse,
  GetTransactionHistoryRequest,
  GetTransferHistoryRequest,
  GetUserFundingHistoryResponse,
  GetUserRewardsHistoryRequest,
  GetUserRewardsHistoryResponse,
  GetUserRewardsSummaryResponse,
  GetUserTradesHistoryRequest,
  GetUserTradesHistoryResponse,
  GetUserTradesRequest,
  GetUserTradesResponse,
  GetUserTransactionHistoryResponse,
  GetUserTransferHistoryResponse,
  GetUserWhiteListStatusForMarketMakerResponse,
  IVaultsTVLDatapointsMap,
  LinkReferredUserRequest,
  LinkReferredUserResponse,
  MarketData,
  MarketMeta,
  MasterInfo,
  OpenReferralDetails,
  OpenReferralOverview,
  OpenReferralPayoutList,
  OpenReferralRefereeDetails,
  OrderCancellationRequest,
  OrderCancelSignatureRequest,
  OrderSignatureRequest,
  OrderSignatureResponse,
  PlaceOrderRequest,
  PlaceOrderResponse,
  PostOrderRequest,
  PostTimerAttributes,
  PostTimerResponse,
  SignedSubAccountRequest,
  SponsorTxResponse,
  StatusResponse,
  SubAccountRequest,
  SubAccountResponse,
  TickerData,
  UserPendingWithdrawRequest,
  UserVaultDetail,
  UserVaultDetailSummary,
  VaultDetail,
  VerifyWalletStatusResponse,
} from "./interfaces/routes";

export class BluefinClient {
  protected readonly network: ExtendedNetwork;

  private orderSigner: OrderSigner;

  private apiService: APIService;

  public sockets: Sockets;

  public webSockets: WebSockets | undefined;

  public vaultConfig: any;

  public marketSymbols: string[] = []; // to save array market symbols [DOT-PERP, SOL-PERP]

  private walletAddress = ""; // to save user's public address when connecting from UI

  private signer: Signer; // to save signer when connecting from UI

  private uiWallet: BaseWallet | any; // to save signer when connecting from UI

  private isZkLogin: boolean = false;

  private contractCalls: ContractCalls | undefined;

  private interactorCalls: InteractorCalls | undefined;

  private provider: SuiClient | undefined; // to save raw web3 provider when connecting from UI

  private isTermAccepted = false;

  private maxSaltLimit = 2 ** 60;

  // the number of decimals supported by USDC contract
  private MarginTokenPrecision = 6;

  private maxEpoch: number;

  private proof: PartialZkLoginSignature;

  private decodedJWT: DecodeJWT;

  private salt: string;

  private is_wallet_extension: boolean = false;

  /**
   * initializes the class instance
   * @param _isTermAccepted boolean indicating if exchange terms and conditions are accepted
   * @param _network containing network rpc url and chain id
   * @param _account accepts either privateKey or AWS-KMS-SIGNER object if user intend to sign using kms
   * @param _scheme signature scheme to be used
   * @param _isUI (optional) is initialized from UI
   * @param _uiWalletType (optional) wallet type connected on the UI i.e SUI, Nightly etc
   */
  constructor(
    _isTermAccepted: boolean,
    _network: ExtendedNetwork,
    _account?: string | Signer,
    _scheme?: SignatureScheme,
    _isUI?: boolean,
    _uiWalletType?: string,
    _uiSignerObject?: any
  ) {
    this.network = _network;

    this.provider = new SuiClient({ url: _network.url });

    this.apiService = new APIService(
      this.network.apiGateway,
      _uiWalletType,
      _network
    );

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
    // In case of KMS Signer any of the above condition doesn't matches,
    else if (_account) {
      this.initializeWithKeyPair(_account as Signer);
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
    try {
      if (apiToken) {
        this.apiService.setWalletAddress(this.getPublicAddress());

        this.apiService.setApiToken(apiToken);
        // for socket
        this.sockets.setApiToken(apiToken);
        this.webSockets?.setApiToken(apiToken);
      } else {
        if (!this.signer) {
          throw Error("Signer not initialized");
        }
        await this.initContractCalls(deployment);
        // for BLV contract calls
        await this.initInteractorCalls();

        this.walletAddress = this.isZkLogin
          ? this.walletAddress
          : this.signer.toSuiAddress
          ? this.signer.toSuiAddress()
          : (this.signer as any as ExtendedWalletContextState).getAddress
          ? (this.signer as any as ExtendedWalletContextState).getAddress()
          : this.walletAddress;

        // onboard user if not onboarded
        if (userOnboarding) {
          await this.userOnBoarding();
        }
      }

      if (this.network.UUID) {
        this.setUUID(this.network.UUID);
      }
    } catch (error) {
      throw throwCustomError({
        error,
        code: Errors.FAILED_TO_INITIALIZE_CLIENT,
      });
    }
  };

  initializeWithHook = async (
    uiSignerObject: ExtendedWalletContextState,
    walletAddress: string
  ): Promise<void> => {
    try {
      this.uiWallet = uiSignerObject;
      this.signer = uiSignerObject as any;
      this.walletAddress = walletAddress;
      this.isZkLogin = false;
      this.is_wallet_extension = true;
    } catch (error) {
      throw throwCustomError({
        error,
        code: Errors.FAILED_TO_INITIALIZE_CLIENT_FOR_UI_WALLET,
      });
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
    try {
      const keyPair = getKeyPairFromPvtKey(_account, "ZkLogin");
      this.signer = keyPair;
      this.walletAddress = walletAddress;
      this.maxEpoch = maxEpoch;
      this.decodedJWT = decodedJWT;
      this.proof = proof;
      this.salt = salt;
      this.isZkLogin = true;
      this.is_wallet_extension = false;
    } catch (error) {
      throw throwCustomError({
        error,
        code: Errors.FAILED_TO_INITIALIZE_CLIENT_FOR_ZK_ACCOUNT,
      });
    }
  };

  /** *
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
  initializeWithKeyPair = async (keypair: Signer): Promise<void> => {
    this.signer = keypair;
    this.walletAddress = this.signer.toSuiAddress();
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
        this.signer = Ed25519Keypair.deriveKeypair(seed);
        this.initOrderSigner(Ed25519Keypair.deriveKeypair(seed));
        break;
      case "Secp256k1":
        this.signer = Secp256k1Keypair.deriveKeypair(seed);
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

    this.contractCalls = new ContractCalls(
      this.getSigner(),
      _deployment,
      this.provider,
      this.network,
      this.isZkLogin,
      this.getZkPayload(),
      this.walletAddress,
      this.is_wallet_extension
    );
  };

  /**
   * @description
   * initializes contract calls
   * @param deployment (optional) The deployment json provided by deployer
   */
  initInteractorCalls = async () => {
    if (!this.signer) {
      throw Error("Signer not Initialized");
    }
    const _deployment = await this.getVaultConfigsForInteractor();
    this.vaultConfig = _deployment;
    this.interactorCalls = new InteractorCalls(
      this.getSigner(),
      _deployment,
      this.provider,
      this.is_wallet_extension,
      this.isZkLogin,
      this.getZkPayload(),
      this.walletAddress
    );
  };

  /**
   * @description
   * Gets the RawSigner of the client
   * @returns RawSigner
   * */
  getSigner = (): Signer => {
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
  userOnBoarding = async (
    token?: string,
    useDeprecatedSigningMethod?: boolean
  ) => {
    this.apiService.setWalletAddress(this.getPublicAddress()); // setting before auth call
    let userAuthToken = token;
    if (!userAuthToken) {
      const signature = await this.createOnboardingSignature({
        useDeprecatedSigningMethod,
      });
      // authorize signature created by dAPI
      const authTokenResponse = await this.authorizeSignedHash(signature);

      if (!authTokenResponse.ok || !authTokenResponse.data) {
        throw Error(
          `Authorization error: ${authTokenResponse.response.message} sig: ${signature}`
        );
      }
      userAuthToken = authTokenResponse.data.token;
    }

    // for api
    this.apiService.setAuthToken(userAuthToken);
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

    const zkLoginSignature: string = getZkLoginSignature({
      inputs: {
        ...proof,
        addressSeed,
      },
      maxEpoch,
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

  createOnboardingSignature = async ({
    useDeprecatedSigningMethod,
  }: {
    useDeprecatedSigningMethod?: boolean;
  }) => {
    let signature: SigPK;

    const onboardingSignature = {
      onboardingUrl: this.network.onboardingUrl,
    };

    if (this.uiWallet) {
      try {
        console.log(`[TempLog] createOnboardingSignature: NORMAL WALLET`);
        signature = await OrderSigner.signPayloadUsingWallet(
          onboardingSignature,
          this.uiWallet,
          useDeprecatedSigningMethod
        );
      } catch (error) {
        throwCustomError({ error, code: Errors.WALLET_PAYLOAD_SIGNING_FAILED });
      }
    } else if (this.isZkLogin) {
      try {
        console.log(`[TempLog] createOnboardingSignature: ZK Login`);
        signature = await OrderSigner.signPayloadUsingZKSignature({
          payload: onboardingSignature,
          signer: this.signer,
          zkPayload: this.getZkPayload(),
        });
      } catch (error) {
        throwCustomError({ error, code: Errors.ZK_PAYLOAD_SIGNING_FAILED });
      }
    } else {
      try {
        console.log(`[TempLog] createOnboardingSignature: In ELSE Block`);
        signature = await this.orderSigner.signPayload(onboardingSignature);
      } catch (error) {
        throwCustomError({
          error,
          code: Errors.KEYPAIR_PAYLOAD_SIGNING_FAILED,
        });
      }
    }
    return `${signature?.signature}${
      signature?.publicAddress ? signature?.publicAddress : signature?.publicKey
    }`;
  };

  /**
   * @description
   * Gets the payload containing key and mesasge to sign
   * @returns SigPK
   * */

  signPayloadUsingZkWallet = async (payload: object): Promise<SigPK> => {
    const signature = await OrderSigner.signPayloadUsingZKSignature({
      payload,
      signer: this.signer,
      zkPayload: this.getZkPayload(),
    });

    return signature;
  };

  /**
   * @description
   * Gets the payload containing bytes mesasge to sign
   * @returns SigPK
   * */

  signBytesPayloadUsingZkWallet = async (
    payload: Uint8Array
  ): Promise<SigPK> => {
    const signature = await OrderSigner.signBytesPayloadUsingZKSignature({
      payload,
      signer: this.signer,
      zkPayload: this.getZkPayload(),
    });

    return signature;
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
    const parsedSignature = parseSerializedSignature(signature);

    // this method doesn't support MultiSig signatures because it can't parse the public key
    if (parsedSignature.signatureScheme === "MultiSig") {
      throw new Error("Unexpected MultiSig signature in ZkLogin flow");
    }
    if (isParsingRequired && parsedSignature.signatureScheme === "ZkLogin") {
      // zk login signature
      const { userSignature } = parsedSignature.zkLogin;

      // convert user sig to b64
      const convertedUserSignature = toBase64(userSignature as any);

      // reparse b64 converted user sig
      const parsedUserSignature = parseSerializedSignature(
        convertedUserSignature
      ) as { signatureScheme: SignatureScheme; publicKey: Uint8Array };

      data = {
        signature: `${Buffer.from(parsedSignature.signature).toString("hex")}3`,
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
    } else if (this.orderSigner.signOrder)
      signature = await this.orderSigner.signOrder(orderToSign);
    else
      throw Error(
        "On of OrderSigner or uiWallet needs to be initialized before signing order "
      );
    return signature;
  };

  /**
   * @description
   * Gets a signed order from the client
   * @returns OrderSignatureResponse
   * @param order OrderSignatureRequest
   * */
  createSignedOrder = async (
    order: OrderSignatureRequest,
    parentAddress?: string
  ): Promise<OrderSignatureResponse> => {
    if (!this.orderSigner && !this.uiWallet && !this.isZkLogin) {
      throw Error("Order Signer not initialized");
    }
    const orderToSign: Order = this.createOrderToSign(order, parentAddress);
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
        order.orderType === ORDER_TYPE.STOP_LIMIT ||
        order.orderType === ORDER_TYPE.STOP_LOSS_LIMIT ||
        order.orderType === ORDER_TYPE.TAKE_PROFIT_LIMIT ||
        order.orderType === ORDER_TYPE.STOP_LOSS_MARKET ||
        order.orderType === ORDER_TYPE.TAKE_PROFIT_MARKET
          ? order.triggerPrice || 0
          : 0,
      postOnly: orderToSign.postOnly,
      cancelOnRevert: orderToSign.cancelOnRevert,
      leverage: toBaseNumber(orderToSign.leverage),
      reduceOnly: orderToSign.reduceOnly,
      salt: Number(orderToSign.salt),
      expiration: Number(orderToSign.expiration),
      maker: orderToSign.maker,
      orderSignature: `${signature?.signature}${
        signature?.publicAddress
          ? signature?.publicAddress
          : signature?.publicKey
      }`,
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
    if (params.reduceOnly) {
      console.warn(
        "Warning: Reduce Only feature is deprecated until further notice. Reduce Only orders will be rejected from the API."
      );
    }
    const signedOrder = await this.createSignedOrder(
      params,
      params.parentAddress
    );
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

      // taking the hash of list of hashes of cancel signature
      const hashOfHash = Buffer.from(
        sha256(JSON.stringify(params.hashes))
      ).toString("hex");
      const payloadValue: string[] = [];
      payloadValue.push(hashOfHash);
      if (this.uiWallet) {
        // connected via UI
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
        signature = await this.orderSigner.signPayload({
          orderHashes: payloadValue,
        });
      }

      return `${signature?.signature}${
        signature?.publicAddress
          ? signature?.publicAddress
          : signature?.publicKey
      }`;
    } catch {
      throw Error("Signing cancelled by user");
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
          address:
            this.is_wallet_extension || this.isZkLogin
              ? this.walletAddress
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
        address: this.walletAddress,
        currencyID: this.contractCalls.onChainCalls.getCurrencyID(),
      },
      this.signer
    );
  };

  /**
   * @description
   * fetch user sui balance
   * @param walletAddress wallet address of the user
   * @returns string
  
   * */

  getSUIBalance = async (walletAddress?: string): Promise<string> => {
    return this.contractCalls.getSUIBalance(walletAddress);
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

    // Open Position case
    if (Object.keys(position).length > 0) {
      if (params.sponsorTx) {
        // create sponsored adjust leverage call
        let errorMsg = "";
        const sponsorPayload =
          await this.contractCalls.adjustLeverageContractCall(
            params.leverage,
            params.symbol,
            params.parentAddress,
            true
          );
        // only sign the sponsored tx
        const sponsorTxResponse =
          await this.signAndExecuteAdjustLeverageSponsoredTx(
            sponsorPayload,
            false // execute
          );

        errorMsg = sponsorTxResponse?.message;
        if (sponsorTxResponse && sponsorTxResponse.ok) {
          // make dapi call
          // Encode to hex for transmission
          const encodedSignature = combineAndEncode({
            bytes: sponsorTxResponse.data.signedTxb.bytes,
            signature: sponsorTxResponse.data.signedTxb.signature,
          });

          const {
            ok,
            data,
            response: { errorCode, message },
          } = await this.updateLeverage({
            symbol: params.symbol,
            leverage: params.leverage,
            parentAddress: params.parentAddress,
            signedTransaction: encodedSignature,
            sponsorSignature: sponsorTxResponse.data.signedTxb.sponsorSignature,
          });
          const response: ResponseSchema = {
            ok,
            data,
            code: errorCode,
            message,
          };

          // If API is successful return response else make direct contract call to update the leverage
          if (response.ok) {
            return response;
          }

          // fallback to make old sponsored call
          const sponsorTxResponseFallback =
            await this.signAndExecuteSponsoredTx(sponsorPayload);
          if (sponsorTxResponseFallback?.ok) {
            return {
              ok: true,
              code: 200,
              message: "Leverage Updated",
              data: "",
            };
          }
          errorMsg = sponsorTxResponseFallback?.message;
        }

        // recursive call if sponsor fails
        if (errorMsg && errorMsg !== USER_REJECTED_MESSAGE)
          return this.adjustLeverage({ ...params, sponsorTx: false });
        throw new Error(sponsorTxResponse?.message || "Error Adjust Leverage");
      } else {
        // TODO: fix zk login call also via dapi later, leaving for now as we have moved to sponsored calls above
        if (this.isZkLogin) {
          return await this.contractCalls.adjustLeverageContractCall(
            params.leverage,
            params.symbol,
            params.parentAddress
          );
        }

        // sign the transaction only
        const signedTx =
          await this.contractCalls.adjustLeverageContractCallRawTransaction(
            params.leverage,
            params.symbol,
            params.parentAddress
          );

        // execute on dapi
        const {
          ok,
          data,
          response: { errorCode, message },
        } = await this.updateLeverage({
          symbol: params.symbol,
          leverage: params.leverage,
          parentAddress: params.parentAddress,
          signedTransaction: signedTx,
        });
        const response: ResponseSchema = { ok, data, code: errorCode, message };

        // If API is successful return response else make direct contract call to update the leverage
        if (response.ok) {
          return response;
        }

        // fall back for simple adjust leverage call
        return await this.contractCalls.adjustLeverageContractCall(
          params.leverage,
          params.symbol,
          params.parentAddress
        );
      }
    }
    // NO position case
    else {
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
    }
  };

  /**
   * @description
   * Whitelist subaccount and/or remove the already exists subaccounts for One Click Trading
   * @param subAccountAddress
   * @param accountsToRemove (optional)
   * @returns ResponseSchema
   */
  upsertSubAccount = async (
    params: SubAccountRequest,
    sponsorTx?: boolean
  ): Promise<ResponseSchema> => {
    const apiResponse = await this.getExpiredAccountsFor1CT();
    const signedTx =
      await this.contractCalls.upsertSubAccountContractCallRawTransaction(
        params.subAccountAddress,
        apiResponse?.data?.expiredSubAccounts ?? [],
        undefined,
        undefined,
        sponsorTx
      );
    if (sponsorTx) {
      const sponsorPayload = signedTx as TransactionBlock;
      const sponsorTxResponse = await this.signAndExecuteSponsoredTx(
        {
          data: sponsorPayload,
          ok: true,
          code: 200,
          message: "",
        },
        false
      );

      if (sponsorTxResponse?.ok) {
        const signedTransaction = combineAndEncode(
          // @ts-ignore
          sponsorTxResponse?.data?.signedTxb
        );

        const request: SignedSubAccountRequest = {
          subAccountAddress: params.subAccountAddress,
          accountsToRemove: params.accountsToRemove,
          signedTransaction,
          sponsorSignature:
            // @ts-ignore
            sponsorTxResponse?.data?.signedTxb?.sponsorSignature,
        };

        const {
          ok,
          data,
          response: { errorCode, message },
        } = await this.addSubAccountFor1CT(request);

        if (ok) {
          const response: ResponseSchema = {
            ok,
            data,
            code: errorCode,
            message,
          };

          return response;
        }
      }

      // recursive call if sponsor fails
      if (
        !sponsorTxResponse?.ok &&
        sponsorTxResponse?.message !== USER_REJECTED_MESSAGE
      ) {
        return this.upsertSubAccount(params, false);
      }
    }

    const request: SignedSubAccountRequest = {
      subAccountAddress: params.subAccountAddress,
      accountsToRemove: params.accountsToRemove,
      signedTransaction: signedTx as string,
    };

    const {
      ok,
      data,
      response: { errorCode, message },
    } = await this.addSubAccountFor1CT(request);

    const response: ResponseSchema = {
      ok,
      data,
      code: errorCode,
      message,
    };

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
    amount: number,
    sponsorTx?: boolean
  ): Promise<ResponseSchema> => {
    if (sponsorTx) {
      const sponsorPayload = await this.contractCalls.adjustMarginContractCall(
        symbol,
        operationType,
        amount,
        sponsorTx
      );
      if (sponsorPayload.ok) {
        const sponsorTxResponse = await this.signAndExecuteSponsoredTx(
          sponsorPayload
        );
        if (
          !sponsorTxResponse?.ok &&
          sponsorTxResponse?.message !== USER_REJECTED_MESSAGE
        ) {
          return this.adjustMargin(symbol, operationType, amount, false);
        }
        if (!sponsorTxResponse?.ok) {
          throw new Error(
            sponsorTxResponse?.message || "Error adjusting margin"
          );
        }
      }
    }
    return this.contractCalls.adjustMarginContractCall(
      symbol,
      operationType,
      amount,
      sponsorTx
    );
  };

  /**
   * @description
   * Deposits USDC to Margin Bank contract
   * @param amount amount of USDC to deposit
   * @param coinID coinID of USDC coin to use
   * @returns ResponseSchema
   */
  depositToMarginBank = async (
    amount: number,
    coinID?: string,
    sponsorTx?: boolean
  ): Promise<ResponseSchema> => {
    const verifyStatus = await this.verifyWalletStatus(amount);
    if (
      verifyStatus.ok &&
      verifyStatus.data &&
      verifyStatus.data.verificationStatus != "Success"
    ) {
      throwCustomError({
        error: `Deposit Unavailable: Your account is currently ${verifyStatus.data.verificationStatus} from depositing funds`,
      });
    }

    if (sponsorTx) {
      const sponsorTxPayload = await this.depositToMarginBankSponsored(
        amount,
        coinID,
        true
      );
      const sponsorTxResponse = await this.signAndExecuteSponsoredTx(
        sponsorTxPayload
      );
      if ((sponsorTxResponse as ResponseSchema)?.ok) {
        return {
          ok: true,
          code: 200,
          data: sponsorTxResponse,
          message: "Deposit Successful",
        };
      }
      // recursive call if sponsor fails
      if (
        !sponsorTxResponse?.ok &&
        sponsorTxResponse?.message !== USER_REJECTED_MESSAGE
      )
        return this.depositToMarginBank(amount, coinID, false);
    }
    return this.depositToMarginBankSponsored(amount, coinID, false);
  };

  depositToMarginBankSponsored = async (
    amount: number,
    coinID?: string,
    sponsorTx?: boolean
  ) => {
    if (!amount) throwCustomError({ error: "No amount specified for deposit" });

    // if CoinID provided
    if (coinID) {
      const contractCall =
        await this.contractCalls.depositToMarginBankContractCall(
          amount,
          coinID,
          this.getPublicAddress,
          sponsorTx
        );
      if (sponsorTx) {
        await this.signAndExecuteSponsoredTx(contractCall.data);
      } else {
        return contractCall;
      }
    }

    // if no coin id provided

    // Check for a single coin containing enough balance
    const coinHavingBalance = (
      await this.contractCalls.getUSDCHavingBalance(amount)
    )?.coinObjectId;

    if (coinHavingBalance) {
      return await this.contractCalls.depositToMarginBankContractCall(
        amount,
        coinHavingBalance,
        this.getPublicAddress,
        sponsorTx
      );
    }

    // Try merging users' coins if they have more than one coins
    const usdcCoins = await this.contractCalls.getUSDCCoins(this.walletAddress);

    if (usdcCoins.data.length > 1) {
      if (sponsorTx) {
        const sponsorPayload = await this.contractCalls.mergeAllUSDCCOins(
          sponsorTx
        );
        await this.signAndExecuteSponsoredTx({
          ok: true,
          data: sponsorPayload,
          message: "",
        });
      } else {
        await this.contractCalls.mergeAllUSDCCOins(sponsorTx);
      }

      let coinHavingBalanceAfterMerge;
      let retries = 5;

      while (!coinHavingBalanceAfterMerge && retries--) {
        // sleep for 1 second to merge the coins
        await new Promise((resolve) => setTimeout(resolve, 1000));
        coinHavingBalanceAfterMerge = (
          await this.contractCalls.getUSDCHavingBalance(amount)
        )?.coinObjectId;
      }

      if (coinHavingBalanceAfterMerge) {
        return this.contractCalls.depositToMarginBankContractCall(
          amount,
          coinHavingBalanceAfterMerge,
          this.getPublicAddress,
          sponsorTx
        );
      }
    }

    throwCustomError({
      error: `User has no coin with amount ${amount} to deposit`,
    });
  };

  /**
   * @description
   * withdraws USDC from Margin Bank contract
   * @param amount amount of USDC to withdraw
   * @returns ResponseSchema
   */
  withdrawFromMarginBank = async (
    amount?: number,
    sponsorTx?: boolean
  ): Promise<ResponseSchema> => {
    if (sponsorTx) {
      if (amount) {
        try {
          const sponsorTxPayload =
            await this.contractCalls.withdrawFromMarginBankContractCall(
              amount,
              true
            );

          const sponsorTxResponse = await this.signAndExecuteSponsoredTx(
            sponsorTxPayload
          );
          if (sponsorTxResponse?.ok) {
            return {
              ok: true,
              code: 200,
              data: sponsorTxResponse,
              message: "Withdraw Successful",
            };
          }
          // recursive call if sponsor fails and not rejected

          if (
            !sponsorTxResponse?.ok &&
            sponsorTxResponse?.message !== USER_REJECTED_MESSAGE
          ) {
            return this.withdrawFromMarginBank(amount);
          }
          throw new Error(
            sponsorTxResponse?.message || "Error completing withdraw"
          );
        } catch (e) {
          return {
            ok: false,
            code: "Withdraw unsuccessful",
            data: "",
            message: e.message,
          };
        }
      } else {
        return this.contractCalls.withdrawAllFromMarginBankContractCall();
      }
    }
    if (amount) {
      return this.contractCalls.withdrawFromMarginBankContractCall(amount);
    }
    return this.contractCalls.withdrawAllFromMarginBankContractCall();
  };

  closeDelistedPosition = async (
    symbol: MarketSymbol,
    args?: {
      gasBudget?: number;
      dryRunOnly?: boolean;
    }
  ) => {
    return this.contractCalls.closeDelistedPositionContractCall(symbol, args);
  };

  closeAllDelistedPositionsAndWithdrawMargin = async (args?: {
    gasBudget?: number;
    sponsor?: boolean;
    dryRunOnly?: boolean;
  }) => {
    try {
      // get exchange info of all markets to read the status
      const exchangeInfo = await this.getExchangeInfo();
      const delistedMarkets = filterDelistedMarkets(exchangeInfo);

      //get user positions
      const userPositions = await this.getUserPosition({});

      let delistedUserPositionsSymbols: string[] = [];
      //get delisted market positions
      //if user doesn't have positions in delisted markets, closeAllPositionsAndWithdrawMarginPTB internally handles not adding any close position call to PTB
      if (userPositions.data && userPositions.data.length > 0) {
        delistedUserPositionsSymbols = userPositions.data
          .filter((position) => {
            return delistedMarkets.includes(position.symbol);
          })
          .map((position) => position.symbol);
      }

      // cancel open orders for delisted markets
      try {
        await Promise.all(
          delistedMarkets.map((symbol) => this.cancelAllOpenOrders(symbol))
        );
      } catch (error) {
        // Silently handle "no orders to cancel" error and continue execution
        console.log("Error during cancellation:", error.message);
      }

      // create PTB and execute
      if (args?.sponsor && args?.sponsor == true) {
        const sponsoredPayload =
          await this.contractCalls.closeAllPositionsAndWithdrawMarginPTB(
            delistedUserPositionsSymbols,
            args
          );

        const sponsorTxResponse = await this.signAndExecuteSponsoredTx(
          sponsoredPayload
        );

        if (sponsorTxResponse?.ok) {
          return {
            ok: true,
            code: 200,
            data: sponsorTxResponse,
            message: interpolate(
              SuccessMessages.closedDelistedPositionsAndWithdrawMargin,
              {
                amount: "all",
              }
            ),
          };
        }

        if (
          !sponsorTxResponse?.ok &&
          sponsorTxResponse?.message !== USER_REJECTED_MESSAGE
        ) {
          return this.closeAllDelistedPositionsAndWithdrawMargin({
            ...args,
            sponsor: false,
          });
        }
      }

      //unsponsored call
      return await this.contractCalls.closeAllPositionsAndWithdrawMarginPTB(
        delistedUserPositionsSymbols,
        args
      );
    } catch (e) {
      return {
        ok: false,
        code: 400,
        data: "",
        message: e.message,
      };
    }
  };

  closeAllDelistedPositionsWithdrawSwapAndDepositToPro = async (args?: {
    gasBudget?: number;
    sponsor?: boolean;
    use7k?: boolean;
    slippage?: number;
    dryRunOnly?: boolean;
    defaultSlippage?: number;
  }) => {
    try {
      //get exchange info of all markets to read the status
      const exchangeInfo = await this.getExchangeInfo();
      const delistedMarkets = filterDelistedMarkets(exchangeInfo);

      //get user positions
      const userPositions = await this.getUserPosition({});

      let delistedUserPositionsSymbols: string[] = [];
      //get delisted market positions
      //if user doesn't have positions in delisted markets, closeAllPositionsdWithdrawSwapAndDepositToProPTB internally handles not adding any close position call to PTB
      if (userPositions.data && userPositions.data.length > 0) {
        delistedUserPositionsSymbols = userPositions.data
          .filter((position) => {
            return delistedMarkets.includes(position.symbol);
          })
          .map((position) => position.symbol);
      }

      // cancel open orders for delisted markets
      try {
        await Promise.all(
          delistedMarkets.map((symbol) => this.cancelAllOpenOrders(symbol))
        );
      } catch (error) {
        // Silently handle "no orders to cancel" error and continue execution
        console.log("Error during cancellation:", error.message);
      }

      if (args?.sponsor) {
        const sponsoredPayload =
          await this.contractCalls.closeAllPositionsdWithdrawSwapAndDepositToProPTB(
            delistedUserPositionsSymbols,
            args
          );

        const sponsorTxResponse = await this.signAndExecuteSponsoredTx(
          sponsoredPayload
        );

        if (sponsorTxResponse?.ok) {
          const successMessage =
            delistedUserPositionsSymbols.length > 0
              ? interpolate(
                  SuccessMessages.closedDelistedPositionsSwapAndDepositToPro,
                  { amount: "all" }
                )
              : interpolate(SuccessMessages.withdrawAllSwapAndDepositToPro, {
                  amount: "all",
                });

          return {
            ok: true,
            code: 200,
            data: sponsorTxResponse,
            message: successMessage,
          };
        }

        if (
          !sponsorTxResponse?.ok &&
          sponsorTxResponse?.message !== USER_REJECTED_MESSAGE
        ) {
          return this.closeAllDelistedPositionsWithdrawSwapAndDepositToPro({
            ...args,
            sponsor: false,
          });
        }
      }

      return await this.contractCalls.closeAllPositionsdWithdrawSwapAndDepositToProPTB(
        delistedUserPositionsSymbols,
        args
      );
    } catch (e) {
      return {
        ok: false,
        code: 400,
        data: "",
        message: e.message,
      };
    }
  };

  withdrawAllWusdcSwapAndDepositToPro = async (args?: {
    gasBudget?: number;
    sponsor?: boolean;
    use7k?: boolean;
    slippage?: number;
    dryRunOnly?: boolean;
    defaultSlippage?: number;
  }) => {
    try {
      if (args?.sponsor) {
        const sponsoredPayload =
          await this.contractCalls.withdrawAllSwapAndDepositToProPTB(args);
        const sponsorTxResponse = await this.signAndExecuteSponsoredTx(
          sponsoredPayload
        );

        if (sponsorTxResponse?.ok) {
          return {
            ok: true,
            code: 200,
            data: sponsorTxResponse,
            message: interpolate(
              SuccessMessages.withdrawAllSwapAndDepositToPro,
              { amount: "all" }
            ),
          };
        }
        // if sponsor fails and not rejected by user, then retry with unsponsored call
        if (
          !sponsorTxResponse?.ok &&
          sponsorTxResponse?.message !== USER_REJECTED_MESSAGE
        ) {
          return this.withdrawAllWusdcSwapAndDepositToPro({
            ...args,
            sponsor: false,
          });
        }
      }

      //unsponsored call
      return await this.contractCalls.withdrawAllSwapAndDepositToProPTB(args);
    } catch (e) {
      return {
        ok: false,
        code: 400,
        data: "",
        message: e.message,
      };
    }
  };

  swapWusdcAndDepositToPro = async (
    amount: number,
    args?: {
      gasBudget?: number;
      sponsor?: boolean;
      use7k?: boolean;
      slippage?: number;
      dryRunOnly?: boolean;
      defaultSlippage?: number;
    }
  ) => {
    try {
      if (args?.sponsor) {
        const sponsoredPayload =
          await this.contractCalls.swapAndDepositToProPTB(amount, args);

        const sponsorTxResponse = await this.signAndExecuteSponsoredTx(
          sponsoredPayload
        );

        if (sponsorTxResponse?.ok) {
          return {
            ok: true,
            code: 200,
            data: sponsorTxResponse,
            message: "Swap and Deposit to Pro Successful",
          };
        }

        // if sponsor fails and not rejected by user, then retry with unsponsored call
        if (
          !sponsorTxResponse?.ok &&
          sponsorTxResponse?.message !== USER_REJECTED_MESSAGE
        ) {
          return this.swapWusdcAndDepositToPro(amount, {
            ...args,
            sponsor: false,
          });
        }
      }

      //unsponsored call
      return await this.contractCalls.swapAndDepositToProPTB(amount, args);
    } catch (e) {
      return {
        ok: false,
        code: 400,
        data: "",
        message: e.message,
      };
    }
  };

  inspectEstimatedWithdrawalAndSwapAmountFrom7k = async (args?: {
    gasBudget?: number;
    slippage?: number;
    dryRunOnly?: boolean;
    defaultSlippage?: number;
  }) => {
    // get exchange info of all markets to read the status
    const exchangeInfo = await this.getExchangeInfo();
    const delistedMarkets = filterDelistedMarkets(exchangeInfo);

    //get user positions
    const userPositions = await this.getUserPosition({});

    let delistedUserPositionsSymbols: string[] = [];
    //get delisted market positions
    //if user doesn't have positions in delisted markets, function internally handles not adding any close position call to PTB
    if (userPositions.data && userPositions.data.length > 0) {
      delistedUserPositionsSymbols = userPositions.data
        .filter((position) => {
          return delistedMarkets.includes(position.symbol);
        })
        .map((position) => position.symbol);
    }

    try {
      const response =
        await this.contractCalls.inspectEstimatedWithdrawalAndSwapAmountFrom7k(
          delistedUserPositionsSymbols,
          args
        );

      if (response.data.swaps.length == 0) {
        return {
          ok: false,
          code: 400,
          data: "",
          message: "No route found for swap",
        };
      }

      return {
        ok: true,
        code: 200,
        data: response.data,
        message: "Successfully estimated withdrawal and swap amounts",
      };
    } catch (error) {
      return {
        ok: false,
        code: 400,
        data: "",
        message:
          error?.message || "Error inspecting withdrawal and swap amounts",
      };
    }
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
    status: boolean,
    sponsorTx?: boolean
  ): Promise<ResponseSchema> => {
    if (sponsorTx) {
      const sponsorPayload = await this.contractCalls.setSubAccount(
        publicAddress,
        status,
        true
      );
      if (sponsorPayload?.ok) {
        const sponsorTxResponse = await this.signAndExecuteSponsoredTx(
          sponsorPayload
        );
        return { ok: true, data: sponsorTxResponse, message: "Success" };
      }
    } else {
      return this.contractCalls.setSubAccount(publicAddress, status, true);
    }
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
   * @param params GetOrderbookRequest
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
   * Gets if user has account value
   * @returns boolean
   */
  hasAccountValue = async (userAddress?: string) => {
    const response = await this.apiService.get<boolean>(
      SERVICE_URLS.USER.HAS_ACCOUNT_VALUE,
      { userAddress },
      { isAuthenticationRequired: false }
    );
    return response;
  };

  /**
   * @description
   * Gets verification status of user account
   * @param amount deposit amount
   * @returns verification status of user
   */
  verifyWalletStatus = async (amount: number) => {
    const response = await this.apiService.get<VerifyWalletStatusResponse>(
      SERVICE_URLS.USER.VERIFY_WALLET_STATUS,
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
   * Gets publicly available market info about market(s)
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
  affiliateLinkReferredUser = async (params: LinkReferredUserRequest) => {
    const response = await this.apiService.post<LinkReferredUserResponse>(
      SERVICE_URLS.GROWTH.AFFILIATE_LINK_REFERRED_USER,
      params,
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets referrer Info
   * @param parentAddress
   * @returns GetReferrerInfoResponse
   */

  getReferrerInfo = async (parentAddress?: string) => {
    const response = await this.apiService.get<GetReferrerInfoResponse>(
      SERVICE_URLS.GROWTH.REFERRER_INFO,
      { parentAddress },
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
   * @param parentAddress
   * @returns GetCampaignRewardsResponse
   */
  getCampaignRewards = async (campaignId: number, parentAddress?: string) => {
    const response = await this.apiService.get<GetCampaignRewardsResponse>(
      SERVICE_URLS.GROWTH.CAMPAIGN_REWARDS,
      { campaignId, parentAddress },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets affiliate payout details
   * @param campaignId
   * @param parentAddress
   * @returns Array of GetAffiliatePayoutsResponse
   */
  getAffiliatePayouts = async (campaignId: number, parentAddress?: string) => {
    const response = await this.apiService.get<GetAffiliatePayoutsResponse[]>(
      SERVICE_URLS.GROWTH.AFFILIATE_PAYOUTS,
      { campaignId, parentAddress },
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
   * Gets referree count
   * @param campaignId
   * @param parentAddress
   * @returns GetAffiliateRefereeCountResponse
   */
  getAffiliateRefereeCount = async (
    campaignId: number,
    parentAddress?: string
  ) => {
    const response =
      await this.apiService.get<GetAffiliateRefereeCountResponse>(
        SERVICE_URLS.GROWTH.AFFILIATE_REFEREES_COUNT,
        { campaignId, parentAddress },
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
  getUserRewardsSummary = async (parentAddress?: string) => {
    const response = await this.apiService.get<GetUserRewardsSummaryResponse>(
      SERVICE_URLS.GROWTH.USER_REWARDS_SUMMARY,
      { parentAddress },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets rewards overview
   * @param campaignId
   * @param parentAddress
   * @returns GetTradeAndEarnRewardsOverviewResponse
   */
  getTradeAndEarnRewardsOverview = async (
    campaignId: number,
    parentAddress?: string
  ) => {
    const response =
      await this.apiService.get<GetTradeAndEarnRewardsOverviewResponse>(
        SERVICE_URLS.GROWTH.REWARDS_OVERVIEW,
        { campaignId, parentAddress },
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
  getTotalHistoricalTradingRewards = async (parentAddress?: string) => {
    const response =
      await this.apiService.get<GetTotalHistoricalTradingRewardsResponse>(
        SERVICE_URLS.GROWTH.TOTAL_HISTORICAL_TRADING_REWARDS,
        { parentAddress },
        { isAuthenticationRequired: true }
      );
    return response;
  };

  /**
   * Gets maker rewards summary
   * @returns GetMakerRewardsSummaryResponse
   */
  getMakerRewardsSummary = async (parentAddress?: string) => {
    const response = await this.apiService.get<GetMakerRewardsSummaryResponse>(
      SERVICE_URLS.GROWTH.MAKER_REWARDS_SUMMARY,
      { parentAddress },
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
   * @returns GetUserWhiteListStatusForMarketMaker
   */
  getUserWhiteListStatusForMarketMaker = async () => {
    const response =
      await this.apiService.get<GetUserWhiteListStatusForMarketMakerResponse>(
        SERVICE_URLS.GROWTH.MAKER_WHITELIST_STATUS,
        {},
        { isAuthenticationRequired: true }
      );
    return response;
  };

  // Open referral Program
  /**
   * get open referral referee details
   * @param payload
   * @returns OpenReferralRefereeDetails
   */
  getOpenReferralRefereeDetails = async (payload: {
    cursor: string;
    pageSize: number;
    parentAddress?: string;
  }) => {
    const response = await this.apiService.get<{
      data: OpenReferralRefereeDetails;
      nextCursor: string;
      isMoreDataAvailable: boolean;
      parentAddress?: string;
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
  getOpenReferralDetails = async (payload: {
    campaignId: number;
    parentAddress?: string;
  }) => {
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
    parentAddress?: string;
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
   * @param parentAddress
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
  getOpenReferralOverview = async (parentAddress?: string) => {
    const response = await this.apiService.get<OpenReferralOverview>(
      SERVICE_URLS.GROWTH.OPEN_REFERRAL_OVERVIEW,
      { parentAddress },
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

  // Open referral Program

  //= ==============================================================//
  //                    PRIVATE HELPER FUNCTIONS
  //= ==============================================================//

  /**
   * @description
   * Initializes order signer
   * @param keypair keypair of the account to be used for placing orders
   * @returns void
   */
  private initOrderSigner = (keypair: Signer) => {
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
   * @description
   * sign transaction using wallet
   * @param tx transcation block
   * @param signer signer object
   * @returns transactionBlockBytes & signature
   * */
  private signTransactionUsingWallet = async (
    tx: TransactionBlock,
    signer: ExtendedWalletContextState
  ) => {
    try {
      return signer.signTransactionBlock({
        transactionBlock: tx,
      });
    } catch (error) {
      throwCustomError({
        error,
        code: Errors.WALLET_TRANSACTION_SIGNING_FAILED,
      });
    }
  };

  /**
   * @description
   * sign transcation using ZK
   * @param tx transcation block
   * @returns SignatureWithBytes
   * */

  private signTransactionUsingZK = async (tx: TransactionBlock) => {
    try {
      return await tx.sign({
        client: this.provider,
        signer: this.signer as Keypair,
      });
    } catch (error) {
      throwCustomError({
        error,
        code: Errors.ZK_TRANSACTION_SIGNING_FAILED,
      });
    }
  };

  /**
   * @description
   * sign transcation using keypair
   * @param txBytes transaction bytes
   * @returns SignatureWithBytes
   * */

  private signTransactionUsingKeypair = async (txBytes: Uint8Array) => {
    try {
      return await this.signer.signTransaction(txBytes);
    } catch (error) {
      throwCustomError({
        error,
        code: Errors.KEYPAIR_TRANSACTION_SIGNING_FAILED,
      });
    }
  };

  /**
   * @description
   * execute sponsored transaction block
   * @param blockTxBytes transaction bytes
   * @param signature signature
   * @param sponsorerSignature sponserer signature
   * @returns SuiTransactionBlockResponse
   * */

  private executeSponseredTransactionBlock = async (
    blockTxBytes: string,
    signature: string,
    sponsorerSignature: string
  ) => {
    try {
      return await SuiBlocks.executeSponsoredTxBlock(
        blockTxBytes,
        signature,
        sponsorerSignature,
        this.provider
      );
    } catch (error) {
      throwCustomError({
        error,
        code: Errors.EXECUTE_SPONSORED_TRANSACTION_FAILED,
      });
    }
  };

  /**
   * @description
   * build gasless transaction payload bytes
   * @param tx transcation block
   * @returns string
   * */

  private buildGaslessTxPayloadBytes = async (txb: TransactionBlock) => {
    try {
      return await SuiBlocks.buildGaslessTxPayloadBytes(txb, this.provider);
    } catch (error) {
      throwCustomError({
        error,
        code: Errors.BUILD_GASLESS_PAYLOAD_TX_PAYLOAD_BYTES_FAILED,
      });
    }
  };

  /**
   * @description
   * prompts user to sign the transaction and executes
   *  @param sponsorPayload payload from library-sui
   * @returns completed transaction
   * */
  private signAndExecuteSponsoredTx = async (
    sponsorPayload: ResponseSchema,
    execute: boolean = true
  ) => {
    const bytes = await this.buildGaslessTxPayloadBytes(sponsorPayload.data);

    const sponsorTxResponse = await this.getSponsoredTxResponse(bytes);

    const { data, ok } = sponsorTxResponse;

    if (ok && data?.data && data?.data?.txBytes) {
      const txBytes = fromBase64(data.data.txBytes);
      const txBlock = TransactionBlock.from(txBytes);

      if (this.uiWallet) {
        const signedTxb = await this.signTransactionUsingWallet(
          txBlock,
          this.signer as unknown as ExtendedWalletContextState
        );

        const { transactionBlockBytes, signature } = signedTxb;

        if (execute) {
          const executedResponse = await this.executeSponseredTransactionBlock(
            transactionBlockBytes,
            signature,
            data.data.signature
          );
          return {
            code: "Success",
            ok: true,
            data: {
              ...executedResponse,
              signedTxb: {
                ...signedTxb,
                sponsorSignature: data.data.signature,
                bytes: signedTxb?.transactionBlockBytes,
              },
            },
          };
        }
        return {
          code: "Success",
          ok: true,
          data: {
            signedTxb: {
              ...signedTxb,
              sponsorSignature: data.data.signature,
              bytes: signedTxb?.transactionBlockBytes,
            },
          },
        };
      }
      if (this.isZkLogin) {
        const signedTxb = await this.signTransactionUsingZK(txBlock);

        const { bytes, signature: userSignature } = signedTxb;

        const zkSignature = createZkSignature({
          userSignature,
          zkPayload: this.getZkPayload(),
        });

        if (execute) {
          const executedResponse = await this.executeSponseredTransactionBlock(
            bytes,
            zkSignature,
            data.data.signature
          );
          return {
            code: "Success",
            ok: true,
            data: {
              ...executedResponse,
              signedTxb: {
                sponsorSignature: data.data.signature,
              },
            },
          };
        }
        return {
          code: "Success",
          ok: true,
          data: {
            signedTxb: {
              ...signedTxb,
              sponsorSignature: data.data.signature,
              bytes: signedTxb?.bytes,
            },
          },
        };
      }
      const { signature, bytes } = await this.signTransactionUsingKeypair(
        txBytes
      );
      const executedResponse = await this.executeSponseredTransactionBlock(
        bytes,
        signature,
        data.data.signature
      );
      return {
        code: "Success",
        ok: true,
        data: {
          ...executedResponse,
          signedTxb: {
            sponsorSignature: data.data.signature,
          },
        },
      };
    }
    return {
      ok: false,
      message: "Something Went Wrong",
      data: "",
      code: 400,
    };
  };

  private signAndExecuteAdjustLeverageSponsoredTx = async (
    sponsorPayload: ResponseSchema,
    execute: boolean = true
  ): Promise<{
    code: string;
    ok: boolean;
    message: string;
    data: {
      sponsoredExecutedCallResponse?: SuiTransactionBlockResponse;
      signedTxb: {
        bytes: string;
        signature: string;
        sponsorSignature: string;
      };
    };
  }> => {
    const bytes = await SuiBlocks.buildGaslessTxPayloadBytes(
      sponsorPayload.data,
      this.provider
    );

    const sponsorTxResponse = await this.getSponsoredTxResponse(bytes);

    const { data, ok } = sponsorTxResponse;
    try {
      if (ok && data && data.data) {
        // dapi returning ok even when there's error
        const txBytes = fromBase64(data.data.txBytes);
        const txBlock = TransactionBlock.from(txBytes);

        if (this.uiWallet) {
          const signedTxb = await (
            this.signer as unknown as ExtendedWalletContextState
          ).signTransactionBlock({
            transactionBlock: txBlock,
          });
          const { transactionBlockBytes, signature } = signedTxb;
          if (execute) {
            const executedResponse = await SuiBlocks.executeSponsoredTxBlock(
              transactionBlockBytes,
              signature,
              data.data.signature,
              this.provider
            );
            return {
              code: "Success",
              ok: true,
              message: "",
              data: {
                sponsoredExecutedCallResponse: { ...executedResponse },
                signedTxb: {
                  bytes: signedTxb?.transactionBlockBytes,
                  signature: signedTxb?.signature,
                  sponsorSignature: data.data.signature,
                },
              },
            };
          }
          return {
            code: "Success",
            ok: true,
            message: "",
            data: {
              signedTxb: {
                bytes: signedTxb?.transactionBlockBytes,
                signature: signedTxb?.signature,
                sponsorSignature: data.data.signature,
              },
            },
          };
        }

        if (this.isZkLogin) {
          const tx = TransactionBlock.from(txBytes);

          const signedTxb = await tx.sign({
            client: this.provider,
            signer: this.signer as Keypair,
          });

          const { bytes, signature: userSignature } = signedTxb;

          const zkSignature = createZkSignature({
            userSignature,
            zkPayload: this.getZkPayload(),
          });

          if (execute) {
            const executedResponse = await SuiBlocks.executeSponsoredTxBlock(
              bytes,
              zkSignature,
              data.data.signature,
              this.provider
            );
            return {
              code: "Success",
              ok: true,
              message: "",
              data: {
                sponsoredExecutedCallResponse: { ...executedResponse },
                signedTxb: {
                  sponsorSignature: data.data.signature,
                  bytes,
                  signature: zkSignature,
                },
              },
            };
          }

          return {
            code: "Success",
            ok: true,
            message: "",
            data: {
              signedTxb: {
                sponsorSignature: data.data.signature,
                bytes,
                signature: zkSignature,
              },
            },
          };
        }

        // any other case
        const signedTxb = await this.signer.signTransaction(txBytes);
        if (execute) {
          const { signature, bytes } = signedTxb;
          const executedResponse = await SuiBlocks.executeSponsoredTxBlock(
            bytes,
            signature,
            data.data.signature,
            this.provider
          );
          return {
            code: "Success",
            ok: true,
            message: "",
            data: {
              sponsoredExecutedCallResponse: { ...executedResponse },
              signedTxb: {
                sponsorSignature: data.data.signature,
                bytes: signedTxb?.bytes,
                signature: signedTxb?.signature,
              },
            },
          };
        }

        return {
          code: "Success",
          ok: true,
          message: "",
          data: {
            signedTxb: {
              bytes: signedTxb?.bytes,
              signature: signedTxb?.signature,
              sponsorSignature: data.data.signature,
            },
          },
        };
      }
      // @ts-ignore
      throw new Error(sponsorTxResponse.data?.error?.message);
    } catch (e) {
      return {
        code: "Failed",
        ok: false,
        message: e.message || "Something Went Wrong",
        data: {
          signedTxb: {
            signature: "",
            bytes: "",
            sponsorSignature: "",
          },
        },
      };
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
    try {
      const response = await this.apiService.post<AuthorizeHashResponse>(
        SERVICE_URLS.USER.AUTHORIZE,
        {
          signature: signedHash,
          userAddress: this.getPublicAddress(),
          isTermAccepted: this.isTermAccepted,
        }
      );
      return response;
    } catch (error) {
      throwCustomError({ error, code: Errors.DAPI_ERROR });
    }
  };

  /**
   * @description
   * Posts signed Auth Hash to dAPI and gets token in return if signature is valid
   * @returns GetAuthHashResponse which contains auth hash to be signed
   */
  private updateLeverage = async (params: adjustLeverageRequest) => {
    const response = await this.apiService.post<AdjustLeverageResponse>(
      SERVICE_URLS.USER.ADJUST_LEVERAGE,
      {
        symbol: params.symbol,
        address: params.parentAddress || this.getPublicAddress(),
        leverage: toBigNumberStr(params.leverage),
        marginType: MARGIN_TYPE.ISOLATED,
        signedTransaction: params.signedTransaction,
        sponsorSignature: params.sponsorSignature,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * @description
   * Posts subAccount request to whitelist/remove the subaccount for One Click Trading
   * @returns SubAccountResponse containing whitelisted subaccount details
   */
  private addSubAccountFor1CT = async (params: SignedSubAccountRequest) => {
    try {
      const response = await this.apiService.post<SubAccountResponse>(
        SERVICE_URLS.USER.SUBACCOUNT_1CT,
        params,
        { isAuthenticationRequired: true }
      );
      return response;
    } catch (error) {
      throwCustomError({ error, code: Errors.DAPI_ERROR });
    }
  };

  /**
   * @description
   * Get expired 1CT subAccount list for user that are still active
   * @returns ExpiredSubAccounts1CTResponse
   */
  private getExpiredAccountsFor1CT = async () => {
    try {
      const response = await this.apiService.get<Expired1CTSubAccountsResponse>(
        SERVICE_URLS.USER.EXPIRED_SUBACCOUNT_1CT,
        null,
        { isAuthenticationRequired: true }
      );
      return response;
    } catch (error) {
      throwCustomError({ error, code: Errors.DAPI_ERROR });
    }
  };

  /**
   * @description
   * Get transcation response for sponsored payload
   * @returns SponsorTxResponse
   */
  getSponsoredTxResponse = async (txBytes) => {
    try {
      const response = await this.apiService.post<SponsorTxResponse>(
        SERVICE_URLS.USER.SPONSOR_TX,
        { txBytes },
        { isAuthenticationRequired: true }
      );
      return response;
    } catch (error) {
      throwCustomError({ error, code: Errors.DAPI_ERROR });
    }
  };

  /**
   * @description
   * Get transcation response for sponsored payload
   * @returns SponsorTxResponse
   */
  getOffchainSettlementUpdates = async (
    params: GetOffchainSettlementUpdatesRequest
  ) => {
    try {
      const response =
        await this.apiService.get<GetOffchainSettlementUpdatesResponse>(
          SERVICE_URLS.USER.OFFCHAIN_SETTLEMENT_UPDATES,
          { ...params },
          { isAuthenticationRequired: true }
        );
      return response;
    } catch (error) {
      throwCustomError({ error, code: Errors.DAPI_ERROR });
    }
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

  signAndExecuteZkTransaction = async (tx: TransactionBlock) => {
    try {
      if (!this.signer || !this.walletAddress)
        throw new Error("invalid signer or wallet address");
      if (isEmpty(this.getZkPayload())) throw new Error("invalid zk payloads");

      tx.setSender(this.walletAddress);
      const { bytes, signature: userSignature } = await tx.sign({
        client: this.provider,
        signer: this.signer as Keypair,
      });
      const zkSignature = createZkSignature({
        userSignature,
        zkPayload: this.getZkPayload(),
      });
      return this.provider.executeTransactionBlock({
        transactionBlock: bytes,
        signature: zkSignature,
        options: {
          showObjectChanges: true,
          showEffects: true,
          showEvents: true,
          showInput: true,
        },
      });
    } catch (error) {
      throw new Error(error);
    }
  };

  /**
   * transfer coin
   * @param to recipient wallet address
   * @param balance amount to transfer
   * @param coin coin to transfer
   * @returns Response Schema
   * */
  transferCoins = async (
    to: string,
    balance: number,
    coin: TRANSFERABLE_COINS
  ): Promise<ResponseSchema> => {
    return this.contractCalls.transferCoins(to, balance, coin);
  };

  /**
   * transfer coin
   * @param to recipient wallet address
   * @param balance amount to transfer
   * @param coinObject
   * @param dryRun
   * @returns Response Schema
   * */
  transferCoinObjects = async (
    to: string,
    balance: number,
    coinObject: {
      balance: string;
      coinObjectIds: string[];
      coinType: string;
      decimals: number;
    },
    dryRun = false
  ): Promise<ResponseSchema> => {
    return this.contractCalls.transferCoinObjects(
      to,
      balance,
      coinObject,
      dryRun
    );
  };

  /**
   * estimate gas for sui token transfer
   * @param to recipient wallet address
   * @param balance amount to transfer
   * @returns BigInt
   * */
  estimateGasForSuiTransfer = async (
    to: string,
    balance: number
  ): Promise<BigInt> => {
    return this.contractCalls.estimateGasForSuiTransfer(to, balance);
  };

  /**
   * estimate gas for usdc token transfer
   * @param to recipient wallet address
   * @param balance amount to transfer
   * @returns BigInt
   * */
  estimateGasForUsdcTransfer = async (
    to: string,
    balance: number
  ): Promise<BigInt> => {
    return this.contractCalls.estimateGasForUsdcTransfer(to, balance);
  };

  /// // ******************* Vault APIs *****************/////
  /**
   * @description
   * Gets deployment json from vaultConfig table
   * @returns deployment json
   * */
  private getVaultConfigsForInteractor = async (): Promise<any> => {
    try {
      if (this.network.vaultURL) {
        // Fetch data from the given URL
        const response = await this.apiService.get<any>(
          VAULT_URLS.VAULT.CONFIG,
          {},
          { isAuthenticationRequired: false },
          this.network.vaultURL
        );
        // The data property of the response object contains our configuration
        return response.data?.[0]?.config;
      }
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
   * @description
   * Gets user's vault details
   * @returns user vault details
   * */
  public getUserVaultDetails = async (
    userAddress: string,
    vaultId: string
  ): Promise<UserVaultDetail[]> => {
    try {
      // Fetch data from the given URL
      const response = await this.apiService.get<UserVaultDetail[]>(
        VAULT_URLS.USER.VAULT_USER,
        {
          userAddress,
          vaultId,
        },
        { isAuthenticationRequired: false },
        this.network.vaultURL
      );
      // The data property of the response object contains our configuration
      return response.data;
    } catch (error) {
      // If Axios threw an error, it will be stored in error.response
      if (error.response) {
        throw new Error(
          `Failed to fetch user vault detail: ${error.response.status}`
        );
      } else {
        throw new Error(`An error occurred: ${error}`);
      }
    }
  };

  /**
   * @description
   * Gets user's vault details
   * @returns user vault details
   * */
  public getVaultDetails = async (vaultId: string): Promise<VaultDetail> => {
    try {
      // Fetch data from the given URL
      const response = await this.apiService.get<VaultDetail>(
        VAULT_URLS.VAULT.DETAILS,
        {
          vaultId,
        },
        { isAuthenticationRequired: false },
        this.network.vaultURL
      );
      // The data property of the response object contains our configuration
      return response.data;
    } catch (error) {
      // If Axios threw an error, it will be stored in error.response
      if (error.response) {
        throw new Error(
          `Failed to fetch vault detail: ${error.response.status}`
        );
      } else {
        throw new Error(`An error occurred: ${error}`);
      }
    }
  };

  /**
   * @description
   * Gets vault pending withdraw requests
   * @returns pending withdraw requests
   * */
  public getPendingWithdrawRequests = async (
    vaultId: string,
    startTime?: string,
    endTime?: number
  ): Promise<UserPendingWithdrawRequest> => {
    try {
      // Fetch data from the given URL
      const response = await this.apiService.get<UserPendingWithdrawRequest>(
        VAULT_URLS.VAULT.PENDING_WITHDRAW_REQUESTS,
        { vaultId, startTime, endTime },
        { isAuthenticationRequired: false },
        this.network.vaultURL
      );
      // The data property of the response object contains our configuration
      return response.data;
    } catch (error) {
      // If Axios threw an error, it will be stored in error.response
      if (error.response) {
        throw new Error(
          `Failed to fetch vault pending withdraw requests: ${error.response.status}`
        );
      } else {
        throw new Error(`An error occurred: ${error}`);
      }
    }
  };

  /**
   * @description
   * Gets user vault details summary
   * @returns pending withdraw requests
   * */
  public getUserVaultDetailsSummary = async (
    userAddress: string
  ): Promise<UserVaultDetailSummary[]> => {
    try {
      // Fetch data from the given URL
      const response = await this.apiService.get<UserVaultDetailSummary[]>(
        VAULT_URLS.USER.VAULT_USER_SUMMARY,
        { userAddress },
        { isAuthenticationRequired: false },
        this.network.vaultURL
      );
      // The data property of the response object contains our configuration
      return response.data;
    } catch (error) {
      // If Axios threw an error, it will be stored in error.response
      if (error.response) {
        throw new Error(
          `Failed to fetch user vault summary data: ${error.response.status}`
        );
      } else {
        throw new Error(`An error occurred: ${error}`);
      }
    }
  };

  /**
   * @description
   * withdraws USDC from Vault Bank
   * @param amount amount of USDC to withdraw
   * @returns ResponseSchema
   */
  withdrawFromVault = async (
    vaultName: string,
    amount?: number
  ): Promise<ResponseSchema> => {
    if (amount) {
      return this.interactorCalls.withdrawFromVaultContractCall(
        amount,
        vaultName
      );
    }
  };

  /**
   * @description
   * deposit USDC to Vault Bank
   * @param amount amount of USDC to withdraw
   * @returns ResponseSchema
   */
  depositToVault = async (
    vaultName: string,
    amount?: number,
    coinId?: string
  ): Promise<ResponseSchema> => {
    try {
      if (amount) {
        return this.interactorCalls.depositToVaultContractCall(
          amount,
          vaultName
        );
      }
    } catch (e) {
      throw new Error(e);
    }
  };

  /**
   * @description
   * claim all vaults in batch contract call
   * @param batch array containing SignaturePayload and user's signature
   * @returns ResponseSchema
   */
  claimFromVaultBatch = async (
    batch: BatchClaimPayload[]
  ): Promise<ResponseSchema> => {
    return this.interactorCalls.claimFundsFromVaultBatchContractCall(batch);
  };

  /**
   * @description
   * claim USDC from Vault Bank
   * @param amount amount of USDC to withdraw
   * @returns ResponseSchema
   */
  claimFromVault = async (
    vaultName: string,
    signaturePayload: SignaturePayload,
    signature: string
  ): Promise<ResponseSchema> => {
    return this.interactorCalls.claimFundsFromVaultContractCall(
      vaultName,
      signaturePayload,
      signature
    );
  };

  /**
   * @description
   * claim rewards from reward pool
   * @returns ResponseSchema
   */
  claimRewards = async (
    batch: {
      payload: SignaturePayload;
      signature: string;
    }[]
  ): Promise<ResponseSchema> => {
    const response =
      await this.interactorCalls.claimRewardsFromRewardPoolContractCall(batch);

    const events = Transaction.getEvents(response.data, "RewardsClaimedEvent");
    const transformedArray = this.transformPoolId(events);

    const resp = await this.apiService.post<string>(
      SERVICE_URLS.GROWTH.MARK_STATUS_CLAIMED,
      {
        markClaimableEvent: transformedArray,
        txDigest: response.data.digest,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * @description
   * Gets vault TVL graph data
   * @returns pending withdraw requests
   * */
  public getVaultTVL = async (
    vaultName: string,
    endTime?: number,
    intervals?: Array<VaultTVLInterval>
  ): Promise<IVaultsTVLDatapointsMap> => {
    try {
      // Fetch data from the given URL
      const response = await this.apiService.get<IVaultsTVLDatapointsMap>(
        VAULT_URLS.USER.VAULT_TVL_GRAPH_DATA,
        { vaultName, endTime, intervals },
        { isAuthenticationRequired: false },
        this.network.vaultURL
      );
      // The data property of the response object contains our configuration
      return response.data;
    } catch (error) {
      // If Axios threw an error, it will be stored in error.response
      if (error.response) {
        throw new Error(
          `Failed to fetch user vault summary data: ${error.response.status}`
        );
      } else {
        throw new Error(`An error occurred: ${error}`);
      }
    }
  };

  private transformPoolId = (
    arr: { [key: string]: any }[]
  ): { [key: string]: any }[] => {
    return arr.map((obj) => {
      // Create a new object to avoid mutating the original object
      const newObj = { ...obj };

      // Check if the property exists in the object
      if (newObj.pool_id !== undefined) {
        // Rename the property
        newObj.poolID = newObj.pool_id;
        delete newObj.pool_id; // Optionally remove the old property
      }

      return newObj;
    });
  };
}
