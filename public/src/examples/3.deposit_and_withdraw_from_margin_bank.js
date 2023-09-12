"use strict";
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
/**
 * Deposits USDC from USDC contract to MarginBank
 */
const bluefin_v2_client_1 = require("@bluefin-exchange/bluefin-v2-client");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // ensure that account has enough native gas tokens to perform on-chain contract call
        const dummyAccountKey = "trigger swim reunion gate hen black real deer light nature trial dust";
        // using TESTNET network, getUSDCBalance does not work on MAINNET
        const client = new bluefin_v2_client_1.BluefinClient(true, bluefin_v2_client_1.Networks.TESTNET_SUI, dummyAccountKey, "ED25519" //valid values are ED25519 or Secp256k1
        ); //passing isTermAccepted = true for compliance and authorizarion
        yield client.init();
        console.log(yield client.getPublicAddress());
        // deposits 10 USDC to margin bank, uses default USDC/MarginBank Contracts
        // assuming user has 1 USDC locked in margin bank, else will throw
        console.log("USDC Deposited to MarginBank: ", yield client.depositToMarginBank(10));
        console.log("USDC Withdrawn from MarginBank: ", yield client.withdrawFromMarginBank(1));
        console.log("Current balance", yield client.getUSDCBalance());
    });
}
main().then().catch(console.warn);
