import {
  address,
  ADJUST_MARGIN,
  OnChainCalls,
  SignatureWithBytes,
  SuiClient,
  SuiTransactionBlockResponse,
  toBaseNumber,
  toBigNumberStr,
  Transaction,
  TransactionBlock,
  TRANSFERABLE_COINS,
  ZkPayload,
} from "@firefly-exchange/library-sui";
import { Signer } from "@mysten/sui/cryptography";
import interpolate from "interpolate";
import {
  ResponseSchema,
  SuccessMessages,
  TransformToResponseSchema,
} from "./contractErrorHandling.service";
import {
  combineAndEncode,
  getProDeploymentConfig,
  getSpotDeploymentConfig,
  isMainnet,
  throwCustomError,
} from "../../utils/utils";
import { Errors } from "../constants";
import { UserCalls as ProUserOnChainCalls } from "@firefly-exchange/library-sui/dist/src/v3/on-chain-calls/user";
import { IDeployment } from "@firefly-exchange/library-sui/dist/src/v3";
import {
  IBluefinSpotContracts,
  OnChainCalls as OnChainCallsSwap,
} from "@firefly-exchange/library-sui/dist/src/spot";
import { ExtendedNetwork } from "../interfaces/routes";
export class ContractCalls {
  onChainCalls: OnChainCalls;

  signer: Signer;

  suiClient: SuiClient;

  marginBankId: string | undefined;

  walletAddress: string;

  is_wallet_extension: boolean;

  network: ExtendedNetwork;

  spotOnchain: OnChainCallsSwap;

  proOnchain: ProUserOnChainCalls;

  constructor(
    signer: Signer,
    deployment: any,
    provider: SuiClient,
    network: ExtendedNetwork,
    is_zkLogin: boolean,
    zkPayload?: ZkPayload,
    walletAddress?: string,
    is_wallet_extension?: boolean
  ) {
    this.suiClient = provider;
    this.signer = signer;
    this.signer.toSuiAddress = this.signer.toSuiAddress
      ? this.signer.toSuiAddress
      : // @ts-ignore
        () => this.signer.address;

    this.walletAddress = walletAddress || signer.toSuiAddress();
    this.is_wallet_extension = is_wallet_extension;
    this.onChainCalls = new OnChainCalls(
      this.signer,
      deployment,
      provider,
      is_zkLogin,
      zkPayload,
      walletAddress,
      is_wallet_extension
    );
    this.network = network;

    // setup pro and spot onchain calls
    const isProd = isMainnet(this.network);
    const networkName = isProd ? "mainnet" : "testnet";
    const spotDeploymentConfig: IBluefinSpotContracts = getSpotDeploymentConfig(
      this.network
    );
    const proDeploymentConfig: IDeployment = getProDeploymentConfig(
      this.network
    );

    this.spotOnchain = new OnChainCallsSwap(
      this.suiClient,
      spotDeploymentConfig,
      {
        signer: this.signer,
        address: this.walletAddress,
        isUIWallet: this.is_wallet_extension,
        isZkLogin: is_zkLogin,
        zkPayload,
      }
    );
    this.proOnchain = new ProUserOnChainCalls(
      networkName,
      this.suiClient,
      proDeploymentConfig,
      this.signer,
      this.walletAddress
    );
  }

  /**
   * Withdraws funds from the margin bank contract
   * @param amount the amount to withdraw
   * @returns ResponseSchema
   * */
  withdrawFromMarginBankContractCall = async (
    amount: Number,
    sponsor?: boolean
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      const tx = await this.onChainCalls.withdrawFromBank(
        {
          amount: toBigNumberStr(amount.toString(), 6),
          accountAddress: this.walletAddress,
          sponsor,
        },
        this.signer
      );

      if (tx && !this.marginBankId) {
        if (sponsor) {
          // TODO: fix marginBankId if sponsor
          this.marginBankId = Transaction.getBankAccountID(
            tx as SuiTransactionBlockResponse
          );
        } else {
          this.marginBankId = Transaction.getBankAccountID(
            tx as SuiTransactionBlockResponse
          );
        }
      }
      return tx;
    }, interpolate(SuccessMessages.withdrawMargin, { amount }));
  };

  /**
   * Withdraws all funds from the margin bank contract
   * @returns ResponseSchema
   * */
  withdrawAllFromMarginBankContractCall = async (): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      const r = await this.onChainCalls.withdrawAllMarginFromBank(
        this.signer,
        this.walletAddress
      );
      return r;
    }, interpolate(SuccessMessages.withdrawMargin, { amount: "all" }));
  };

  /**
   * Deposits funds to the margin bank contract
   * @param amount the amount to deposit
   * @param coinID the coinID to deposit
   * @returns ResponseSchema
   * */
  depositToMarginBankContractCall = async (
    amount: number,
    coinID: string,
    getPublicAddress: () => address,
    sponsor?: boolean
  ): Promise<ResponseSchema> => {
    try {
      return TransformToResponseSchema(async () => {
        const tx = await this.onChainCalls.depositToBank(
          {
            amount: toBigNumberStr(amount.toString(), 6),
            coinID,
            bankID: this.onChainCalls.getBankID(),
            accountAddress: this.walletAddress || getPublicAddress(),
            sponsor,
          },
          this.signer
        );
        if (tx && !this.marginBankId) {
          if (sponsor) {
            this.marginBankId = Transaction.getBankAccountID(
              tx as SuiTransactionBlockResponse
            );
          } else {
            this.marginBankId = "";
          }
        }
        return tx;
      }, interpolate(SuccessMessages.depositToBank, { amount }));
    } catch (error) {
      throwCustomError({
        error,
        code: Errors.DEPOSIT_TO_BANK_CONTRACT_CALL_FAILED,
      });
    }
  };

  /**
   * Deposits funds to the margin bank contract
   * @param amount the amount to deposit
   * @returns ResponseSchema
   * */
  getUSDCHavingBalance = async (amount: number) => {
    try {
      return await this.onChainCalls.getUSDCoinHavingBalance(
        {
          amount,
          address: this.walletAddress,
        },
        this.signer
      );
    } catch (error) {
      throwCustomError({
        error,
        code: Errors.FAILED_TO_FETCH_USDC_COIN_HAVING_BALANCE,
      });
    }
  };

  /**
   * Deposits funds to the margin bank contract
   * @param walletAddress user wallet address
   * @returns ResponseSchema
   * */
  getUSDCCoins = async (walletAddress: string) => {
    try {
      return await this.onChainCalls.getUSDCCoins(
        { address: walletAddress },
        this.signer
      );
    } catch (error) {
      throwCustomError({
        error,
        code: Errors.FAILED_TO_FETCH_USDC_COINS,
      });
    }
  };

  /**
   * Deposits funds to the margin bank contract
   * @param sponsor is the tx sponsored or not
   * @returns ResponseSchema
   * */
  mergeAllUSDCCOins = async (sponsor?: boolean) => {
    try {
      return await this.onChainCalls.mergeAllUsdcCoins(
        this.onChainCalls.getCoinType(),
        this.signer,
        this.walletAddress,
        sponsor
      );
    } catch (error) {
      throwCustomError({
        error,
        code: Errors.FAILED_TO_MERGE_USDC_COINS,
      });
    }
  };

  /**
   * adjusts the leverage of the desiered position
   * @param leverage the leverage to set
   * @param symbol the position's market symbol
   * @returns ResponseSchema
   * */
  adjustLeverageContractCall = async (
    leverage: number,
    symbol: string,
    parentAddress?: string,
    sponsorTx?: boolean
  ): Promise<ResponseSchema> => {
    const perpId = this.onChainCalls.getPerpetualID(symbol);
    return TransformToResponseSchema(
      async () => {
        return await this.onChainCalls.adjustLeverage(
          {
            leverage,
            perpID: perpId,
            account: parentAddress || this.walletAddress,
            market: symbol,
            sponsor: sponsorTx,
          },
          this.signer
        );
      },
      interpolate(SuccessMessages.adjustLeverage, { leverage }),
      sponsorTx
    );
  };

  adjustLeverageContractCallRawTransaction = async (
    leverage: number,
    symbol: string,
    parentAddress?: string
  ): Promise<string> => {
    const perpId = this.onChainCalls.getPerpetualID(symbol);
    const signedTx = await this.onChainCalls.signAdjustLeverage(
      {
        leverage,
        perpID: perpId,
        account: parentAddress || this.walletAddress,
        market: symbol,
      },
      this.signer
    );

    return combineAndEncode({
      bytes: signedTx.bytes,
      signature: signedTx.signature,
    });
  };

  /**
   * This method return the signed Transaction for adding/removing the subaccount(s) on chain
   * @param account The sub account address
   * @param accountsToRemove The array of sub account addresses that need to be removed on-chain (optional param)
   * @param subAccountsMapID The id of the chain object that holds subaccounts mapping (optional param)
   * @param gasBudget The gas budget to be passed to execute the on-chain transaction (optional param)
   * @returns string
   * */
  upsertSubAccountContractCallRawTransaction = async (
    account: string,
    accountsToRemove?: Array<string>,
    subAccountsMapID?: string,
    gasBudget?: number,
    sponsor?: boolean
  ): Promise<string | TransactionBlock> => {
    try {
      const signedTx = await this.onChainCalls.signUpsertSubAccount(
        {
          account,
          accountsToRemove,
          subAccountsMapID,
          gasBudget,
          sponsor,
        },
        this.signer
      );

      if (sponsor) {
        return signedTx as unknown as TransactionBlock;
      }

      return combineAndEncode(signedTx as SignatureWithBytes);
    } catch (error) {
      throwCustomError({
        error,
        code: Errors.SIGN_UPSERT_SUB_ACCOUNT_CONTRACT_CALLED_FAILED,
      });
    }
  };

  /**
   * closes the desiered position
   * @param publicAddress the sub account's public address
   * @param status the status to set for sub account true = add, false = remove
   * @returns ResponseSchema
   * */

  setSubAccount = async (
    publicAddress: address,
    status: boolean,
    sponsor?: boolean
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.setSubAccount(
        {
          account: publicAddress,
          status,
          sponsor,
        },
        this.signer
      );
    }, interpolate(SuccessMessages.setSubAccounts, { address: publicAddress, status: status ? "added" : "removed" }));
  };

  /**
   * adjusts the margin of the desiered position
   * @param symbol the position's market symbol
   * @operationType the operation type to perform (add or remove)
   * @amount the amount to add or remove
   * @returns Response Schemea
   * */
  adjustMarginContractCall = async (
    symbol: string,
    operationType: ADJUST_MARGIN,
    amount: number,
    sponsorTx?: boolean
  ): Promise<ResponseSchema> => {
    const perpId = this.onChainCalls.getPerpetualID(symbol);
    const msg =
      operationType === ADJUST_MARGIN.Add
        ? interpolate(SuccessMessages.adjustMarginAdd, { amount })
        : interpolate(SuccessMessages.adjustMarginRemove, { amount });
    return TransformToResponseSchema(
      async () => {
        if (operationType === ADJUST_MARGIN.Add) {
          if (sponsorTx) {
            return this.onChainCalls.addMargin(
              {
                amount,
                perpID: perpId,
                market: symbol,
                account: this.walletAddress,
                sponsor: true,
              },
              this.signer
            );
          }
          return this.onChainCalls.addMargin(
            {
              amount,
              perpID: perpId,
              market: symbol,
              account: this.walletAddress,
            },
            this.signer
          );
        }
        if (sponsorTx) {
          return this.onChainCalls.removeMargin(
            {
              amount,
              perpID: perpId,
              market: symbol,
              account: this.walletAddress,
              sponsor: true,
            },
            this.signer
          );
        }
        return this.onChainCalls.removeMargin(
          {
            amount,
            perpID: perpId,
            market: symbol,
            account: this.walletAddress,
          },
          this.signer
        );
      },
      msg,
      sponsorTx
    );
  };

  /**
   * Get the margin bank balance
   * @returns number
   * */
  getMarginBankBalance = async (): Promise<number> => {
    if (this.marginBankId) {
      return toBaseNumber(
        (
          await this.onChainCalls.getBankAccountDetailsUsingID(
            this.marginBankId
          )
        ).balance
      );
    }
    return 0;
  };

  /**
   * transfer coins
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
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.transferCoins(
        {
          to,
          balance,
          coin,
        },
        this.signer
      );
    }, interpolate(SuccessMessages.transferCoins, { balance, coin, walletAddress: to }));
  };

  /**
   * transfer coins
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
    return TransformToResponseSchema(async () => {
      return this.onChainCalls.transferCoinObjects(
        to,
        balance,
        coinObject,
        this.signer,
        dryRun
      );
    }, interpolate(SuccessMessages.transferCoins, { balance, coinObject, walletAddress: to }));
  };

  /**
   * estimate gas for sui token transfer
   * @param to recipient wallet address
   * @param balance SUI amount to transfer
   * @returns Response Schema
   * */

  estimateGasForSuiTransfer = async (
    to: string,
    balance: number
  ): Promise<BigInt> => {
    return await this.onChainCalls.estimateGasForSuiTransfer({
      to,
      balance,
    });
  };

  /**
   * esimate gas for USDC token transfer
   * @param to recipient wallet address
   * @param balance USDC amount to transfer
   * @returns Response Schema
   * */

  estimateGasForUsdcTransfer = async (
    to: string,
    balance: number
  ): Promise<BigInt> => {
    return await this.onChainCalls.estimateGasForUSDCTransfer({
      to,
      balance,
    });
  };

  /**
   * fetch user sui balance
   * @param walletAddress wallet address of the user
   * @returns string
   * */

  getSUIBalance = async (walletAddress?: string): Promise<string> => {
    return await this.onChainCalls.getUserSuiBalance(walletAddress);
  };

  closeAllPositionsAndWithdrawMarginPTB = async (
    delistedMarketPositions: string[],
    args?: {
      gasBudget?: number;
      sponsor?: boolean;
      dryRunOnly?: boolean;
    }
  ) => {
    return TransformToResponseSchema(
      async () => {
        try {
          return await this.onChainCalls.closeAllPositionsAndWithdrawMarginPTB(
            delistedMarketPositions,
            this.walletAddress || this.signer.toSuiAddress(),
            args
          );
        } catch (error) {
          return error;
        }
      },
      interpolate(SuccessMessages.closedDelistedPositionsAndWithdrawMargin, {
        amount: "all",
      }),
      args?.sponsor
    );
  };
  closeAllPositionsdWithdrawSwapAndDepositToProPTB = async (
    delistedMarketPositions: string[],
    args?: {
      gasBudget?: number;
      sponsor?: boolean;
      use7k?: boolean;
      slippage?: number;
      dryRunOnly?: boolean;
      defaultSlippage?: number;
    }
  ) => {
    const successMessage = delistedMarketPositions.length > 0 ? interpolate(SuccessMessages.closedDelistedPositionsSwapAndDepositToPro, { amount: "all" }) : interpolate(SuccessMessages.withdrawAllSwapAndDepositToPro, { amount: "all" });
    return TransformToResponseSchema(
      async () => {
        try {
          return await this.onChainCalls.closeAllPositionsWithdrawSwapAndDepositToProPTB(
            delistedMarketPositions,
            this.spotOnchain,
            this.proOnchain,
            this.walletAddress || this.signer.toSuiAddress(),
            args
          );
        } catch (error) {
          return error;
        }
      },
      successMessage,
      args?.sponsor
    );
  };

  withdrawAllSwapAndDepositToProPTB = async (args?: {
    gasBudget?: number;
    sponsor?: boolean;
    use7k?: boolean;
    slippage?: number;
    dryRunOnly?: boolean;
    defaultSlippage?: number;
  }) => {
    return TransformToResponseSchema(
      async () => {
        try {
          return await this.onChainCalls.withdrawAllSwapAndDepositToProPTB(
            this.spotOnchain,
            this.proOnchain,
            this.walletAddress || this.signer.toSuiAddress(),
            args
          );
        } catch (error) {
          return error;
        }
      },
      interpolate(SuccessMessages.withdrawAllSwapAndDepositToPro, { amount: "all" }),
      args?.sponsor
    );
  };

  swapAndDepositToProPTB = async (
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
    return TransformToResponseSchema(
      async () => {
        try {
          return await this.onChainCalls.swapAndDepositToProPTB(
            amount,
            this.spotOnchain,
            this.proOnchain,
            this.walletAddress || this.signer.toSuiAddress(),
            args
          );
        } catch (error) {
          return error;
        }
      },
      interpolate(SuccessMessages.swapAndDepositToPro, { amount }),
      args?.sponsor
    );
  };
}
