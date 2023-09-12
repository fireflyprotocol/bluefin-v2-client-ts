/**
 * Gets user open position on provided(all) markets
 */

/* eslint-disable no-console */
import { Networks, BluefinClient } from "../index";

async function main() {
  const dummyAccountKey =
    "trigger swim reunion gate hen black real deer light nature trial dust";

  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519"
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();

  const response = await client.getUserPosition({ symbol: "ETH-PERP" });

  console.log(response.data);
}

main().then().catch(console.warn);
