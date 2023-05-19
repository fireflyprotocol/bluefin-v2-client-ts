import {
  address,
  ADJUST_MARGIN,
  Transaction,
} from "../../submodules/library-sui/src";
import { OnChainCalls } from "../../submodules/library-sui/src";
import {
  RawSigner,
  SignerWithProvider,
  SuiTransactionBlockResponse,
  JsonRpcProvider,
} from "@mysten/sui.js";
import {
  ResponseSchema,
  SuccessMessages,
  TransformToResponseSchema,
} from "./contractErrorHandling.service";
import { default as interpolate } from "interpolate";

export class ContractCalls {
  onChainCalls: OnChainCalls;
  signer: RawSigner;
  constructor(signer: RawSigner, rpc: JsonRpcProvider, deployment: any) {
    this.signer = signer;
    const signerWithProvider: SignerWithProvider = this.signer.connect(rpc);
    this.onChainCalls = new OnChainCalls(signerWithProvider, deployment);
  }

  withdrawFromMarginBankContractCall = async (
    amount: Number
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.withdrawFromBank(
        {
          amount: amount.toString(),
        },
        this.signer
      );
    }, interpolate(SuccessMessages.withdrawMargin, { amount }));
  };

  depositToMarginBankContractCall = async (
    amount: number,
    coinID: string
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.depositToBank(
        {
          amount: amount.toString(),
          coinID: coinID,
        },
        this.signer
      );
    }, interpolate(SuccessMessages.depositToBank, { amount }));
  };

  adjustLeverageContractCall = async (leverage: number) => {
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.adjustLeverage(
        {
          leverage: leverage,
        },
        this.signer
      );
    }, interpolate(SuccessMessages.adjustLeverage, { leverage }));
  };

  setSubAccount = async (
    publicAddress: address,
    status: boolean,
    gasLimit: number
  ) => {
    return TransformToResponseSchema(async () => {
      return await this.onChainCalls.setSubAccount(
        {
          account: publicAddress,
          status: status,
          gasBudget: gasLimit,
        },
        this.signer
      );
    }, interpolate(SuccessMessages.setSubAccounts, { publicAddress, status }));
  };

  adjustMarginContractCall = async (
    operationType: ADJUST_MARGIN,
    amount: number,
    gasLimit: number
  ) => {
    const msg =
      operationType == ADJUST_MARGIN.Add
        ? interpolate(SuccessMessages.adjustMarginAdd, { amount })
        : interpolate(SuccessMessages.adjustMarginRemove, { amount });
    return TransformToResponseSchema(async () => {
      if (operationType == ADJUST_MARGIN.Add) {
        return await this.onChainCalls.addMargin(
          {
            amount: amount,
            gasBudget: gasLimit,
          },
          this.signer
        );
      } else {
        return await this.onChainCalls.removeMargin(
          {
            amount: amount,
            gasBudget: gasLimit,
          },
          this.signer
        );
      }
    }, msg);
  };
}
