import {
  address,
  ADJUST_MARGIN,
  Transaction,
  OnChainCalls,
  toBigNumberStr,
  toBaseNumber,
  SuiClient,
  Keypair,
  ZkPayload,
  BigNumberable,
} from "@firefly-exchange/library-sui";
import interpolate from "interpolate";
import {
  Interactor
} from "@firefly-exchange/library-sui/dist/src/blv/interactor";

import {
  ResponseSchema,
  SuccessMessages,
  TransformToResponseSchema,
} from "./contractErrorHandling.service";
import { Signer } from "@mysten/sui.js/cryptography";
import { SignaturePayload } from "@firefly-exchange/library-sui/dist/src/blv/interface";

export class InteractorCalls {
  InteractorCalls: Interactor;
  signer: Signer;
  suiClient: SuiClient;
  marginBankId: string | undefined;
  walletAddress: string;
  is_wallet_extension: boolean;

  constructor(
    signer: Signer,
    deployment: any,
    provider: SuiClient,
   
  ) {
    this.signer = signer;
    this.InteractorCalls = new Interactor(
      provider,
      deployment,
      this.signer
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
    return TransformToResponseSchema(async () => {
      const tx = await this.InteractorCalls.requestWithdrawFromVault(
        vaultName, amount

      );
      
      return tx;
    }, interpolate(SuccessMessages.withdrawMargin, { amount }));
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
    vaultName: string
  ): Promise<ResponseSchema> => {
    return TransformToResponseSchema(async () => {
      const tx = await this.InteractorCalls.depositToVault(
        vaultName, amount

      );
      
      return tx;
    }, interpolate(SuccessMessages.withdrawMargin, { amount }));
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
       signaturePayload,
       signature
      );
      
      return tx;
    }, interpolate(SuccessMessages.withdrawMargin, {  }));
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
      const tx = await this.InteractorCalls.moveProfitWithdrawalFundsToHoldingAccount(
      vaultName,
      amount
      );
      
      return tx;
    }, interpolate(SuccessMessages.withdrawMargin, { amount }));
  };
}

