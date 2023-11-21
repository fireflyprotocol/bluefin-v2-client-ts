import {
  address,
  ADJUST_MARGIN,
  Transaction,
  OnChainCalls,
  toBigNumberStr,
  toBaseNumber,
  SuiClient,
  Keypair,
} from "@firefly-exchange/library-sui";
import interpolate from "interpolate";
import { ExtendedWalletContextState } from "../interfaces/routes";
import {
  ResponseSchema,
  SuccessMessages,
  TransformToResponseSchema,
} from "./contractErrorHandling.service";

export class ContractCalls {
  onChainCalls: OnChainCalls;

  signer: Keypair;
  suiClient: SuiClient;
  marginBankId: string | undefined;

  constructor(signer: Keypair, deployment: any, provider: SuiClient) {
    this.signer = signer;
    this.suiClient = provider;
    this.onChainCalls = new OnChainCalls(
      this.signer,
      deployment,
      "",
      this.suiClient
    );

  }

  /**
   * @param amount the amount to withdraw
   * @returns ResponseSchema
   * @description
   * Withdraws funds from the margin bank contract
   * */
  withdrawFromMarginBankContractCall = async (
    amount: Number
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      const tx = await this.onChainCalls.withdrawFromBank(
        {
          amount: toBigNumberStr(amount.toString(), 6),
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
   * @returns ResponseSchema
   * @description
   * Withdraws all funds from the margin bank contract
   * */
  withdrawAllFromMarginBankContractCall = async (): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.withdrawAllMarginFromBank(this.signer);
    }, interpolate(SuccessMessages.withdrawMargin, { amount: "all" }));
  };

  /**
   * @param amount the amount to deposit
   * @param coinID the coinID to deposit
   * @returns ResponseSchema
   * @description
   * Deposits funds to the margin bank contract
   * */
  depositToMarginBankContractCall = async (
    amount: number,
    coinID: string
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      console.log(typeof (this.signer) == typeof (Keypair))
      const tx = await this.onChainCalls.depositToBank(
        {
          amount: toBigNumberStr(amount.toString(), 6),
          coinID,
          bankID: this.onChainCalls.getBankID(),
          accountAddress: await (
            this.signer as any as ExtendedWalletContextState
          ).getAddress(),
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
   * @param leverage the leverage to set
   * @param symbol the position's market symbol
   * @returns ResponseSchema
   * @description
   * adjusts the leverage of the desiered position
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
          account: parentAddress ||  await (
            this.signer as any as ExtendedWalletContextState
          ).getAddress(),
          market: symbol,
        },
        this.signer
      );
    }, interpolate(SuccessMessages.adjustLeverage, { leverage }));
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
        account: parentAddress || (await this.signer.getPublicKey().toSuiAddress()),
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
   * @param publicAddress the sub account's public address
   * @param status the status to set for sub account true = add, false = remove
   * @returns ResponseSchema
   * @description
   * closes the desiered position
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
   * @param symbol the position's market symbol
   * @operationType the operation type to perform (add or remove)
   * @amount the amount to add or remove
   * @returns Response Schemea
   * @description
   * adjusts the margin of the desiered position
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
          },
          this.signer
        );
      }
      return await this.onChainCalls.removeMargin(
        {
          amount,
          perpID: perpId,
          market: symbol,
        },
        this.signer
      );
    }, msg);
  };

  /**
   * @returns number
   * @description
   * Get the margin bank balance
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
}
