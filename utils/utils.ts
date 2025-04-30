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
import { ExtendedNetwork } from "../src/interfaces/routes";
import fs from "fs";
import { toHex } from "@firefly-exchange/library-sui/dist/src";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import deploymentData from "../deployment.json";
import CustomError from "../src/interfaces";
import { Errors } from "../src/constants";
import { IBluefinSpotContracts } from "@firefly-exchange/library-sui/dist/src/spot";
import { IDeployment } from "@firefly-exchange/library-sui/dist/src/v3";

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
// Helper function to check if exchangeInfo.data is an object or array
export function filterDelistedMarkets(exchangeInfo: any): string[] {
  if (!exchangeInfo?.data) {
    return [];
  }

  const status = "DELISTED";

  if (Array.isArray(exchangeInfo.data)) {
    const filtered = exchangeInfo.data
      .filter((market: any) => {
        return market.status === status; // Changed == to === for strict comparison
      })
      .map((market: any) => market.symbol);
    return filtered;
  } else if (typeof exchangeInfo.data === "object") {
    return exchangeInfo.data.status === status
      ? [exchangeInfo.data.symbol]
      : []; // Changed == to === for strict comparison
  }

  return [];
}

/**
 * Determines if the network is mainnet based on ExtendedNetwork
 * @param network ExtendedNetwork
 * @returns boolean indicating if network is mainnet
 */
export function isMainnet(network: ExtendedNetwork): boolean {
  return (
    network.name?.toLowerCase().includes("production") ||
    network.apiGateway?.toLowerCase().includes("sui-prod") ||
    false
  );
}

/**
 * Reads spot deployment configuration based on network type
 * @param network ExtendedNetwork
 * @returns IBluefinSpotContracts configuration
 */
export function getSpotDeploymentConfig(
  network: ExtendedNetwork
): IBluefinSpotContracts {
  try {
    const networkType = isMainnet(network) ? "mainnet" : "testnet";
    const spotConfig = readFile("./spotDeployment.json");
    if (!spotConfig[networkType]) {
      throw new Error(`No configuration found for network: ${networkType}`);
    }
    return spotConfig[networkType] as IBluefinSpotContracts;
  } catch (error) {
    console.error("Error reading spot deployment config:", error);
    throw error;
  }
}

export function getProDeploymentConfig(network: ExtendedNetwork): IDeployment {
  try {
    const networkType = isMainnet(network) ? "mainnet" : "testnet";
    const proConfig = readFile("./proDeployment.json");
    if (!proConfig[networkType]) {
      throw new Error(`No configuration found for network: ${networkType}`);
    }
    return proConfig[networkType] as IDeployment;
  } catch (error) {
    console.error("Error reading pro deployment config:", error);
    throw error;
  }
}
