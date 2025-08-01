import {
  BigNumberable,
  SuiClient,
  ZkPayload,
  bnToBaseStr,
} from "@firefly-exchange/library-sui";
import {
  Interactor,
  SignaturePayload,
} from "@firefly-exchange/library-sui/blv";
import interpolate from "interpolate";

import { Signer } from "@mysten/sui/cryptography";
import {
  ResponseSchema,
  SuccessMessages,
  TransformToResponseSchema,
} from "./contractErrorHandling.service";
import { BatchClaimPayload } from "../interfaces/routes";

export class InteractorCalls {
  InteractorCalls: Interactor;

  signer: Signer;

  suiClient: SuiClient;

  constructor(
    signer: Signer,
    deployment: any,
    provider: SuiClient,
    isWalletExtension: boolean,
    isZKLogin?: boolean,
    zkPayload?: ZkPayload,
    walletAddress?: string
  ) {
    this.signer = signer;
    this.InteractorCalls = new Interactor(
      provider,
      deployment,
      this.signer,
      isWalletExtension,
      isZKLogin,
      zkPayload,
      walletAddress
    );
  }

  // /**
  //  * @param amount the amount to withdraw
  //  * @param vaultName name of the vault to claim funds from
  //  * @returns ResponseSchema
  //  * @description
  //  * Withdraws funds from the vault
  //  * */
  withdrawFromVaultContractCall = async (
    amount: BigNumberable,
    vaultName: string
  ): Promise<ResponseSchema> => {
    const symbol = vaultName.toLowerCase().includes("blue") ? "BLUE" : "USDC";
    return TransformToResponseSchema(async () => {
      const tx = await this.InteractorCalls.requestWithdrawFromVault(
        vaultName,
        amount
      );

      return tx;
    }, interpolate(SuccessMessages.withdrawFundsFromVault, { amount, symbol }));
  };

  // /**
  //  * @param amount the amount to deposit
  //  * @param vaultName name of the vault to claim funds from
  //  * @returns ResponseSchema
  //  * @description
  //  * Deposit funds to vault
  //  * */
  depositToVaultContractCall = async (
    amount: BigNumberable,
    vaultName: string,
    options?: {
      receiver?: string;
      coinId?: string;
    }
  ): Promise<ResponseSchema> => {
    const symbol = vaultName.toLowerCase().includes("blue") ? "BLUE" : "USDC";

    return TransformToResponseSchema(async () => {
      const tx = await this.InteractorCalls.depositToVault(
        vaultName,
        amount,
        options
      );

      return tx;
    }, interpolate(SuccessMessages.depositToVault, { amount, symbol }));
  };

  // /**
  //  * @param vaultName name of the vault to claim funds from
  //  * @param signaturePayload payload with claim data
  //  * @param signature signature for claim data
  //  * @returns ResponseSchema
  //  * @description
  //  * Withdraws funds from the margin bank contract
  //  * */
  claimFundsFromVaultContractCall = async (
    vaultName: string,
    signaturePayload: SignaturePayload,
    signature: string
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      const tx = await this.InteractorCalls.claimFunds(
        vaultName,
        { ...signaturePayload, expiry: "0" },
        signature
      );

      return tx;
    }, interpolate(SuccessMessages.claimFundsFromVault, {}));
  };

  // /**
  //  * @param signaturePayload payload with claim data
  //  * @param signature signature for claim data
  //  * @returns ResponseSchema
  //  * @description
  //  * Withdraws tokens from reward pools
  //  * */
  claimRewardsFromRewardPoolContractCall = async (
    batch: {
      payload: SignaturePayload;
      signature: string;
    }[]
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      const tx = await this.InteractorCalls.claimRewardsBatch(batch);
      return tx;
    }, interpolate(SuccessMessages.claimRewardsFromRewardPool, {}));
  };

  // /**
  //  * @param vaultName name of the vault to claim funds from
  //  * @param signaturePayload payload with claim data
  //  * @param signature signature for claim data
  //  * @returns ResponseSchema
  //  * @description
  //  * Withdraws funds from the margin bank contract
  //  * */
  claimFundsFromVaultBatchContractCall = async (
    batch: BatchClaimPayload[]
  ): Promise<ResponseSchema> => {
    const amount = batch.reduce((b, { payload, vaultName }) => {
      const isBlueVault = vaultName.toLowerCase().includes("blue");
      return b + +(isBlueVault ? "0" : payload.amount);
    }, 0);

    const blueAmount = batch.reduce((b, { payload, vaultName }) => {
      const isBlueVault = vaultName.toLowerCase().includes("blue");
      return b + +(!isBlueVault ? "0" : payload.amount);
    }, 0);

    const usdamountStr = `${bnToBaseStr(amount, 2, 6)} USDC`;
    const blueAmountStr = `${bnToBaseStr(blueAmount, 2, 9)} BLUE`;
    let amountStr: string;
    if (amount && !(blueAmount > 0)) {
      amountStr = usdamountStr;
    }
    if (blueAmount > 0 && !(amount > 0)) {
      amountStr = blueAmountStr;
    }
    if (blueAmount > 0 && amount > 0) {
      amountStr = `${usdamountStr} and ${blueAmountStr}`;
    }
    return TransformToResponseSchema(async () => {
      const tx = await this.InteractorCalls.claimFundsBatch(batch);
      return tx;
    }, interpolate(SuccessMessages.claimFundsFromVault, { amount: amountStr }));
  };

  // /**
  //  * @param amount the amount to withdraw
  //  * @param vaultName name of the vault to claim funds from
  //  * @returns ResponseSchema
  //  * @description
  //  * Withdraws funds from the margin bank contract
  //  * */
  withdrawProfitFromVaultContractCall = async (
    vaultName: string,
    amount: string
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      const tx =
        await this.InteractorCalls.moveProfitWithdrawalFundsToHoldingAccount(
          vaultName,
          amount
        );

      return tx;
    }, interpolate(SuccessMessages.withdrawMargin, { amount }));
  };
}
