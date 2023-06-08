import {
  RawSigner,
  Keypair,
  JsonRpcProvider,
  Secp256k1Keypair,
  SignatureScheme,
  Ed25519Keypair,
} from "@mysten/sui.js";
import fs from "fs";
import {
  OnChainCalls,
  Faucet,
  toBigNumberStr,
} from "../submodules/library-sui";

/**
 * Generates random number
 * @param multiplier number to multiply with random number generated
 * @returns random number
 */
export const generateRandomNumber = (multiplier: number) => {
  return Math.floor((Date.now() + Math.random() + Math.random()) * multiplier);
};

export function getSignerFromKeyPair(
  keypair: Keypair,
  provider: JsonRpcProvider
): RawSigner {
  return new RawSigner(keypair, provider);
}

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

export function getSignerFromSeed(
  seed: string,
  provider: JsonRpcProvider
): RawSigner {
  return getSignerFromKeyPair(getKeyPairFromSeed(seed), provider);
}

export function readFile(filePath: string): any {
  return fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath).toString())
    : {};
}

export async function setupTestAccounts(
  deployerWallet: OnChainCalls,
  testWallets: any[]
): Promise<boolean> {
  {
    const mintAmount = 1000000000;
    for (const wallet of testWallets) {
      try {
        await Faucet.requestSUI(wallet.privateAddress);
      } catch (e) {
        console.log(e);
      }
    }
    for (const wallet of testWallets) {
      await deployerWallet.mintUSDC({
        amount: toBigNumberStr(mintAmount.toString(), 6),
        to: wallet.privateAddress,
        gasBudget: 10000000,
      });
    }
    return true;
  }
}
