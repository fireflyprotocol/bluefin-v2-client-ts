/**
 * Client initialization code example
 */

/* eslint-disable no-console */
import { BluefinClient, Networks } from "@bluefin-exchange/bluefin-v2-client";

async function main() {
  const dummyAccountKey =
    "royal reopen journey royal enlist vote core cluster shield slush hill sample";

  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI // i.e. TESTNET_SUI or PRODUCTION_SUI
   
  ); //passing isTermAccepted = true for compliance and authorizarion

  // load/init contract addresses using read-only token
  await client.init(
    false,
    null,
    "52b5c5d010f5de84880d4b5bfcd9f79513bfa93ae367d884412cedb57c0c2a97"
  );

  //receive user positions using readonly client
  const response = await client.getUserPosition({ symbol: "ETH-PERP" });

  console.log(response.data);
}

main().then().catch(console.warn);
