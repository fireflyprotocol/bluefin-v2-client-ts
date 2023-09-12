/**
 * Getting user's USDC balance
 */

/* eslint-disable no-console */
import { Networks, BluefinClient } from "../index";

async function main() {
  const dummyAccountKey =
    "royal reopen journey royal enlist vote core cluster shield slush hill sample";
  // using TESTNET network
  const client = new BluefinClient(true, Networks.TESTNET_SUI, dummyAccountKey,"ED25519"); //passing isTermAccepted = true for compliance and authorizarion
  await client.init()

  console.log("User's balance in USDC is: ", await client.getUSDCBalance());
}

main().then().catch(console.warn);