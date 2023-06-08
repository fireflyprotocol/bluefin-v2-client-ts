import {
  address,
  ADJUST_MARGIN,
  Transaction,
  OnChainCalls,
  toBigNumberStr,
  toBaseNumber,
} from "../../submodules/library-sui";
import { RawSigner, SignerWithProvider, JsonRpcProvider } from "@mysten/sui.js";
import {
  ResponseSchema,
  SuccessMessages,
  TransformToResponseSchema,
} from "./contractErrorHandling.service";
import { default as interpolate } from "interpolate";

export class ContractCalls {
  onChainCalls: OnChainCalls;
  signer: RawSigner;
  marginBankId: string | undefined;
  defaultGas: number = 100000000;
  constructor(signer: RawSigner, rpc: JsonRpcProvider, deployment: any) {
    this.signer = signer;
    const signerWithProvider: SignerWithProvider = this.signer.connect(rpc);
    this.onChainCalls = new OnChainCalls(signerWithProvider, deployment);
  }

  /**
   * @param amount the amount to withdraw
   * @param gasLimit (optional) the gas limit for the transaction
   * @returns ResponseSchema
   * @description
   * Withdraws funds from the margin bank contract
   * */
  withdrawFromMarginBankContractCall = async (
    amount: Number,
    gasLimit?: number
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      const tx = await this.onChainCalls.withdrawFromBank(
        {
          amount: toBigNumberStr(amount.toString(), 6),
          gasBudget: gasLimit || this.defaultGas,
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
   * @param gasLimit (optional) the gas limit for the transaction
   * @returns ResponseSchema
   * @description
   * Withdraws all funds from the margin bank contract
   * */
  withdrawAllFromMarginBankContractCall = async (
    gasLimit?: number
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.withdrawAllMarginFromBank(
        this.signer,
        gasLimit || this.defaultGas
      );
    }, interpolate(SuccessMessages.withdrawMargin, { amount: "all" }));
  };

  /**
   * @param amount the amount to deposit
   * @param coinID the coinID to deposit
   * @param gasLimit (optional) the gas limit for the transaction
   * @returns ResponseSchema
   * @description
   * Deposits funds to the margin bank contract
   **/
  depositToMarginBankContractCall = async (
    amount: number,
    coinID: string,
    gasLimit?: number
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      const tx = await this.onChainCalls.depositToBank(
        {
          amount: toBigNumberStr(amount.toString(), 6),
          coinID: coinID,
          bankID: this.onChainCalls.getBankID(),
          accountAddress: await this.signer.getAddress(),
          gasBudget: gasLimit || this.defaultGas,
        },
        this.signer
      );
      if (tx && !this.marginBankId) {
        this.marginBankId = Transaction.getBankAccountID(tx);
      }
      return tx;
    }, interpolate(SuccessMessages.depositToBank, { amount: amount }));
  };

  /**
   * @param leverage the leverage to set
   * @param symbol the position's market symbol
   * @param gasLimit (optional) the gas limit for the transaction
   * @returns ResponseSchema
   * @description
   * adjusts the leverage of the desiered position
   * */

  adjustLeverageContractCall = async (
    leverage: number,
    symbol: string,
    parentAddress?: string,
    gasLimit?: number
  ): Promise<ResponseSchema> => {
    const perpId = this.onChainCalls.getPerpetualID(symbol);
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.adjustLeverage(
        {
          leverage: leverage,
          perpID: perpId,
          account: parentAddress
            ? parentAddress
            : await this.signer.getAddress(),
          gasBudget: gasLimit || this.defaultGas,
        },
        this.signer
      );
    }, interpolate(SuccessMessages.adjustLeverage, { leverage }));
  };

  /**
   * @param publicAddress the sub account's public address
   * @param status the status to set for sub account true = add, false = remove
   * @param gasLimit (optional) the gas limit for the transaction
   * @returns ResponseSchema
   * @description
   * closes the desiered position
   * */

  setSubAccount = async (
    publicAddress: address,
    status: boolean,
    gasLimit?: number
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.setSubAccount(
        {
          account: publicAddress,
          status: status,
          gasBudget: gasLimit || this.defaultGas,
        },
        this.signer
      );
    }, interpolate(SuccessMessages.setSubAccounts, { address: publicAddress, status: status ? "added" : "removed" }));
  };

  /**
   * @param symbol the position's market symbol
   * @operationType the operation type to perform (add or remove)
   * @amount the amount to add or remove
   * @param gasLimit (optional) the gas limit for the transaction
   * @returns Response Schemea
   * @description
   * adjusts the margin of the desiered position
   * */
  adjustMarginContractCall = async (
    symbol: string,
    operationType: ADJUST_MARGIN,
    amount: number,
    gasLimit?: number
  ): Promise<ResponseSchema> => {
    const perpId = this.onChainCalls.getPerpetualID(symbol);
    const msg =
      operationType == ADJUST_MARGIN.Add
        ? interpolate(SuccessMessages.adjustMarginAdd, { amount })
        : interpolate(SuccessMessages.adjustMarginRemove, { amount });
    return TransformToResponseSchema(async () => {
      if (operationType == ADJUST_MARGIN.Add) {
        return await this.onChainCalls.addMargin(
          {
            amount: amount,
            perpID: perpId,
            gasBudget: gasLimit || this.defaultGas,
          },
          this.signer
        );
      } else {
        return await this.onChainCalls.removeMargin(
          {
            amount: amount,
            gasBudget: gasLimit,
            perpID: perpId,
          },
          this.signer
        );
      }
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
    } else {
      return 0;
    }
  };
}
