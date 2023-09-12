/**
 * Getting user's USDC balance locked in Margin Bank
 */
import { BluefinClient, Networks } from "@bluefin-exchange/bluefin-v2-client";

async function main() {
  const dummyAccountKey =
    "royal reopen journey royal enlist vote core cluster shield slush hill sample";
  // using TESTNET network
  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    dummyAccountKey,
    "ED25519" //valid values are ED25519 or Secp256k1
  ); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();

  // will use margin bank contract from contractAddresses (initialized above)
  console.log(
    "User's locked USDC in margin bank are: ",
    await client.getMarginBankBalance()
  );
}

main().then().catch(console.warn);
