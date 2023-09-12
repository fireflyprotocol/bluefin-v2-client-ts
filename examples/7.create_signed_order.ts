/**
 * Create an order signature on chain and returns it. The signature is used to verify
 * during on-chain trade settlement whether the orders being settled against each other
 * were actually signed on by the maker/taker of the order or not.
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
import {
    Networks,
    BluefinClient
  } from "../index";
  
  async function main() {
    // no gas fee is required to create order signature.
    const dummyAccountKey =
      "trigger swim reunion gate hen black real deer light nature trial dust";
  
    const client = new BluefinClient(true, Networks.TESTNET_SUI, dummyAccountKey,"ED25519"); // passing isTermAccepted = true for compliance and authorization
    await client.init();
    let symbol = "ETH-PERP";
  
    try {
      client.createSignedOrder({
        symbol: symbol,
        price: 0,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        orderType: ORDER_TYPE.MARKET,
      });
    } catch (e) {
      console.log("Error:", e);
    }
  
    // will create a signed order to sell 0.1 DOT at MARKET price
    const signedOrder = await client.createSignedOrder({
      symbol: symbol, // asset to be traded
      price: 0, // 0 implies market order
      quantity: 0.1, // the amount of asset to trade
      side: ORDER_SIDE.SELL, // buy or sell
      orderType: ORDER_TYPE.MARKET,
    });
  
    console.log("Signed Order Created:", signedOrder);
  }
  
  main().then().catch(console.warn);