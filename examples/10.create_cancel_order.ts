/**
 * Places the order cancellation request to exchange
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
  // post a limit order
  const response = await client.postOrder({
    symbol: symbol,
    price: 50,
    quantity: 0.5,
    side: ORDER_SIDE.SELL,
    orderType: ORDER_TYPE.LIMIT,
    leverage: 3,
  });

  // create signature
  const cancelSignature = await client.createOrderCancellationSignature({
    symbol: symbol,
    hashes: [response.response.data.hash],
  });

  // place order for cancellation on exchange
  const cancellationResponse = await client.placeCancelOrder({
    symbol: symbol,
    hashes: [response.response.data.hash],
    signature: cancelSignature,
  });

  console.log(cancellationResponse.data);
}

main().then().catch(console.warn);
