/* eslint-disable prettier/prettier */
/* eslint-disable no-undef */
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

import {
  BASE_DECIMALS,
  ORDER_SIDE,
  ORDER_TYPE,
  OnChainCalls,
  TIME_IN_FORCE,
  Transaction,
  USDC_BASE_DECIMALS,
} from "@firefly-exchange/library-sui";
import { toBigNumberStr } from "@firefly-exchange/library-sui";
import { BluefinClient, Networks, OrderSignatureResponse } from "../index";
import { getSignerFromSeed, readFile } from "@firefly-exchange/library-sui";
import { performTrade, setupTestAccounts } from "../utils/utils";

chai.use(chaiAsPromised);

//please update deployer if contracts are redeployed
const deployer = {
  phrase:
    "explain august dream guitar mail attend enough demise engine pulse wide later",
  privateAddress:
    "0x958fb79396a09247d6c05aa9bcd51a94f6233c1399ec15e07a07ff4b77e5578c",
};

const TEST_WALLETS = [
  {
    phrase:
      "weasel knee fault hammer gift joke ability tilt brass about ladder ramp",
    privateAddress:
      "0x551db36b08c694b8382fab5cec41641a07fbe6e8b36dfdb1d6376a8f39d9e1dc",
  },
  {
    phrase:
      "blouse swim window brother elephant winner act pencil visa acoustic try west",
    privateAddress:
      "0xae718f76f26af59a9b33913be566627fa598ca80891a417d6a94e72bd5c24e6f",
  },
];

describe.only("BluefinClient", () => {
  //* set environment from here
  let deplymentJson: any;
  const network = Networks.LOCAL_SUI;
  const symbol = "BTC-PERP";
  let defaultLeverage = 1;
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
    deplymentJson = await readFile(
      "/home/radheem/github/bluefin-client-sui/deployment.json"
    );
    expect(deplymentJson).to.be.not.eq(undefined);
    const signer = getSignerFromSeed(deployer.phrase, client.getProvider());
    onChainCalls = new OnChainCalls(signer, deplymentJson);
    await setupTestAccounts(onChainCalls, TEST_WALLETS, network.faucet);
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
    it("should get 10K Test USDCs", async () => {
      const usdcBalance = await client.getUSDCBalance();
      const mintAmount = 10000;
      const tx = await onChainCalls.mintUSDC({
        amount: toBigNumberStr(mintAmount, BASE_DECIMALS),
        to: client.getPublicAddress(),
      });
      expect(Transaction.getStatus(tx)).to.be.equal("success");
      const expectedBalance =
        Math.round((usdcBalance + mintAmount) * 100) / 100;
      const newBalance =
        Math.round((await client.getUSDCBalance()) * 100) / 100;
      expect(newBalance).to.be.gte(expectedBalance);
    });

    it("should move 1 USDC token to Margin Bank", async () => {
      const usdcBalance = await client.getUSDCBalance();
      const marginBankBalance = await client.getMarginBankBalance();
      const depositAmount = 1;
      expect((await client.depositToMarginBank(depositAmount))?.ok).to.be.equal(
        true
      );
      const newBalance =
        Math.round((await client.getUSDCBalance()) * 100) / 100;
      const expectedBalance =
        Math.round((usdcBalance - depositAmount) * 100) / 100;
      expect(newBalance).to.be.lte(expectedBalance);
      const newMarginBankBalance =
        Math.round((await client.getMarginBankBalance()) * 100) / 100;
      const expectedMarginBankBalance =
        Math.round((marginBankBalance + depositAmount) * 100) / 100;
      expect(newMarginBankBalance).to.be.gte(expectedMarginBankBalance);
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
    beforeEach(async () => {});

    it("should create signed order", async () => {
      const signedOrder = await client.createSignedOrder({
        symbol,
        price: 0,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        orderType: ORDER_TYPE.MARKET,
      });
      expect(signedOrder.leverage).to.be.equal(defaultLeverage);
      expect(signedOrder.price).to.be.equal(0);
      expect(signedOrder.quantity).to.be.equal(0.1);
    });
  });

  describe("Trade", () => {
    let maker: BluefinClient;
    let taker: BluefinClient;
    let signedMakerOrder: OrderSignatureResponse;
    let signedTakerOrder: OrderSignatureResponse;
    const tradePrice = 1800;
    const tradeQty = 0.1;
    const depositAmount = tradePrice * tradeQty;
    before(async () => {
      maker = new BluefinClient(
        true,
        Networks.LOCAL_SUI,
        TEST_WALLETS[0].phrase,
        "Secp256k1"
      );
      await maker.init();
      taker = new BluefinClient(
        true,
        Networks.LOCAL_SUI,
        TEST_WALLETS[1].phrase,
        "Secp256k1"
      );
      await taker.init();
      await setupTestAccounts(
        onChainCalls,
        TEST_WALLETS,
        Networks.LOCAL_SUI.faucet
      );
      let tx = await onChainCalls.mintUSDC({
        amount: toBigNumberStr(10000, USDC_BASE_DECIMALS),
        to: maker.getPublicAddress(),
      });
      expect(Transaction.getStatus(tx)).to.be.equal("success");
      tx = await onChainCalls.mintUSDC({
        amount: toBigNumberStr(10000, USDC_BASE_DECIMALS),
        to: taker.getPublicAddress(),
      });
      expect(Transaction.getStatus(tx)).to.be.equal("success");
    });

    beforeEach(async () => {});

    afterEach(() => {});

    it("should have required USDCs", async () => {
      const balance = await maker.getUSDCBalance();
      expect(balance).to.be.gte(depositAmount);
      const balance2 = await taker.getUSDCBalance();
      expect(balance2).to.be.gte(depositAmount);
    });

    it("should move required USDC token to Margin Bank", async () => {
      const balance = await maker.getMarginBankBalance();
      const resp = await maker.depositToMarginBank(depositAmount);
      expect(resp.ok).to.be.equal(true);
      expect(await maker.getMarginBankBalance()).to.be.gte(
        balance + depositAmount
      );
      const balance1 = await taker.getMarginBankBalance();
      const resp1 = await taker.depositToMarginBank(depositAmount);
      expect(resp1.ok).to.be.equal(true);
      expect(await taker.getMarginBankBalance()).to.be.gte(
        balance1 + depositAmount
      );
    });

    it("should create signed maker order", async () => {
      signedMakerOrder = await maker.createSignedOrder({
        symbol,
        price: tradePrice,
        quantity: tradeQty,
        side: ORDER_SIDE.SELL,
        orderType: ORDER_TYPE.LIMIT,
        timeInForce: TIME_IN_FORCE.GOOD_TILL_TIME,
      });

      expect(signedMakerOrder.leverage).to.be.equal(defaultLeverage);
      expect(signedMakerOrder.price).to.be.equal(tradePrice);
      expect(signedMakerOrder.quantity).to.be.equal(tradeQty);
    });

    it("should create signed taker order", async () => {
      signedTakerOrder = await taker.createSignedOrder({
        symbol,
        price: tradePrice,
        quantity: tradeQty,
        side: ORDER_SIDE.BUY,
        orderType: ORDER_TYPE.MARKET,
        timeInForce: TIME_IN_FORCE.IMMEDIATE_OR_CANCEL,
      });

      expect(signedTakerOrder.leverage).to.be.equal(defaultLeverage);
      expect(signedTakerOrder.price).to.be.equal(tradePrice);
      expect(signedTakerOrder.quantity).to.be.equal(tradeQty);
    });

    it("should perform trade", async () => {
      const [success, tx] = await performTrade(
        onChainCalls,
        getSignerFromSeed(deployer.phrase, maker.getProvider()),
        signedMakerOrder,
        signedTakerOrder,
        tradePrice
      );
      if (!success) {
        console.log(
          "\n#################################################################\nTransaction: ",
          tx,
          "\n#################################################################"
        );
      }
      expect(success).to.be.equal(true);
    });
  });

  describe("Sub account Tests", () => {
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
    // TODO: Uncomment once DAPI is up
    // it("get leverage on behalf of parent account", async () => {
    //   const res = await clientSubAccount.getUserDefaultLeverage(
    //     symbol,
    //     TEST_WALLETS[0].privateAddress.toLowerCase()
    //   ); // set leverage will do contract call as the account using is new
    //   // Then
    //   console.log("res", res);
    //   expect(res).to.eq(defaultLeverage);
    // });

    it("set leverage on behalf of parent account", async () => {
      // The user needs to have an open position to set leverage
      // When
      const newLeverage = 2;
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
