/**
 * Client initialization code example
 */
import {
  BluefinClient,
  Networks,
  ORDER_SIDE,
  ORDER_TYPE,
} from "@bluefin-exchange/bluefin-v2-client";

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
  let callback = ({ orderbook }: any) => {
    console.log(orderbook);
    client.sockets.close();
  };

  const connection_callback = async () => {
    // This callback will be invoked as soon as the socket connection is established
    // start listening to local user events
    client.sockets.subscribeGlobalUpdatesBySymbol("BTC-PERP");
    client.sockets.subscribeUserUpdateByToken();

    // triggered when order updates are received
    client.sockets.onOrderBookUpdate(callback);
  };

  const disconnection_callback = async () => {
    console.log("Sockets disconnected, performing actions...");
  };

  // must specify connection_callback before opening the sockets below
  await client.sockets.listen("connect", connection_callback);
  await client.sockets.listen("disconnect", disconnection_callback);

  console.log("Making socket connection to firefly exchange");
  client.sockets.open();

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
