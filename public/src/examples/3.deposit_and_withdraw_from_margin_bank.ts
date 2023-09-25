/**
 * Deposits USDC from USDC contract to MarginBank
 */
import { Networks } from "@bluefin-exchange/bluefin-v2-client";

import { BluefinClient } from "../../../src/bluefinClient";

async function main() {
  // ensure that account has enough native gas tokens to perform on-chain contract call
  const dummyAccountKey =
    "include give donate pudding glue mouse bean know hope volume edit expand";

  // using TESTNET network, getUSDCBalance does not work on MAINNET
  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519" //valid values are ED25519 or Secp256k1
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();
  console.log(await client.getPublicAddress());

  await client.adjustLeverage({ symbol: "ETH-PERP", leverage: 3 });

  // deposits 10 USDC to margin bank, uses default USDC/MarginBank Contracts
  // assuming user has 1 USDC locked in margin bank, else will throw
  console.log(
    "USDC Deposited to MarginBank: ",
    await client.depositToMarginBank(1000)
  );
  console.log(
    "USDC Withdrawn from MarginBank: ",
    await client.withdrawFromMarginBank(1000)
  );
  console.log("Current balance", await client.getUSDCBalance());
}

main().then().catch(console.warn);
