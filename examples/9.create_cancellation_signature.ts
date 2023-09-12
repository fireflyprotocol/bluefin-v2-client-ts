/**
 * Creates order cancellation signature
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

  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519"
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();

  // post a limit order
  const response = await client.postOrder({
    symbol: "ETH-PERP",
    price: 15,
    quantity: 0.5,
    side: ORDER_SIDE.SELL,
    orderType: ORDER_TYPE.LIMIT,
  });

  // create signature
  const cancelSignature = await client.createOrderCancellationSignature({
    symbol: "ETH-PERP",
    hashes: [response.response.data.hash],
  });

  console.log("Cancellation Signature:", cancelSignature);
}

main().then().catch(console.warn);
