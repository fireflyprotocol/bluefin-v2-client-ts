/**
 * Client initialization code example
 */
import {BluefinClient, Networks, TickerData} from "@bluefin-exchange/bluefin-v2-client";


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

  const callback = (tickerUpdate: TickerData[]) => {
    console.log(tickerUpdate);
    client.sockets.close();
  };

  client.sockets.onTickerUpdate(callback);
}

main().then().catch(console.warn);
