/**
 * Gets user open position on provided(all) markets
 */

/* eslint-disable no-console */
import {
    ORDER_STATUS,
    ORDER_SIDE,
    // MinifiedCandleStick,
    ORDER_TYPE,
    toBaseNumber,
    MinifiedCandleStick,
    Faucet,
    OrderSigner,
    parseSigPK,
    ADJUST_MARGIN,
  } from "@firefly-exchange/library-sui";
import { Networks, BluefinClient } from "../index";

async function main() {
  const dummyAccountKey =
    "trigger swim reunion gate hen black real deer light nature trial dust";

  const client = new BluefinClient(true, Networks.TESTNET_SUI, dummyAccountKey,"ED25519"); //passing isTermAccepted = true for compliance and authorizarion
  await client.init()
  // ADD margin - will add 10 margin to ETH-PERP position
  console.log(
    "Added margin: ",
    await client.adjustMargin("ETH-PERP", ADJUST_MARGIN.Add, 10)
);

// REMOVE MARGIN - will remove 10 margin from ETH-PERP position
console.log(
    "Removed margin: ",
    await client.adjustMargin("ETH-PERP", ADJUST_MARGIN.Remove, 10)
);
}

main().then().catch(console.warn);