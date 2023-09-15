/**
 * Client initialization code example
 */

/* eslint-disable no-console */
import { BluefinClient, Networks } from "@bluefin-exchange/bluefin-v2-client";

async function main() {
  const dummyAccountKey =
    "royal reopen journey royal enlist vote core cluster shield slush hill sample";

  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI, // i.e. TESTNET_SUI or PRODUCTION_SUI
    dummyAccountKey,
    "ED25519" // valid values are ED25519 or Secp256k1
  ); //passing isTermAccepted = true for compliance and authorizarion

  // load/init contract addresses
  await client.init();

  //receive read-only token in response
  const resp = await client.generateReadOnlyToken();

  console.log(resp.data);
}

main().then().catch(console.warn);
