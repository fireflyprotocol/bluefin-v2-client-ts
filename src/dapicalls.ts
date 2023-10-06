import { BluefinClient } from "./bluefinClient";
import { Networks } from "./constants";

async function main() {
  const client = new BluefinClient(
    true,
    Networks.TESTNET_SUI,
    "caution achieve impose that idea crawl gasp eyebrow enough human spot wrap",
    "ED25519"
  );
  await client.init();

  const sig = await client.createOnboardingSignature();
}

main();
