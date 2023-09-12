"use strict";
/**
 * Gets user open position on provided(all) markets
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
const bluefin_v2_client_1 = require("@bluefin-exchange/bluefin-v2-client");
const library_sui_1 = require("@firefly-exchange/library-sui");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const dummyAccountKey = "trigger swim reunion gate hen black real deer light nature trial dust";
        const client = new bluefin_v2_client_1.BluefinClient(true, bluefin_v2_client_1.Networks.TESTNET_SUI, dummyAccountKey, "ED25519" //valid values are ED25519 or Secp256k1
        ); //passing isTermAccepted = true for compliance and authorizarion
        yield client.init();
        // ADD margin - will add 10 margin to ETH-PERP position
        // Please ensure that you have a position open before this. otherwise it wont work.
        console.log("Added margin: ", yield client.adjustMargin("ETH-PERP", library_sui_1.ADJUST_MARGIN.Add, 10));
        // REMOVE MARGIN - will remove 10 margin from ETH-PERP position
        console.log("Removed margin: ", yield client.adjustMargin("ETH-PERP", library_sui_1.ADJUST_MARGIN.Remove, 10));
    });
}
main().then().catch(console.warn);
