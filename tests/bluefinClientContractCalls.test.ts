/* eslint-disable prettier/prettier */
/* eslint-disable no-undef */
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { setTimeout } from "timers/promises";

import {
  ORDER_SIDE,
  ORDER_TYPE,
  OnChainCalls,
  Transaction,
} from "../submodules/library-sui/src";
import { toBigNumberStr } from "../submodules/library-sui/src/library";
import { BluefinClient, Networks } from "../index";
import { getSignerFromSeed, readFile } from "../submodules/library-sui";
import { setupTestAccounts } from "../utils/utils";

chai.use(chaiAsPromised);

//please update deployer if contracts are redeployed
const deployer = {
  phrase:
    "invite panther true there fee just machine rent narrow apart carbon before",
  privateAddress:
    "0xdbd64f232e67693269692be1c1889fea8558fc7da2fbb6cc9dc6f0e6e4da9b6d",
};

const TEST_WALLETS = [
  {
    phrase:
      "stock denial column clip scrap shoe game advance erase twelve test repair",
    privateAddress:
      "0xb0a6ba03a533fc402541ba9eebc8bbadb7cb307850d0599058793a41f14f2424",
  },
  {
    phrase:
      "inherit save afford act peanut retire fluid stool setup reject shallow already",
    privateAddress:
      "0x7c550b81ce7f8f458f5520d55623eb5dd1013310323607c0c7b5c3625e47079e",
  },
];

describe.only("BluefinClient", () => {
  //* set environment from here
  let deplymentJson: any;
  const network = Networks.CLOUD_SUI;
  const symbol = "ETH-PERP";
  let defaultLeverage = 3;
  let buyPrice = 18000;
  let sellPrice = 20000;
  let marketPrice = 0;
  let indexPrice = 1600;
  let client: BluefinClient;
  let onChainCalls: OnChainCalls;
  before(async () => {
    client = new BluefinClient(
      true,
      network,
      TEST_WALLETS[0].phrase,
      "Secp256k1"
    );
    await client.init();
    defaultLeverage = 3;
    deplymentJson = await readFile("./deployment.json");
    const signer = getSignerFromSeed(deployer.phrase, client.getProvider());
    onChainCalls = new OnChainCalls(signer, deplymentJson);
    console.log(onChainCalls.getSettlementOperatorTable());
    await setupTestAccounts(onChainCalls, TEST_WALLETS);
  });

  beforeEach(async () => {
    client = new BluefinClient(
      true,
      network,
      TEST_WALLETS[0].phrase,
      "Secp256k1"
    );
    await client.init();
  });

  afterEach(() => {
    client.sockets.close();
  });

  it("should initialize the client", async () => {
    expect(client).to.be.not.eq(undefined);
  });

  it("should return public address of account", async () => {
    expect(client.getPublicAddress()).to.be.equal(
      TEST_WALLETS[0].privateAddress
    );
  });

  describe("Balance", () => {
    let errorMargin = 1;
    it("should get 10K Test USDCs", async () => {
      const usdcBalance = await client.getUSDCBalance();
      const tx = await onChainCalls.mintUSDC({
        amount: toBigNumberStr(10000, 9),
        to: client.getPublicAddress(),
      });
      expect(Transaction.getStatus(tx)).to.be.equal("success");
      expect(await client.getUSDCBalance()).to.be.gte(
        usdcBalance + 10000 - errorMargin
      );
    });

    it("should move 1 USDC token to Margin Bank", async () => {
      const usdcBalance = await client.getUSDCBalance();
      const depositAmount = 5;
      expect((await client.depositToMarginBank(depositAmount))?.ok).to.be.equal(
        true
      );
      expect(await client.getMarginBankBalance()).to.be.gte(depositAmount);
      expect(await client.getUSDCBalance()).to.be.gte(
        usdcBalance - (depositAmount + errorMargin)
      );
    });

    it("should withdraw 1 USDC token from Margin Bank", async () => {
      const usdcBalance = await client.getUSDCBalance();
      expect((await client.withdrawFromMarginBank(1))?.ok).to.be.equal(true);
      expect(await client.getUSDCBalance()).to.be.gte(usdcBalance + 1);
    });

    it("should move all USDC token from Margin Bank", async () => {
      expect((await client.withdrawFromMarginBank())?.ok).to.be.equal(true);
      expect(await client.getMarginBankBalance()).to.be.eql(0);
    });
  });

  describe("Create Orders", () => {
    beforeEach(async () => {
      //   client.addMarket(symbol);
    });

    it("should put 10K in margin bank", async () => {
      const minted = await client.mintTestUSDC();
      const coins = await client.getUSDCCoins(10000);
      const deposited = await client.depositToMarginBank(10000, coins[0].id);
      expect(minted).to.eq(true);
      expect(deposited.ok).to.eq(true);
    });

    it("should create signed order", async () => {
      const signedOrder = await client.createSignedOrder({
        symbol,
        price: 0,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        orderType: ORDER_TYPE.MARKET,
      });

      expect(signedOrder.leverage).to.be.equal(1);
      expect(signedOrder.price).to.be.equal(0);
      expect(signedOrder.quantity).to.be.equal(0.1);
    });
  });
  describe("Make Trade", () => {
    beforeEach(async () => {});

    it("should create signed order", async () => {
      const signedOrder = client.createSignedOrder({
        symbol,
        price: 0,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        orderType: ORDER_TYPE.MARKET,
      });

      expect(signedOrder.leverage).to.be.equal(1);
      expect(signedOrder.price).to.be.equal(0);
      expect(signedOrder.quantity).to.be.equal(0.1);
    });

    it("create Trade payload", async () => {
      const makerSignedOrder = client.createSignedOrder({
        symbol,
        price: 0,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        orderType: ORDER_TYPE.LIMIT,
      });
    });
  });

  describe.only("Sub account Tests", () => {
    let clientSubAccount: BluefinClient;
    before(async () => {
      clientSubAccount = new BluefinClient(
        true,
        network,
        TEST_WALLETS[0].phrase,
        "Secp256k1"
      );
      await clientSubAccount.init();

      // adding sub acc
      const resp = await client.setSubAccount(
        TEST_WALLETS[1].privateAddress,
        true
      );
      if (!resp.ok) {
        throw Error(resp.message);
      }
    });
    beforeEach(async () => {
      clientSubAccount = new BluefinClient(
        true,
        network,
        TEST_WALLETS[0].phrase,
        "Secp256k1"
      );
      await clientSubAccount.init();
    });

    it("set and get leverage on behalf of parent account", async () => {
      // The user needs to have an open position to set leverage
      // When
      const newLeverage = 5;
      const res = await clientSubAccount.adjustLeverage({
        symbol,
        leverage: newLeverage,
        parentAddress: TEST_WALLETS[0].privateAddress.toLowerCase(),
      }); // set leverage will do contract call as the account using is new
      // Then
      if (!res.ok) {
        throw Error(res.message);
      }
      expect(res.ok).to.eq(true);
    });
  });
});
