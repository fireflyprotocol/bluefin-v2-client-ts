import { Networks, BluefinClient } from "@bluefin-exchange/bluefin-v2-client";
import { TEST_ACCT_KEY, TEST_SUB_ACCT_KEY } from "./config";

async function main() {

    // account keys
    const parentAccountKey ="" || TEST_ACCT_KEY;
    const childAccountKey = "" || TEST_SUB_ACCT_KEY;

    // initialize the parent account client
    const clientParent = new BluefinClient(
        true,
        Networks.TESTNET_SUI,
        parentAccountKey,
        "ED25519"
    );
    await clientParent.init();

    // initialize the child account client
    const clientChild = new BluefinClient(
        true,
        Networks.TESTNET_SUI,
        childAccountKey,
        "ED25519"
    );
    await clientChild.init();

    // Add child account as subaccount
    const resp1 = await clientParent.setSubAccount(
        clientChild.getPublicAddress(),
        true
    );

    console.log(resp1);

    // Remove child account as subaccount
    const resp2 = await clientParent.setSubAccount(
        clientChild.getPublicAddress(),
        false
    );

    console.log(resp2);
}

main().then().catch(console.warn);
