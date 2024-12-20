import {
  Ed25519Keypair,
  Faucet,
  Keypair,
  OnChainCalls,
  Secp256k1Keypair,
  SignatureScheme,
  SignatureWithBytes,
  toBigNumberStr,
} from "@firefly-exchange/library-sui";
import fs from "fs";
import { toHex } from "@firefly-exchange/library-sui/dist/src";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import deploymentData from "../deployment.json";
import CustomError from "../src/interfaces";
import { Errors } from "../src/constants";

/**
 * Generates random number
 * @param multiplier number to multiply with random number generated
 * @returns random number
 */
export const generateRandomNumber = (multiplier: number) => {
  return Math.floor((Date.now() + Math.random() + Math.random()) * multiplier);
};

export function getKeyPairFromSeed(
  seed: string,
  scheme: SignatureScheme = "Secp256k1"
): Keypair {
  switch (scheme) {
    case "ED25519":
      return Ed25519Keypair.deriveKeypair(seed);
    case "Secp256k1":
      return Secp256k1Keypair.deriveKeypair(seed);
    default:
      throw new Error("Provided scheme is invalid");
  }
}

export function getSignerFromSeed(seed: string): Keypair {
  return getKeyPairFromSeed(seed);
}

function readFileServer(filePath: string): any {
  return fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath).toString())
    : {};
}

function readFileBrowser(): any {
  return deploymentData;
}

export function readFile(filePath: string): any {
  return typeof window === "undefined"
    ? readFileServer(filePath)
    : readFileBrowser();
}

export async function setupTestAccounts(
  deployerWallet: OnChainCalls,
  testWallets: any[],
  faucetURL: string
): Promise<boolean> {
  const mintAmount = 1000000000;
  // eslint-disable-next-line no-restricted-syntax
  for (const wallet of testWallets) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await Faucet.requestSUI(wallet.privateAddress, faucetURL);
    } catch (e) {
      console.log(e);
    }
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const wallet of testWallets) {
    // eslint-disable-next-line no-await-in-loop
    await deployerWallet.mintUSDC({
      amount: toBigNumberStr(mintAmount.toString(), 6),
      to: wallet.privateAddress,
      gasBudget: 10000000,
    });
  }
  return true;
}

/**
 * @description
 * Generate a new wallet
 * @returns private key and public address
 * */
export function createWallet(): { privateKey: string; publicAddress: string } {
  const wallet = Ed25519Keypair.generate();
  const signerKey = wallet.getSecretKey();
  const keyPair = decodeSuiPrivateKey(signerKey);

  const publicAddress = wallet.toSuiAddress();
  return {
    privateKey: toHex(keyPair.secretKey),
    publicAddress,
  };
}

export function combineAndEncode({ bytes, signature }: SignatureWithBytes) {
  // serialize
  const separator = "||||"; // Choose a separator that won't appear in txBytes or signature
  const combinedData = `${bytes}${separator}${signature}`;

  // Encode to hex for transmission
  const encodedData = Buffer.from(combinedData, "utf-8").toString("hex");
  return encodedData;
}

/**
 * Utility function to throw a CustomError.
 *
 * @param {Error} error - The original error object.
 * @param {Errors} code - The error code.
 * @param {string} [name] - Optional custom name for the error.
 * @throws {CustomError}
 */
export function throwCustomError({
  error,
  code,
  extra,
}: {
  error: Error | string;
  code?: Errors;
  extra?: Record<any, any>;
}): never {
  if (typeof error === "string") error = new Error(error);
  throw new CustomError(error, code, extra);
}

// export async function performTrade(
//   onChain: OnChainCalls,
//   deployerSigner: RawSigner,
//   makerOrder: OrderSignatureResponse,
//   takerOrder: OrderSignatureResponse,
//   tradePrice: number
// ): Promise<[boolean, SuiTransactionBlockResponse]> {
//   const tx1 = await onChain.createSettlementOperator({
//     operator: await deployerSigner.getAddress(),
//     gasBudget: 400000000,
//   });
//   const settlementCapID = Transaction.getCreatedObjectIDs(tx1)[0];
//   // Note: Assuming deployer is already price oracle operator
//   // make admin of the exchange price oracle operator
//   const tx2 = await onChain.setPriceOracleOperator({
//     operator: await deployerSigner.getAddress(),
//     gasBudget: 400000000,
//   });
//   const updateOPCapID = Transaction.getCreatedObjectIDs(tx2)[0];

//   // set specific price on oracle
//   const tx3 = await onChain.updateOraclePrice({
//     price: toBigNumberStr(tradePrice),
//     updateOPCapID,
//     perpID: onChain.getPerpetualID(makerOrder.symbol),
//     gasBudget: 400000000,
//   });
//   let status = Transaction.getStatus(tx3);
//   const makerOnChainOrder: Order = {
//     market: onChain.getPerpetualID(makerOrder.symbol),
//     maker: makerOrder.maker,
//     isBuy: makerOrder.side === ORDER_SIDE.BUY,
//     reduceOnly: makerOrder.reduceOnly,
//     postOnly: makerOrder.postOnly,
//     orderbookOnly: makerOrder.orderbookOnly,
//     ioc: makerOrder.timeInForce === TIME_IN_FORCE.IMMEDIATE_OR_CANCEL,
//     quantity: toBigNumber(makerOrder.quantity),
//     price: toBigNumber(makerOrder.price),
//     leverage: toBigNumber(makerOrder.leverage),
//     expiration: toBigNumber(makerOrder.expiration),
//     salt: toBigNumber(makerOrder.salt),
//   };
//   const TakerOnChainOrder: Order = {
//     market: onChain.getPerpetualID(makerOrder.symbol),
//     maker: takerOrder.maker,
//     isBuy: takerOrder.side === ORDER_SIDE.BUY,
//     reduceOnly: takerOrder.reduceOnly,
//     postOnly: takerOrder.postOnly,
//     orderbookOnly: takerOrder.orderbookOnly,
//     ioc: takerOrder.timeInForce === TIME_IN_FORCE.IMMEDIATE_OR_CANCEL,
//     quantity: toBigNumber(takerOrder.quantity),
//     price: toBigNumber(takerOrder.price),
//     leverage: toBigNumber(takerOrder.leverage),
//     expiration: toBigNumber(takerOrder.expiration),
//     salt: toBigNumber(takerOrder.salt),
//   };
//   const tx = await onChain.trade({
//     makerOrder: makerOnChainOrder,
//     takerOrder: TakerOnChainOrder,
//     makerSignature: makerOrder.orderSignature,
//     takerSignature: takerOrder.orderSignature,
//     settlementCapID,
//     gasBudget: 400000000,
//     perpID: onChain.getPerpetualID(makerOrder.symbol),
//   });

//   status = Transaction.getStatus(tx);
//   if (status === "success") {
//     console.log("Transaction success");
//     return [true, tx];
//   }
//   if (status === "failure") {
//     console.log("Error:", Transaction.getError(tx));
//     return [false, tx];
//   }
//   console.log("Transaction status %s", status);
//   return [false, tx];
// }
