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

  // load/init contract addresses using read-only token
  await client.init(false, null, "80a5d86820821aeae483f7cdda715e0215c1fdad612b982e7ce22c88de3ac9e2");

  //receive user positions using readonly client
  const response = await client.getUserPosition({ symbol: "ETH-PERP" });


  console.log(response.data);
}

main().then().catch(console.warn);
