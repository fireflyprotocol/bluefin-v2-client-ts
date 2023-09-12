/**
 * Client initialization code example
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
import { Networks, BluefinClient, ExtendedNetwork } from "../../index";

async function main() {
  const dummyAccountKey =
    "royal reopen journey royal enlist vote core cluster shield slush hill sample";

  // using predefined network
  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519"
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();
  client.sockets.open();
  client.sockets.subscribeGlobalUpdatesBySymbol("ETH-PERP");
  client.sockets.subscribeUserUpdateByToken();



  let callback = ({ orderbook }: any) => {
    console.log(orderbook);
    client.sockets.close()
  };
  

  client.sockets.onOrderBookUpdate(callback)

  // wait for 1 sec as room might not had been subscribed
  
client.postOrder({
      symbol: "ETH-PERP",
      price: 233,
      quantity: 0.1,
      side: ORDER_SIDE.SELL,
      leverage: 3,
      orderType: ORDER_TYPE.LIMIT,
    });


}

main().then().catch(console.warn);
