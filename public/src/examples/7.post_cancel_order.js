"use strict";
/**
 * Post an order on exchange and then cancel the posted order
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
        const dummyAccountKey = "trigger swim reunion gate hen black real deer light nature trial dust";
        const client = new bluefin_v2_client_1.BluefinClient(true, bluefin_v2_client_1.Networks.TESTNET_SUI, dummyAccountKey, "ED25519"); //passing isTermAccepted = true for compliance and authorizarion
        yield client.init();
        // post a limit order
        let symbol = "ETH-PERP";
        const response = yield client.postOrder({
            symbol: symbol,
            price: 51,
            quantity: 0.5,
            side: library_sui_1.ORDER_SIDE.SELL,
            orderType: library_sui_1.ORDER_TYPE.LIMIT,
            leverage: 3,
        });
        // posts order for cancellation on exchange
        const cancellationResponse = yield client.postCancelOrder({
            symbol: symbol,
            hashes: [response.response.data.hash],
        });
        console.log(cancellationResponse.data);
    });
}
main().then().catch(console.warn);
