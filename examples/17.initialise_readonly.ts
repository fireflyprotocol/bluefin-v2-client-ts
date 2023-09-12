/**
 * Client initialization code example
 */

/* eslint-disable no-console */
import { Networks, BluefinClient } from "../index";

async function main() {
  const dummyAccountKey =
    "trigger swim reunion gate hen black real deer light nature trial dust";

  // using predefined network
  const client = new BluefinClient(
    false,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519" //valid values are ED25519 or Secp256k1
  ); // passing isTermAccepted = true for compliance and authorizarion
  await client.init(
    false,
    "9737fb68940ae27f95d5a603792d4988a9fdcf3efeea7185b43f2bd045ee87f9"
  ); // initialze client via readOnlyToken
}

main().then().catch(console.warn);
