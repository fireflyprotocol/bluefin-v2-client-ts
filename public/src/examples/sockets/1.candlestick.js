"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Client initialization code example
 */
const bluefin_v2_client_1 = require("@bluefin-exchange/bluefin-v2-client");
function main() {
  return __awaiter(this, void 0, void 0, function* () {
    const dummyAccountKey =
      "royal reopen journey royal enlist vote core cluster shield slush hill sample";
    // using predefined network
    const client = new bluefin_v2_client_1.BluefinClient(
      true,
      bluefin_v2_client_1.Networks.TESTNET_SUI,
      dummyAccountKey,
      "ED25519"
    ); //passing isTermAccepted = true for compliance and authorizarion
    yield client.init();
    client.sockets.open();
    client.sockets.subscribeGlobalUpdatesBySymbol("ETH-PERP");
    client.sockets.subscribeUserUpdateByToken();
    let callback = (candle) => {
      console.log(candle);
      client.sockets.close();
    };
    client.sockets.onCandleStickUpdate("ETH-PERP", "1m", callback);
  });
}
main().then().catch(console.warn);
