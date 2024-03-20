import {
  address,
  ADJUST_MARGIN,
  OnChainCalls,
  SuiClient,
  SuiTransactionBlockResponse,
  toBaseNumber,
  toBigNumberStr,
  Transaction,
  TRANSFERABLE_COINS,
  ZkPayload,
} from "@firefly-exchange/library-sui";
import { Signer } from "@mysten/sui.js/cryptography";
import interpolate from "interpolate";
import {
  ResponseSchema,
  SuccessMessages,
  TransformToResponseSchema,
} from "./contractErrorHandling.service";

export class ContractCalls {
  onChainCalls: OnChainCalls;
  signer: Signer;
  suiClient: SuiClient;
  marginBankId: string | undefined;
  walletAddress: string;
  is_wallet_extension: boolean;

  constructor(
    signer: Signer,
    deployment: any,
    provider: SuiClient,
    is_zkLogin: boolean,
    zkPayload?: ZkPayload,
    walletAddress?: string,
    is_wallet_extension?: boolean
  ) {
    this.signer = signer;
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
  }

  /**
   * Withdraws funds from the margin bank contract
   * @param amount the amount to withdraw
   * @returns ResponseSchema
   * */
  withdrawFromMarginBankContractCall = async (
    amount: Number
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      const tx = await this.onChainCalls.withdrawFromBank(
        {
          amount: toBigNumberStr(amount.toString(), 6),
          accountAddress: this.walletAddress,
        },
        this.signer
      );
      if (tx && !this.marginBankId) {
        this.marginBankId = Transaction.getBankAccountID(tx);
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
      return await this.onChainCalls.withdrawAllMarginFromBank(
        this.signer,
        this.walletAddress
      );
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
    getPublicAddress: () => address
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      const tx = await this.onChainCalls.depositToBank(
        {
          amount: toBigNumberStr(amount.toString(), 6),
          coinID,
          bankID: this.onChainCalls.getBankID(),
          accountAddress: this.walletAddress || getPublicAddress(),
        },
        this.signer
      );
      if (tx && !this.marginBankId) {
        this.marginBankId = Transaction.getBankAccountID(tx);
      }
      return tx;
    }, interpolate(SuccessMessages.depositToBank, { amount }));
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
    parentAddress?: string
  ): Promise<ResponseSchema> => {
    const perpId = this.onChainCalls.getPerpetualID(symbol);
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.adjustLeverage(
        {
          leverage,
          perpID: perpId,
          account: parentAddress || this.walletAddress,
          market: symbol,
        },
        this.signer
      );
    }, interpolate(SuccessMessages.adjustLeverage, { leverage }));
  };

  adjustLeverageContractCallRawTransaction = async (
    leverage: number,
    symbol: string,
    getPublicAddress: () => address,
    parentAddress?: string
  ): Promise<string> => {
    const perpId = this.onChainCalls.getPerpetualID(symbol);
    const signedTx = await this.onChainCalls.signAdjustLeverage(
      {
        leverage,
        perpID: perpId,
        account: parentAddress || getPublicAddress(),
        market: symbol,
      },
      this.signer
    );

    //serialize
    const separator = "||||"; // Choose a separator that won't appear in txBytes or signature
    const combinedData = `${signedTx.bytes}${separator}${signedTx.signature}`;

    // Encode to hex for transmission
    const encodedData = Buffer.from(combinedData, "utf-8").toString("hex");

    return encodedData;
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
    gasBudget?: number
  ): Promise<string> => {
    const signedTx = await this.onChainCalls.signUpsertSubAccount(
      {
        account,
        accountsToRemove,
        subAccountsMapID,
        gasBudget,
      },
      this.signer
    );

    //serialize
    const separator = "||||"; // Choose a separator that won't appear in txBytes or signature
    const combinedData = `${signedTx.bytes}${separator}${signedTx.signature}`;

    // Encode to hex for transmission
    const encodedData = Buffer.from(combinedData, "utf-8").toString("hex");
    return encodedData;
  };

  /**
   * closes the desiered position
   * @param publicAddress the sub account's public address
   * @param status the status to set for sub account true = add, false = remove
   * @returns ResponseSchema
   * */

  setSubAccount = async (
    publicAddress: address,
    status: boolean
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.setSubAccount(
        {
          account: publicAddress,
          status,
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
    amount: number
  ): Promise<ResponseSchema> => {
    const perpId = this.onChainCalls.getPerpetualID(symbol);
    const msg =
      operationType == ADJUST_MARGIN.Add
        ? interpolate(SuccessMessages.adjustMarginAdd, { amount })
        : interpolate(SuccessMessages.adjustMarginRemove, { amount });
    return TransformToResponseSchema(async () => {
      if (operationType === ADJUST_MARGIN.Add) {
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
      return await this.onChainCalls.removeMargin(
        {
          amount,
          perpID: perpId,
          market: symbol,
          account: this.walletAddress,
        },
        this.signer
      );
    }, msg);
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
}
