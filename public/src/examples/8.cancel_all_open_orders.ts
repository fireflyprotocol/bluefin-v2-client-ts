/**
 * Cancels all open orders for the given market
 */

/* eslint-disable no-console */

import {
  ORDER_SIDE,
  ORDER_TYPE,
  BluefinClient,
  Networks,
} from "@bluefin-exchange/bluefin-v2-client";

async function main() {
  const dummyAccountKey =
    "trigger swim reunion gate hen black real deer light nature trial dust";

  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519" //valid for ED25519 and Secp246k1
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();
  let symbol = "ETH-PERP";
  // open multiple limit orders
  const res1 = await client.postOrder({
    symbol: symbol,
    price: 50,
    quantity: 0.5,
    side: ORDER_SIDE.SELL,
    orderType: ORDER_TYPE.LIMIT,
    leverage: 3,
  });

  console.log(res1);

  const res2 = await client.postOrder({
    symbol: symbol,
    price: 50,
    quantity: 0.5,
    side: ORDER_SIDE.SELL,
    orderType: ORDER_TYPE.LIMIT,
    leverage: 3,
  });

  console.log(res2);

  // cancels all open order
  const response = await client.cancelAllOpenOrders(symbol);

  console.log(response.data);
}

main().then().catch(console.warn);
