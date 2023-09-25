/**
 * Gets user open position on provided(all) markets
 */

/* eslint-disable no-console */

import { Networks, ADJUST_MARGIN } from "@bluefin-exchange/bluefin-v2-client";
import { BluefinClient } from "../../../src/bluefinClient";

async function main() {
  const dummyAccountKey =
    "include give donate pudding glue mouse bean know hope volume edit expand";
  // "include give donate pudding glue mouse bean know hope volume edit expand";

  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519" //valid values are ED25519 or Secp256k1
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();
  // ADD margin - will add 10 margin to ETH-PERP position
  // Please ensure that you have a position open before this. otherwise it wont work.
  console.log(
    "Added margin: ",
    await client.adjustMargin("ETH-PERP", ADJUST_MARGIN.Add, 10)
  );

  // REMOVE MARGIN - will remove 10 margin from ETH-PERP position
  console.log(
    "Removed margin: ",
    await client.adjustMargin("ETH-PERP", ADJUST_MARGIN.Remove, 8)
  );
}

main().then().catch(console.warn);
