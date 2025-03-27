import { BluefinClient } from "./src/bluefinClient";
import { Networks } from "./src/constants";

async function main() {
    const privateKey = "" //ENTER PRIVATE KEY
    const recipientAddress = "" //ENTER THE ADDRESS OF RECEIVER/DESTINATION
    const wUSDCAmount = 1 //ENTER the amount to transfer
    const network = Networks.PRODUCTION_SUI;

    const client = new BluefinClient(true, network, privateKey, "ED25519");
    await client.init();
    const response = await client.depositToRecipientMarginBank(
        wUSDCAmount,
        recipientAddress
    )

    console.log("response: ", response)
}

if (require.main === module) {
    main();
}