"use strict";
/**
 * Client initialization code example
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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const dummyAccountKey = "royal reopen journey royal enlist vote core cluster shield slush hill sample";
        // using predefined network
        const client = new bluefin_v2_client_1.BluefinClient(true, bluefin_v2_client_1.Networks.TESTNET_SUI, dummyAccountKey, "ED25519" //valid values are ED25519 or Secp256k1
        ); //passing isTermAccepted = true for compliance and authorizarion
        yield client.init();
        // prints client address
        console.log(client.getPublicAddress());
        // using custom network
        const custNetwork = {
            name: "testnet",
            url: "https://fullnode.testnet.sui.io:443",
            apiGateway: "https://dapi.api.sui-staging.bluefin.io",
            dmsURL: "https://dapi.api.sui-staging.bluefin.io/dead-man-switch",
            socketURL: "wss://dapi.api.sui-staging.bluefin.io",
            webSocketURL: "wss://notifications.api.sui-staging.bluefin.io",
            onboardingUrl: "https://testnet.bluefin.io",
            faucet: "https://faucet.devnet.sui.io",
        };
        const clientCustomNetwork = new bluefin_v2_client_1.BluefinClient(true, custNetwork, dummyAccountKey, "ED25519"); //passing isTermAccepted = true for compliance and authorizarion
        yield clientCustomNetwork.init();
        // prints client address
        console.log(clientCustomNetwork.getPublicAddress());
        //Initialise using readonly token
        // using predefined network
        const client_readme = new bluefin_v2_client_1.BluefinClient(false, bluefin_v2_client_1.Networks.TESTNET_SUI, dummyAccountKey, "ED25519" //valid values are ED25519 or Secp256k1
        ); // passing isTermAccepted = true for compliance and authorizarion
        yield client_readme.init(false, "9737fb68940ae27f95d5a603792d4988a9fdcf3efeea7185b43f2bd045ee87f9"); // initialze client via readOnlyToken
    });
}
main().then().catch(console.warn);
