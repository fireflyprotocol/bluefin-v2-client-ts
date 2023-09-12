/**
 * Mint's Test USDC on TESTNET
 */

/* eslint-disable no-console */
import { Networks, BluefinClient } from "../index";

async function main() {
  // ensure that account has enough native gas tokens to perform on-chain USDC.mint() call
  const dummyAccountKey =
    "royal reopen journey royal enlist vote core cluster shield slush hill sample";

  // using TESTNET network, getUSDCBalance does not work on MAINNET
  const client = new BluefinClient(true, Networks.TESTNET_SUI, dummyAccountKey,"ED25519"); //passing isTermAccepted = true for compliance and authorizarion
  await client.init()

  // balance will be 10K, will return true
  console.log("Tokens minted:", await client.mintTestUSDC());

  // initial balance will be zero"
  console.log(
    "User's balance in USDC is: ",
    await client.getUSDCBalance()
  );
}

main().then().catch(console.warn);