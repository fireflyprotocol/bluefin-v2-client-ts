import {
  Chain,
  SignedTx,
  UnsignedTransaction,
} from "@wormhole-foundation/connect-sdk";

export interface SignOnlySigner {
  chain(): Chain;
  address(): string;
  sign(tx: UnsignedTransaction[]): Promise<SignedTx[]>;
}
