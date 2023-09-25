/**
 * Posts an order to exchange. Creates the signed order and places it to exchange,
 * without requiring two separate function calls.
 */

/* eslint-disable no-console */
import {
  ORDER_SIDE,
  ORDER_TYPE,
  BluefinClient,
  Networks,
  ORDER_STATUS,
} from "@bluefin-exchange/bluefin-v2-client";

async function main() {
  const dummyAccountKey =
    "include give donate pudding glue mouse bean know hope volume edit expand";

  const client = new BluefinClient(
    true,
    Networks.PRODUCTION_SUI,
    dummyAccountKey,
    "ED25519" //valid values are ED25519 or Secp256k1
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();
  let symbol = "ETH-PERP";

  // will post a limit order of 0.5 quantity at price 11
  const response = await client.postOrder({
    symbol: symbol,
    price: 0,
    quantity: 0.05,
    side: ORDER_SIDE.BUY,
    orderType: ORDER_TYPE.MARKET,
    leverage: 10,
  });
  let start;
  if (response.data.orderStatus == 'PENDING') {
    start = new Date().getTime();
    console.log("Start time( Market Order Placed To Dapi) : ", start)
  }


  let endTime;
  let counter = 0;
  client.sockets.open()
  const hell = client.sockets.subscribeUserUpdateByToken();
  client.sockets.onUserOrderUpdate((msg) => {

    if (msg.order.orderStatus == ORDER_STATUS.PARTIAL_FILLED) {
      counter++;
      console.log("Order Filled Recieved , Filled Qty -> ", msg.order.filledQty, " Recieved at Time -> ", new Date().getTime(), " Time Difference From Start-> ", new Date().getTime() - start)
    }
    if (msg.order.orderStatus == ORDER_STATUS.FILLED) {
      counter++;
      console.log("Order Filled Completely , Filled Qty -> ", msg.order.filledQty, " Time ->", new Date().getTime())
    }
    if (counter == 5) {
      endTime = new Date().getTime()
      console.log("End Time: ", endTime);
      console.log("Difference: ", endTime - start)
    }
  });

}

main().then().catch(console.error);
