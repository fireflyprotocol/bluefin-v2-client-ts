import {
  OnChainCalls,
  readFile,
  getSignerFromSeed,
  getProvider,
  DeploymentConfig,
  Transaction,
  toBigNumberStr,
  bnToBaseStr,
  USDC_BASE_DECIMALS,
} from "@firefly-exchange/library-sui";

const Config = {
  SUI_TESTNET: {
    provider:
      "https://fullnode.testnet.sui.io:443",
    deploymentPath: "./scripts/deployment.staging.json",
    deployerSeed:
      "basket trim bicycle ticket penalty window tunnel fit insane orange virtual tennis",
  },
  SUI_MAINNET: {
    provider: "https://fullnode.mainnet.sui.io:443",
    deploymentPath: "./scripts/deployment.prod.json",
    deployerSeed:
      "basket trim bicycle ticket penalty window tunnel fit insane orange virtual tennis",
  },
};

async function main() {
  const recipients = [
    "0x3ee11925f4a59ac7a9b27d6b843d008f9ef7ca195848c0de2a8a5a7fe66cd36c",
    "0x8fff27f992d5bb6f16369048e5f302160820196c61fcc67454adccd8294a7241",
    "0x06eea2de87d0a4ef1bc94c99ed304479cb4c498e4f8c5a6739731015d17d5f99",
  ];

  const deployment = readFile(
    Config.SUI_MAINNET.deploymentPath
  ) as DeploymentConfig;
  const provider = getProvider(Config.SUI_MAINNET.provider);
  const ownerSigner = getSignerFromSeed(
    Config.SUI_MAINNET.deployerSeed,
    provider
  );
  const onChain = new OnChainCalls(ownerSigner, deployment);

  const usdcAmount = 1000000;
  console.log("deployer usdc balance %o", await onChain.getUSDCBalance());
  console.log(
    "deployer margin bank balance %o",
    bnToBaseStr(await onChain.getUserBankBalance())
  );

  const coinObj = await onChain.getUSDCoinHavingBalance({
    amount: usdcAmount,
  });
  if (coinObj) {
    for (const recipientAddress of recipients) {
      console.log("before credit");
      console.log(
        "recipient usdc balance %o",
        await onChain.getUSDCBalance({
          address: recipientAddress,
        })
      );
      console.log(
        "recipient margin bank balance %o",
        bnToBaseStr(
          await onChain.getUserBankBalance(recipientAddress),
          USDC_BASE_DECIMALS
        )
      );
      const txResult = await onChain.depositToBank(
        {
          coinID: coinObj.coinObjectId,
          amount: toBigNumberStr(usdcAmount, USDC_BASE_DECIMALS),
          accountAddress: recipientAddress,
          gasBudget: 10000000,
        },
        ownerSigner
      );
      const bankBalanceUpdateEvent = Transaction.getEvents(
        txResult,
        "BankBalanceUpdate"
      )[0];
      if (!bankBalanceUpdateEvent) {
        console.error("transaction failed %o", txResult);
        process.exit(1);
      }
      console.log("tx result = %o", txResult);
      console.log("bank balance update event %o = ", bankBalanceUpdateEvent);

      console.log("after credit");
      console.log(
        "recipient usdc balance %o",
        // eslint-disable-next-line no-await-in-loop
        await onChain.getUSDCBalance({
          address: recipientAddress,
        })
      );
      console.log(
        "recipient margin bank balance %o",
        bnToBaseStr(await onChain.getUserBankBalance(recipientAddress))
      );
    }
  }
}

main();
