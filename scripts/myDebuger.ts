// import { OnboardingSigner } from "../src/exchange/onBoardSigner";
import { OnChainCalls } from "../submodules/library-sui/src";
import {
  publishPackageUsingClient,
  getGenesisMap,
} from "../submodules/library-sui/src/utils";
import { getSignerFromSeed } from "../utils/utils";
import { Networks } from "../src/constants";
import { Connection, JsonRpcProvider } from "@mysten/sui.js";
import { toBigNumberStr } from "@firefly-exchange/library";
import { BluefinClient } from "../src/bluefinClient";
import { KEYPAIR_SCHEME } from "../submodules/library-sui/src/enums";

// async function getMarginbankBalanceProp(signer: any, contractCalls: any) {
//   // const keyPair = getKeyPairFromSeed(seed, "Secp256k1");
//   let coins = { data: [] };
//   while (coins.data.length == 0) {
//     const tx = await contractCalls.mintUSDC({
//       amount: toBigNumberStr(10000, 6),
//       to: await signer.getAddress(),
//     });
//     coins = await contractCalls.getUSDCCoins({
//       address: await signer.getAddress(),
//     });
//     console.log(tx);
//   }
//   const coin = coins.data.pop();

//   const depositReceipt = await contractCalls.depositToBank(
//     {
//       coinID: (coin as any).coinObjectId,
//       amount: toBigNumberStr("10000", 6),
//     },
//     signer
//   );
//   console.log(depositReceipt);
//   return depositReceipt;
// }

async function main() {
  const seed =
    "explain august dream guitar mail attend enough demise engine pulse wide later";

  const client = new BluefinClient(true, Networks.LOCAL_SUI);
  await client.initializeWithSeed(seed, KEYPAIR_SCHEME.Secp256k1);
}

main().then().catch();
