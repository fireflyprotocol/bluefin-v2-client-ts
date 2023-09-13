/**
 *  Query user orders
 **/
import { BluefinClient, Networks, ORDER_STATUS } from "@bluefin-exchange/bluefin-v2-client";


async function main() {
  const dummyAccountKey =
    "trigger swim reunion gate hen black real deer light nature trial dust";

  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519" //valid values are ED25519 or Secp256k1
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();

  console.log(
    await client.getUserOrders({ statuses: [ORDER_STATUS.CANCELLED] })
  );
}

main().then().catch(console.warn);
