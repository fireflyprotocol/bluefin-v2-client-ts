/**
 * Gets user open position on provided(all) markets
 */

/* eslint-disable no-console */
import { Networks, BluefinClient } from "../index";

async function main() {
  const dummyAccountKey =
    "trigger swim reunion gate hen black real deer light nature trial dust";

  const client = new BluefinClient(true, Networks.TESTNET_SUI, dummyAccountKey,"ED25519"); //passing isTermAccepted = true for compliance and authorizarion
  await client.init()
  // all available symbols on exchange
  const symbols = await client.getMarketSymbols()
  console.log("Symbols on exchange:", symbols);
}

main().then().catch(console.warn);