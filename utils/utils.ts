import {
  RawSigner,
  Keypair,
  JsonRpcProvider,
  Secp256k1Keypair,
  SignatureScheme,
  Ed25519Keypair,
} from "@mysten/sui.js";

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
