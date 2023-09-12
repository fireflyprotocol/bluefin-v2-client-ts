"use strict";
/**
 * Create an order signature on chain and returns it. The signature is used to verify
 * during on-chain trade settlement whether the orders being settled against each other
 * were actually signed on by the maker/taker of the order or not.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const library_sui_1 = require("@firefly-exchange/library-sui");
const bluefin_v2_client_1 = require("@bluefin-exchange/bluefin-v2-client");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // no gas fee is required to create order signature.
        const dummyAccountKey = "trigger swim reunion gate hen black real deer light nature trial dust";
        const client = new bluefin_v2_client_1.BluefinClient(true, bluefin_v2_client_1.Networks.TESTNET_SUI, dummyAccountKey, "ED25519" //valid values are ED25519 or Secp256k1
        ); // passing isTermAccepted = true for compliance and authorization
        yield client.init();
        let symbol = "ETH-PERP";
        try {
            client.createSignedOrder({
                symbol: symbol,
                price: 0,
                quantity: 0.1,
                side: library_sui_1.ORDER_SIDE.SELL,
                orderType: library_sui_1.ORDER_TYPE.MARKET,
            });
        }
        catch (e) {
            console.log("Error:", e);
        }
        // will create a signed order to sell 0.1 DOT at MARKET price
        const signedOrder = yield client.createSignedOrder({
            symbol: symbol,
            price: 0,
            quantity: 0.1,
            side: library_sui_1.ORDER_SIDE.SELL,
            orderType: library_sui_1.ORDER_TYPE.MARKET,
        });
        console.log("Signed Order Created:", signedOrder);
    });
}
main().then().catch(console.warn);
