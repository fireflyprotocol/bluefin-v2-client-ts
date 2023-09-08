import { Networks } from "../src/constants";
import { BluefinClient } from "../src/bluefinClient";
// import { KEYPAIR_SCHEME } from "../submodules/library-sui";

async function main() {
  const seed =
    "explain august dream guitar mail attend enough demise engine pulse wide later";

  const client = new BluefinClient(true, Networks.LOCAL_SUI);
  await client.initializeWithSeed(seed, "Secp256k1");
  await client.initContractCalls();
}

main().then().catch();
