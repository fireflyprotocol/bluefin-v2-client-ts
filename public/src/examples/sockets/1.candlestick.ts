/**
 * Client initialization code example
 */
import {BluefinClient, Networks} from "@bluefin-exchange/bluefin-v2-client";
import {MinifiedCandleStick} from "@firefly-exchange/library-sui";


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

  let callback = (candle: MinifiedCandleStick) => {
    console.log(candle);
    client.sockets.close();
  };
  client.sockets.onCandleStickUpdate("ETH-PERP", "1m", callback);
}

main().then().catch(console.warn);
