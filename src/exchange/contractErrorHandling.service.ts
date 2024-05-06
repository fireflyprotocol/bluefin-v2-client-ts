import {
  getValue,
  SuiTransactionBlockResponse,
  Transaction,
} from "@firefly-exchange/library-sui/";
import { serializeError } from "eth-rpc-errors";

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
  ok: boolean
): ResponseSchema => {
  const mutatedResponse: ResponseSchema = {
    ok,
    data: getValue(
      response.data as object,
      "originalError.transaction",
      response.data
    ),
    message: getValue(
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
  contactCall: () => Promise<SuiTransactionBlockResponse>,
  successMessage: string
): Promise<ResponseSchema> => {
  for (let retryNo = 0; retryNo < lockErrorMaxRetries; retryNo++) {
    try {
      const tx = await contactCall();
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
      return handleResponse(
        {
          data: tx,
          message: Transaction.getError(tx),
          code: 400,
        },
        false
      );
    } catch (error: any) {
      if (error.toString().indexOf(LOCKED_ERROR_MESSAGE) >= 0) {
        console.log("Retrying on sui lock error %o", error);
        await new Promise((resolve) =>
          setTimeout(resolve, lockErrorRetryDelayMS)
        );
      } else {
        return handleResponse({ ...serializeError(error) }, false);
      }
    }
  }
};

export enum SuccessMessages {
  adjustLeverage = "Leverage Adjusted to {leverage}x.",
  adjustMarginAdd = "{amount} USDC margin Added to position.",
  adjustMarginRemove = "{amount} USDC margin Removed from position.",
  withdrawMargin = "{amount} USDC withdrawn.",
  claimFundsFromVault = "{amount} USDC claimed from vault.",
  withdrawFundsFromVault = "{amount} USDC withdraw request sent to vault.",
  approveUSDC = "{amount} USDC approved.",
  depositToBank = "{amount} USDC deposited to Margin Bank.",
  depositToVault = "{amount} USDC deposited to vault.",
  setSubAccounts = "This {address} is successfully {status} as a subaccount",
  transferCoins = "{balance} {coin} transferred to {walletAddress}",
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
