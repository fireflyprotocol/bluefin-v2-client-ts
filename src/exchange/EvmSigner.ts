import { toBigNumber } from "@firefly-exchange/library-sui";
import {
  Chain,
  SignOnlySigner,
  SignedTx,
  Signer,
  UnsignedTransaction,
  Network,
} from "@wormhole-foundation/connect-sdk";
import { EvmPlatform } from "@wormhole-foundation/connect-sdk-evm";
import { ethers } from "ethers";

// // Get a SignOnlySigner for the EVM platform
// export async function getEvmSigner(
//   rpc: ethers.Provider,
//   privateKey: string
// ): Promise<Signer> {
//   const [network, chain] = await EvmPlatform.chainFromRpc(rpc);
//   return new EvmSigner<typeof network, typeof chain>(chain, rpc, privateKey);
// }

// EvmSigner implements SignOnlySender
export class EvmSigner<N extends Network, C extends Chain>
  implements SignOnlySigner<N, C>
{
  provider: ethers.providers.Web3Provider;
  _wallet: ethers.providers.JsonRpcSigner;

  constructor(private _chain: C, private _address: string) {
    this.provider = new ethers.providers.Web3Provider((window as any).ethereum);
    this._wallet = this.provider.getSigner();
  }

  chain(): C {
    return this._chain;
  }

  address(): string {
    return this._address;
  }

  async sign(tx: UnsignedTransaction[]): Promise<SignedTx[]> {
    const signed = [];

    let nonce = await this.provider.getTransactionCount(this.address());

    // // TODO: Better gas estimation/limits
    // let gasLimit = toBigNumber(200);
    // let maxFeePerGas = toBigNumber(200); // 1.5gwei
    // let maxPriorityFeePerGas = toBigNumber(200); // 0.1gwei

    // Celo does not support this call
    const feeData = await this.provider.getFeeData();
    // if (this._chain !== "Celo") {
    //   let maxFeePerGas = feeData.maxFeePerGas;
    //   let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    // }

    for (const txn of tx) {
      const { transaction, description } = txn;
      console.log(`Signing: ${description} for ${this.address()}`);

      const t: ethers.Transaction = {
        ...transaction,
        ...{
          gasLimit: 500_000n,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          nonce,
        },
      };

      // TODO
      const estimate = await this.provider.estimateGas(t)
    //   t.gasLimit = estimate

      console.log(estimate, "estimate gas fees")

      signed.push(await this._wallet.signTransaction(t));

      nonce += 1;
    }
    return signed;
  }
}
