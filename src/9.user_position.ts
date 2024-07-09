/**
 * Gets user open position on provided(all) markets
 */

import { BluefinClient } from "./bluefinClient";
import { Networks } from "./constants";

async function main() {
  const dummyAccountKey =
    "mushroom cash circle identify fee mind swamp demand fade female purse sugar";

  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519" //valid values are ED25519 or Secp256k1
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();

  const response1 = await client.getUserVaultDetailsSummary("weewrwe");
  console.log(response1);
  const response = await client.depositToVault("Wintermute",10);

  console.log(response);
}

main().then().catch(console.warn);
