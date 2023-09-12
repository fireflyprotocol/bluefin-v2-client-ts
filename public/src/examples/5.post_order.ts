/**
 * Posts an order to exchange. Creates the signed order and places it to exchange,
 * without requiring two separate function calls.
 */

/* eslint-disable no-console */
import {
  ORDER_SIDE,
  ORDER_TYPE
} from "@firefly-exchange/library-sui";
import {BluefinClient, Networks} from "@bluefin-exchange/bluefin-v2-client";

async function main() {
  const dummyAccountKey =
    "trigger swim reunion gate hen black real deer light nature trial dust";

  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519" //valid values are ED25519 or Secp256k1
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

main().then().catch(console.error);
