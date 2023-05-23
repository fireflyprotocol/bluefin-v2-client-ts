import {
  address,
  ADJUST_MARGIN,
  Transaction,
} from "../../submodules/library-sui/src";
import { OnChainCalls } from "../../submodules/library-sui/src";
import { RawSigner, SignerWithProvider, JsonRpcProvider } from "@mysten/sui.js";
import {
  ResponseSchema,
  SuccessMessages,
  TransformToResponseSchema,
} from "./contractErrorHandling.service";
import { default as interpolate } from "interpolate";
import { toBigNumberStr, toBaseNumber } from "../../submodules/library-sui";

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

  adjustLeverageContractCall = async (
    leverage: number,
    symbol: string,
    parentAddress?: string,
    gasLimit?: number
  ) => {
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

  adjustMarginContractCall = async (
    symbol: string,
    operationType: ADJUST_MARGIN,
    amount: number,
    gasLimit?: number
  ) => {
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

  getMarginBankBalance = async (): Promise<number> => {
    if (this.marginBankId) {
      return toBaseNumber(
        (await this.onChainCalls.getBankAccountDetails(this.marginBankId))
          .balance
      );
    } else {
      return 0;
    }
  };
}
