/**
 * Posts an order to exchange. Creates the signed order and places it to exchange,
 * without requiring two separate function calls.
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
  // no gas fee is required to create order signature.
  const dummyAccountKey =
    "trigger swim reunion gate hen black real deer light nature trial dust";

  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519"
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();
  let symbol = "ETH-PERP";

  // will post a limit order of 0.5 quantity at price 11
  const response = await client.postOrder({
    symbol: symbol,
    price: 50,
    quantity: 0.5,
    side: ORDER_SIDE.BUY,
    orderType: ORDER_TYPE.LIMIT,
    leverage: 3,
  });

  console.log(response.data);
}

main().then().catch(console.warn);
