/**
 * Gets user open position on provided(all) markets
 */

/* eslint-disable no-console */
import { Networks, BluefinClient } from "../index";

async function main() {
  const dummyAccountKey =
    "trigger swim reunion gate hen black real deer light nature trial dust";

  const client = new BluefinClient(true, Networks.TESTNET_SUI, dummyAccountKey,"ED25519"); //passing isTermAccepted = true for compliance and authorizarion
  await client.init()

    // get all contract addresses
    const allContractAddresses = await client.getContractAddresses()
    console.log("Contract Addresses: ", allContractAddresses);
  
    // get contract addresses of specific symbol
    const dotContractAddresses = await client.getContractAddresses("ETH-PERP")
    console.log("Contract Addresses of ETH: ", dotContractAddresses);
}

main().then().catch(console.warn);