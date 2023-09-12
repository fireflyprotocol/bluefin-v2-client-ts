/**
 * Cancels all open orders for the given market
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
import { Networks,BluefinClient } from "../index";

async function main() {
  const dummyAccountKey =
    "trigger swim reunion gate hen black real deer light nature trial dust";

  const client = new BluefinClient(true, Networks.TESTNET_SUI, dummyAccountKey,"ED25519"); //passing isTermAccepted = true for compliance and authorizarion
  await client.init()
  let symbol="ETH-PERP"
  // open multiple limit orders
  await client.postOrder({
    symbol: symbol,
    price: 15,
    quantity: 0.5,
    side: ORDER_SIDE.SELL,
    orderType: ORDER_TYPE.LIMIT
  });

  await client.postOrder({
    symbol: symbol,
    price: 15,
    quantity: 0.5,
    side: ORDER_SIDE.SELL,
    orderType: ORDER_TYPE.LIMIT
  });

  // cancels all open order
  const response = await client.cancelAllOpenOrders(symbol);

  console.log(response.data);
}

main().then().catch(console.warn);