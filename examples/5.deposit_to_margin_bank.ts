/**
 * Deposits USDC from USDC contract to MarginBank
 */

/* eslint-disable no-console */
import { Networks, BluefinClient } from "../index";

async function main() {
  // ensure that account has enough native gas tokens to perform on-chain contract call
  const dummyAccountKey =
    "trigger swim reunion gate hen black real deer light nature trial dust";

  // using TESTNET network, getUSDCBalance does not work on MAINNET
  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519"
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();
  console.log(await client.getPublicAddress());

  // deposits 10 USDC to margin bank, uses default USDC/MarginBank Contracts
  // assuming user has 1 USDC locked in margin bank, else will throw
  console.log(
    "USDC Deposited to MarginBank: ",
    await client.depositToMarginBank(1000)
  );
}

main().then().catch(console.warn);
