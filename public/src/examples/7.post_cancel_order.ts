/**
 * Post an order on exchange and then cancel the posted order
 */

/* eslint-disable no-console */

import {
  ORDER_SIDE,
  ORDER_TYPE, BluefinClient, Networks
} from "@bluefin-exchange/bluefin-v2-client";

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
  let symbol = "ETH-PERP";
  const response = await client.postOrder({
    symbol: symbol,
    price: 51,
    quantity: 0.5,
    side: ORDER_SIDE.SELL,
    orderType: ORDER_TYPE.LIMIT,
    leverage: 3,
  });

  // posts order for cancellation on exchange
  const cancellationResponse = await client.postCancelOrder({
    symbol: symbol,
    hashes: [response.response.data.hash],
  });

  console.log(cancellationResponse.data);
}

main().then().catch(console.warn);
