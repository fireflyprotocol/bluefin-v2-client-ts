import {
  OnChainCalls,
  readFile,
  getSignerFromSeed,
  getProvider,
  DeploymentConfig,
  toBigNumberStr,
  bnToBaseStr,
  Transaction,
  USDC_BASE_DECIMALS,
} from "@firefly-exchange/library-sui";

const Config = {
  SUI_TESTNET: {
    provider:
      "https://api.shinami.com/node/v1//sui_testnet_0d359e0ce3682c1f5d0cab31de9d151b",
    deploymentPath: "./scripts/deployment.staging.json",
    deployerSeed:
      "royal reopen journey royal enlist vote core cluster shield slush hill sample",
  },
  SUI_MAINNET: {
    provider: "https://fullnode.mainnet.sui.io:443",
    deploymentPath: "./scripts/deployment.prod.json",
    deployerSeed:
      "basket trim bicycle ticket penalty window tunnel fit insane orange virtual tennis",
  },
};
const TestWallets = [
  {
    address:
      "0xd58fa2a3aca4d0083a17c4021a0b52cc42bd3b81389792dc088f1f2a61bd045f",
    seedPhrase:
      "winter ritual relief help opera west upset syrup pelican race pig cupboard",
    signer: undefined,
  },
  {
    address:
      "0x331ac99092385eef4b7b21119d7e7768b19f64bf64f046665c61719cedcb5b4b",
    seedPhrase:
      "nuclear sing before must grape castle zero solar surge token daring parrot",
    signer: undefined,
  },
  {
    address:
      "0x0adb709d5387a02378f40753c0f103551b79d6dda6a534bed984dad38373ad89",
    seedPhrase:
      "breeze student tool soon toddler artist head then snap script phrase antenna",
    signer: undefined,
  },
];

async function main() {
  const config = Config.SUI_MAINNET;
  const deployment = readFile(config.deploymentPath) as DeploymentConfig;
  const provider = getProvider(config.provider);
  const ownerSigner = getSignerFromSeed(config.deployerSeed, provider);
  const onChain = new OnChainCalls(ownerSigner, deployment);

  console.log(
    "usdc balance of the deployer %o",
    await onChain.getUSDCBalance()
  );
  console.log(
    "bank balance of the deployer %o",
    bnToBaseStr(await onChain.getUserBankBalance())
  );

  // create signer for each wallet
  for (const wallet of TestWallets) {
    wallet.signer = getSignerFromSeed(wallet.seedPhrase, provider);
  }

  const usdcAmount = 1000 * TestWallets.length;
  const coinObj = await onChain.getUSDCoinHavingBalance({
    amount: usdcAmount,
  });
  if (!coinObj) {
    console.error("Not enough balance");
    process.exit(1);
  }

  // deposit withdrawn amount concurrently from wallets
  const depositPromises = [];
  for (const wallet of TestWallets) {
    const depositPromise = onChain.depositToBank(
      {
        coinID: coinObj.coinObjectId,
        amount: toBigNumberStr(usdcAmount, USDC_BASE_DECIMALS),
        accountAddress: wallet.address,
      },
      ownerSigner
    );
    depositPromises.push(depositPromise);
  }

  for (const depositPromise of depositPromises) {
    try {
      const txResult = await depositPromise;
      // console.log("tx result = %o", txResult)
      const bankBalanceUpdateEvent = Transaction.getEvents(
        txResult,
        "BankBalanceUpdate"
      )[0];
      console.log("bank balance update event %o = ", bankBalanceUpdateEvent);
    } catch (err) {
      const errString = String(err);
      if (
        errString.indexOf("a quorum of validators because of locked objects") >=
        0
      ) {
        console.error("Transaction failed due to lock object issue");
      } else {
        console.error("Transaction failed due to unknown error %o", err);
      }
    }
  }
  // // withdraw amount concurrently from wallets
  // const withdrawPromises = []
  // for(const wallet of TestWallets) {
  //     const withdrawPromise = onChain.withdrawFromBank({
  //       amount: toBigNumberStr(usdcAmount, USDC_BASE_DECIMALS),
  //     }, wallet.signer);
  //     withdrawPromises.push(withdrawPromise)
  // }
  // await Promise.all(withdrawPromises).then(responses => {
  //   console.log("response of withdraw calls %o", responses)
  // })
}

main();
