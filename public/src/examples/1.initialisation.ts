/**
 * Client initialization code example
 */

/* eslint-disable no-console */

import {
  BluefinClient,
  ExtendedNetwork,
  Networks,
} from "@bluefin-exchange/bluefin-v2-client";

async function main() {
  const dummyAccountKey =
    "royal reopen journey royal enlist vote core cluster shield slush hill sample";

  // using seed phrase
  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519" //valid values are ED25519 or Secp256k1
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();
  // prints client address
  console.log(client.getPublicAddress());

  // using custom network
  const custNetwork: ExtendedNetwork = {
    name: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
    apiGateway: "https://dapi.api.sui-staging.bluefin.io",
    dmsURL: "https://dapi.api.sui-staging.bluefin.io/dead-man-switch",
    socketURL: "wss://dapi.api.sui-staging.bluefin.io",
    webSocketURL: "wss://notifications.api.sui-staging.bluefin.io",
    onboardingUrl: "https://testnet.bluefin.io",
    faucet: "https://faucet.devnet.sui.io",
  };
  const clientCustomNetwork = new BluefinClient(
    true,
    custNetwork,
    dummyAccountKey,
    "ED25519"
  ); //passing isTermAccepted = true for compliance and authorizarion
  await clientCustomNetwork.init();
  // prints client address
  console.log(clientCustomNetwork.getPublicAddress());

  //Initialise using readonly token
  // using predefined network
  const client_readme = new BluefinClient(
    false,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519" //valid values are ED25519 or Secp256k1
  ); // passing isTermAccepted = true for compliance and authorizarion
  await client_readme.init(
    false,
    "9737fb68940ae27f95d5a603792d4988a9fdcf3efeea7185b43f2bd045ee87f9"
  ); // initialze client via readOnlyToken

  //Initialise using private key
  const pvt_key_client = new BluefinClient(
    false,
    Networks.TESTNET_SUI,
    "0xf443768edf901263a0756cc442b9ed0d246ab31deb7f6d05c4d603b1f3fc6206",
    "ED25519" //valid values are ED25519 or Secp256k1
  ); // passing isTermAccepted = true for compliance and authorizarion
  await pvt_key_client.init();
}

main().then().catch(console.warn);
