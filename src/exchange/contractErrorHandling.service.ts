import {
  getValue,
  SuiTransactionBlockResponse,
  Transaction,
  TransactionBlock,
} from "@firefly-exchange/library-sui/";
import { serializeError } from "eth-rpc-errors";
import { DryRunTransactionBlockResponse } from "@firefly-exchange/library-sui";

const lockErrorRetryDelayMS = 2000;
const lockErrorMaxRetries = 5;

export const LOCKED_ERROR_MESSAGE =
  "Failed to sign transaction by a quorum of validators because of locked objects";
export type ResponseSchema = {
  ok: boolean;
  data: any;
  message: string;
  code?: number | string;
  stack?: string;
};
interface ProviderRpcError {
  code: number | string;
  message: string;
  data?: unknown;
  stack?: string;
}
export const handleResponse = (
  response: ProviderRpcError,
  ok: boolean,
  customMessage?: string
): ResponseSchema => {
  const mutatedResponse: ResponseSchema = {
    ok,
    data: getValue(
      response.data as object,
      "originalError.transaction",
      response.data
    ),
    message:
      customMessage ||
      getValue(
        response.data as object,
        "originalError.reason",
        response.message
      ),
    code: getValue(
      response.data as object,
      "originalError.code",
      response.code
    ),
    stack: response.message,
  };

  return mutatedResponse;
};

export const TransformToResponseSchema = async (
  contactCall: () => Promise<
    | SuiTransactionBlockResponse
    | DryRunTransactionBlockResponse
    | TransactionBlock
  >,
  successMessage: string,
  isSponsored?: boolean
): Promise<ResponseSchema> => {
  for (let retryNo = 0; retryNo < lockErrorMaxRetries; retryNo++) {
    if (!isSponsored) {
      const tx = await (contactCall() as Promise<SuiTransactionBlockResponse>);
      if (Transaction.getStatus(tx) === "success") {
        return handleResponse(
          {
            data: tx,
            message: successMessage,
            code: 200,
          },
          true
        );
      }
      if (Transaction.getError(tx)) {
        return handleResponse(
          {
            data: tx,
            message: Transaction.getError(tx),
            code: 400,
          },
          false
        );
      }

      const errorMessage = tx.toString();
      if (
        errorMessage.includes("MoveAbort") &&
        errorMessage.includes("deposit_to_asset_bank") &&
        errorMessage.includes("1030")
      ) {
        return handleResponse(
          {
            data: tx,
            message: tx as unknown as string,
            code: 400,
          },
          false,
          "Minimum deposit to Pro is 1 USDC"
        );
      }
      return handleResponse(
        {
          data: tx,
          message: tx as unknown as string,
          code: 400,
        },
        false
      );
    }
    const res = await (contactCall() as unknown as TransactionBlock);
    const obj = {
      data: res,
      code: 200,
      message: "",
      ok: true,
    };
    return obj;
  }
};

export enum SuccessMessages {
  adjustLeverage = "Leverage Adjusted to {leverage}x.",
  adjustMarginAdd = "{amount} USDC margin Added to position.",
  adjustMarginRemove = "{amount} USDC margin Removed from position.",
  withdrawMargin = "{amount} USDC withdrawn.",
  claimFundsFromVault = "{amount} claimed from vault.",
  claimRewardsFromRewardPool = "Rewards claimed from reward pool.",
  withdrawFundsFromVault = "{amount} {symbol} withdraw request sent to pool.",
  approveUSDC = "{amount} USDC approved.",
  depositToBank = "{amount} USDC deposited to Margin Bank.",
  depositToVault = "{amount} {symbol} deposited to pool.",
  setSubAccounts = "This {address} is successfully {status} as a subaccount",
  transferCoins = "{balance} {coin} transferred to {walletAddress}",
  swapAndDepositToPro = "Successfully swapped and deposited {amount} USDC to Pro.",
  closedDelistedPositionsSwapAndDepositToPro = "Successfully closed remaining positions, swapped and deposited {amount} USDC to Pro.",
  closedDelistedPositionsAndWithdrawMargin = "Successfully closed remaining positions and withdrew {amount} margin.",
}

export enum VerificationStatus {
  Success = "success",
  Restricted = "restricted",
  Blocked = "blocked",
}

export enum APIErrorMessages {
  // eslint-disable-next-line max-len
  restrictedUser = "This wallet address has been identified as high-risk. You will not be able to open any new positions or deposit funds on the exchange. You may, however, close out any open positions and withdraw free collateral",
}

export enum VaultTVLInterval {
  DAY = "TWENTY_MINUTES",
  WEEK = "THREE_HOURS",
  MONTH = "TWELVE_HOURS",
  ALL = "FOUR_DAYS",
}
