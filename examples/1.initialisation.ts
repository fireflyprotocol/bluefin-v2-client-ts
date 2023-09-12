/**
 * Client initialization code example
 */

/* eslint-disable no-console */
import { Networks, BluefinClient, ExtendedNetwork } from "../index";

async function main() {
  const dummyAccountKey =
    "royal reopen journey royal enlist vote core cluster shield slush hill sample";

  // using predefined network
  const client = new BluefinClient(true, Networks.TESTNET_SUI, dummyAccountKey,"ED25519"); //passing isTermAccepted = true for compliance and authorizarion
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
  const clientCustomNetwork = new BluefinClient(true, custNetwork, dummyAccountKey, "ED25519"); //passing isTermAccepted = true for compliance and authorizarion
  await clientCustomNetwork.init()
  // prints client address
  console.log(clientCustomNetwork.getPublicAddress());
}

main().then().catch(console.warn);