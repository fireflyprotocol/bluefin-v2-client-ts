/* eslint-disable prettier/prettier */
/* eslint-disable no-undef */
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { setTimeout } from "timers/promises";

import {
  Faucet,
  MinifiedCandleStick,
  OrderSigner,
  ORDER_SIDE,
  ORDER_STATUS,
  // MinifiedCandleStick,
  ORDER_TYPE,
  parseSigPK,
  toBaseNumber,
} from "@firefly-exchange/library-sui";
import {
  BluefinClient,
  GetAccountDataResponse,
  GetMarketRecentTradesResponse,
  GetPositionResponse,
  GetUserTradesResponse,
  Networks,
  OrderSentForSettlementUpdateResponse,
  PlaceOrderResponse,
  TickerData,
} from "../index";
import { generateRandomNumber } from "../utils/utils";

chai.use(chaiAsPromised);

const testAcctKey =
  "person essence firm tail chapter forest return pulse dismiss unlock zebra amateur";
const testAcctPubAddr =
  "0x803da161f88726c43f1e17b230257d91eca0b84d851a4493b8341d7267e4dbc6";

const testSubAccKey =
  "inherit save afford act peanut retire fluid stool setup reject shallow already";
const testSubAccPubAddr =
  "0x7c550b81ce7f8f458f5520d55623eb5dd1013310323607c0c7b5c3625e47079e";

Faucet.requestSUI(testAcctPubAddr, Networks.TESTNET_SUI.faucet);
Faucet.requestSUI(testSubAccPubAddr, Networks.TESTNET_SUI.faucet);

//* set environment from here
const network = Networks.TESTNET_SUI;

let client: BluefinClient;

describe("BluefinClient", () => {
  let symbol = "ETH-PERP";
  let defaultLeverage = 3;
  let buyPrice = 1600;
  let sellPrice = 2000;
  let marketPrice = 0;
  let indexPrice = 1600;

  before(async () => {
    client = new BluefinClient(true, network, testAcctKey, "ED25519");
    await client.init();
    const allSymbols = await client.getMarketSymbols();
    //get first symbol to run tests on
    if (allSymbols.data) {
      symbol = allSymbols.data[0];
    }

    console.log(`--- Trading symbol: ${symbol} ---`);

    // get default leverage
    // defaultLeverage = await client.getUserDefaultLeverage(symbol);
    defaultLeverage = 3;
    console.log(`- on leverage: ${defaultLeverage}`);

    // market data
    const marketData = await client.getMarketData(symbol);
    if (marketData.data && toBaseNumber(marketData.data.marketPrice) > 0) {
      marketPrice = toBaseNumber(marketData.data.marketPrice);
      indexPrice = toBaseNumber(marketData.data.indexPrice);
      const percentChange = 3 / 100; // 3%
      buyPrice = Number((marketPrice - marketPrice * percentChange).toFixed(0));
      sellPrice = Number(
        (marketPrice + marketPrice * percentChange).toFixed(0)
      );
      console.log(`- market price: ${marketPrice}`);
      console.log(`- index price: ${indexPrice}`);
    }
  });

  beforeEach(async () => {
    client = new BluefinClient(true, network, testAcctKey, "Secp256k1");
    await client.init();
  });

  afterEach(() => {
    client.sockets.close();
  });

  it("should initialize the client", async () => {
    expect(client).to.be.not.eq(undefined);
  });

  it("should return public address of account", async () => {
    expect(client.getPublicAddress()).to.be.equal(testAcctPubAddr);
  });

  describe("Sub account Tests", () => {
    let clientSubAccount: BluefinClient;
    before(async () => {
      clientSubAccount = new BluefinClient(
        true,
        network,
        testAcctKey,
        "Secp256k1"
      );
      await clientSubAccount.init();

      // adding sub acc
      const resp = await client.setSubAccount(
        testSubAccPubAddr.toLowerCase(),
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
        testAcctKey,
        "Secp256k1"
      );
      await clientSubAccount.init();
    });

    it("set and get leverage on behalf of parent account", async () => {
      // make sure to first whitelist the subaccount with the below parent account to run this test.
      // To whitelist the subaccount use the above test {set sub account}
      // and subaccount must be authenticated/initialized with the client.
      // When
      const newLeverage = 5;
      const res = await clientSubAccount.adjustLeverage({
        symbol,
        leverage: newLeverage,
        parentAddress: testAcctPubAddr.toLowerCase(),
      }); // set leverage will do contract call as the account using is new
      const lev = await clientSubAccount.getUserDefaultLeverage(
        symbol,
        testAcctPubAddr.toLowerCase()
      ); // get leverage

      // Then
      expect(res.ok).to.eq(true);
      // expect(lev).to.equal(newLeverage);
    });
    it("should place a MARKET BUY order on behalf of parent exchange", async () => {
      // make sure to first whitelist the subaccount with the below parent account to run this test.
      // To whitelist the subaccount use the above test {set sub account}
      // and subaccount must be authenticated/initialized with the client.
      const signedOrder = await clientSubAccount.createSignedOrder({
        symbol,
        price: 0,
        quantity: 0.01,
        side: ORDER_SIDE.BUY,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.MARKET,
        // parent account
        maker: testAcctPubAddr,
      });
      const response = await clientSubAccount.placeSignedOrder({
        ...signedOrder,
      });
      expect(response.ok).to.be.equal(true);
    });
    it("should cancel the open order on behalf of parent account", async () => {
      // make sure to first whitelist the subaccount with the below parent account to run this test.
      // To whitelist the subaccount use the above test {set sub account}
      // and subaccount must be authenticated/initialized with the client.
      const signedOrder = await clientSubAccount.createSignedOrder({
        symbol,
        price: sellPrice,
        quantity: 0.01,
        side: ORDER_SIDE.SELL,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.LIMIT,
        maker: testAcctPubAddr,
      });
      const response = await clientSubAccount.placeSignedOrder({
        ...signedOrder,
        clientId: "test cancel order",
      });
      const cancelSignature =
        await clientSubAccount.createOrderCancellationSignature({
          symbol,
          hashes: [response.response.data.hash],
          parentAddress: testAcctPubAddr.toLowerCase(),
        });

      const cancellationResponse = await clientSubAccount.placeCancelOrder({
        symbol,
        hashes: [response.response.data.hash],
        signature: cancelSignature,
        parentAddress: testAcctPubAddr.toLowerCase(),
      });

      expect(cancellationResponse.ok).to.be.equal(true);
    });
    it("should get all open orders on behalf of parent account", async () => {
      // make sure to first whitelist the subaccount with the below parent account to run this test.
      // To whitelist the subaccount use the above test {set sub account}
      // and subaccount must be authenticated/initialized with the client.
      const data = await clientSubAccount.getUserOrders({
        statuses: [ORDER_STATUS.OPEN],
        symbol,
        parentAddress: testAcctPubAddr.toLowerCase(),
      });
      expect(data.ok).to.be.equals(true);
      expect(data.response.data.length).to.be.gte(0);
    });
    it("should get user's Position on behalf of parent account", async () => {
      // make sure to first whitelist the subaccount with the below parent account to run this test.
      // To whitelist the subaccount use the above test {set sub account}
      // and subaccount must be authenticated/initialized with the client.
      const response = await clientSubAccount.getUserPosition({
        symbol,
        parentAddress: testAcctPubAddr.toLowerCase(),
      });

      const position = response.data as any as GetPositionResponse;
      if (Object.keys(position).length > 0) {
        expect(response.response.data.symbol).to.be.equal(symbol);
      }
    });
    it("should get user's Trades on behalf of parent account", async () => {
      // make sure to first whitelist the subaccount with the below parent account to run this test.
      // To whitelist the subaccount use the above test {set sub account}
      // and subaccount must be authenticated/initialized with the client.
      const response = await clientSubAccount.getUserTrades({
        symbol,
        parentAddress: testAcctPubAddr,
      });
      expect(response.ok).to.be.equal(true);
    });

    it("should get user's Trades history on behalf of parent account", async () => {
      // make sure to first whitelist the subaccount with the below parent account to run this test.
      // To whitelist the subaccount use the above test {set sub account}
      // and subaccount must be authenticated/initialized with the client.
      const response = await clientSubAccount.getUserTradesHistory({
        symbol,
        parentAddress: testAcctPubAddr,
      });
      expect(response.ok).to.be.equal(true);
    });

    it("should get User Account Data on behalf of parent account", async () => {
      // make sure to first whitelist the subaccount with the below parent account to run this test.
      // To whitelist the subaccount use the above test {set sub account}
      // and subaccount must be authenticated/initialized with the client.
      const response = await clientSubAccount.getUserAccountData(
        testAcctPubAddr
      );
      expect(response.ok).to.be.equal(true);
    });
    it("should get Funding History records for user on behalf of parent account", async () => {
      // make sure to first whitelist the subaccount with the below parent account to run this test.
      // To whitelist the subaccount use the above test {set sub account}
      // and subaccount must be authenticated/initialized with the client.
      const response = await clientSubAccount.getUserFundingHistory({
        symbol,
        parentAddress: testAcctPubAddr,
      });
      expect(response.ok).to.be.equal(true);
    });
  });

  it("should whitelist the subaccount for One Click Trading", async () => {
    // whitelisting sub account
    const resp = await client.upsertSubAccount({
      subAccountAddress: testSubAccKey,
    });
    expect(resp.ok).to.be.equal(true);
    expect(resp.data.subAccountAddress).to.be.equal(testSubAccPubAddr);
  });

  // describe("Market", () => {
  //   it(`should add ${symbol} market`, async () => {
  //     expect(client.addMarket(symbol)).to.be.equal(true);
  //   });

  //   it(`should add ${symbol} market with custom orders contract address`, async () => {
  //     expect(
  //       client.addMarket(symbol, "0x36AAc8c385E5FA42F6A7F62Ee91b5C2D813C451C")
  //     ).to.be.equal(true);
  //   });

  //   it("should throw error as there is no market by name of TEST-PERP in deployedContracts", async () => {
  //     assert.throws(
  //       () => {
  //         client.addMarket("TEST-PERP");
  //       },
  //       Error,
  //       `Contract "IsolatedTrader" not found in contract addresses for network id ${network.chainId}`
  //     );
  //   });

  //   it("should add market despite not existing in deployed contracts", async () => {
  //     expect(
  //       client.addMarket(
  //         "TEST-PERP",
  //         "0x36AAc8c385E5FA42F6A7F62Ee91b5C2D813C451C"
  //       )
  //     ).to.be.equal(true);
  //   });

  //   it("should return False as BTC-PERP market is already added", async () => {
  //     expect(client.addMarket(symbol)).to.be.equal(true);
  //     expect(client.addMarket(symbol)).to.be.equal(false);
  //   });

  //   it("should remove the BTC market", async () => {
  //     expect(client.addMarket(symbol)).to.be.equal(true);
  //     expect(client.removeMarket(symbol)).to.be.equal(true);
  //   });

  //   it("should return false when trying to remove a non-existent market", async () => {
  //     expect(client.removeMarket(symbol)).to.be.equal(false);
  //   });
  // });

  // describe("Fund Gas", () => {
  //   it("get gas token balance", async () => {
  //     const response = await client.getChainNativeBalance();
  //     expect(bigNumber(response).gte(bigNumber(0))).to.eq(true);
  //   });
  // });

  describe("Balance", () => {
    it("should get 10K Test USDCs", async () => {
      const usdcBalance = await client.getUSDCBalance();
      expect(await client.mintTestUSDC(10000)).to.be.equal(true);
      expect(await client.getUSDCBalance()).to.be.gte(usdcBalance + 10000);
    });

    it("should move 1 USDC token to Margin Bank", async () => {
      const usdcBalance = await client.getUSDCBalance();
      expect((await client.depositToMarginBank(1))?.ok).to.be.equal(true);
      expect(await client.getMarginBankBalance()).to.be.gte(1);
      expect(await client.getUSDCBalance()).to.be.gte(usdcBalance - 1);
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

  describe("Leverage getter and setter", () => {
    beforeEach(async () => {
      //   client.addMarket(symbol);
    });

    it("set and get leverage", async () => {
      // Given
      const clientTemp = new BluefinClient(true, network);
      await clientTemp.init();
      // When
      const newLeverage = 4;
      const res = await clientTemp.adjustLeverage({
        symbol,
        leverage: newLeverage,
      }); // set leverage will do contract call as the account using is new
      const lev = await clientTemp.getUserDefaultLeverage(symbol); // get leverage
      // Then
      expect(res.ok).to.eq(true);
      expect(lev).to.equal(4);
    });
  });

  describe("Create/Place/Post Orders", () => {
    // it("should put 10K in margin bank", async () => {
    //   const minted = await client.mintTestUSDC();
    //   const coins = await client.getUSDCCoins(10000);
    //   const deposited = await client.depositToMarginBank(10000, coins[0].id);
    //   expect(minted).to.eq(true);
    //   expect(deposited.ok).to.eq(true);
    // });

    // it("should throw error as DOT market is not added to client", async () => {
    //   await expect(
    //     client.createSignedOrder({
    //       symbol: "DOT-TEST",
    //       price: 0,
    //       quantity: 0.1,
    //       side: ORDER_SIDE.SELL,
    //       orderType: ORDER_TYPE.MARKET,
    //     })
    //   ).to.be.eventually.rejectedWith(
    //     "Provided Market Symbol(DOT-TEST) is not added to client library"
    //   );
    // });

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

    it("should create signed order and verify the signature", async () => {
      const params = {
        symbol,
        price: 0,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        orderType: ORDER_TYPE.MARKET,
        expiration: Date.now() + 3600,
        salt: generateRandomNumber(1_000),
      };
      const signedOrder = await client.createSignedOrder(params);
      const orderPayload = client.createOrderToSign(params);
      const parsedSigPk = parseSigPK(signedOrder.orderSignature);
      const isValid = OrderSigner.verifySignatureUsingOrder(
        orderPayload,
        parsedSigPk.signature,
        parsedSigPk.publicKey
      );

      expect(isValid).to.be.equal(true);
    });

    it("should place a LIMIT SELL order on exchange", async () => {
      const signedOrder = await client.createSignedOrder({
        symbol,
        price: sellPrice,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.LIMIT,
      });

      const response = await client.placeSignedOrder({ ...signedOrder });
      expect(response.ok).to.be.equal(true);
    });

    it("should place a MARKET BUY order on exchange", async () => {
      const signedOrder = await client.createSignedOrder({
        symbol,
        price: 0,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.MARKET,
      });
      const response = await client.placeSignedOrder({ ...signedOrder });
      expect(response.ok).to.be.equal(true);
    });

    it("should post a LIMIT order on exchange", async () => {
      const response = await client.postOrder({
        symbol,
        price: buyPrice,
        quantity: 0.1,
        side: ORDER_SIDE.BUY,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.LIMIT,
        clientId: "Test limit order",
      });

      expect(response.ok).to.be.equal(true);
    });

    it("should post a BUY STOP LIMIT order on exchange", async () => {
      defaultLeverage = await client.getUserDefaultLeverage(symbol);
      const response = await client.postOrder({
        symbol,
        quantity: 0.1,
        side: ORDER_SIDE.BUY,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.STOP_LIMIT,
        clientId: "Test stop limit order",
        price: indexPrice + 4,
        triggerPrice: indexPrice + 2,
      });

      expect(response.ok).to.be.equal(true);
    });

    it("should post a SELL STOP LIMIT order on exchange", async () => {
      defaultLeverage = await client.getUserDefaultLeverage(symbol);
      const response = await client.postOrder({
        symbol,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.STOP_LIMIT,
        clientId: "Test stop limit order",
        price: indexPrice - 4,
        triggerPrice: indexPrice - 2,
      });

      expect(response.ok).to.be.equal(true);
    });
  });

  describe("Cancel Orders", () => {
    beforeEach(async () => {
      //   client.addMarket(symbol);
    });
    it("should create more than 15 orders then cancel them all", async () => {
      for (let i = 0; i < 16; i++) {
        const signedOrder = await client.createSignedOrder({
          symbol,
          price: sellPrice,
          quantity: 0.01,
          side: ORDER_SIDE.SELL,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.LIMIT,
        });
        await client.adjustLeverage({
          symbol: symbol,
          leverage: defaultLeverage,
        });
        const response = await client.placeSignedOrder({
          ...signedOrder,
          clientId: "test cancel order",
        });
      }
      const cancellationResponse = await client.cancelAllOpenOrders(symbol);
      expect(cancellationResponse.ok).to.be.equal(true);
    });

    it("should cancel the open order", async () => {
      const signedOrder = await client.createSignedOrder({
        symbol,
        price: sellPrice,
        quantity: 0.01,
        side: ORDER_SIDE.SELL,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.LIMIT,
      });
      await client.adjustLeverage({
        symbol: symbol,
        leverage: defaultLeverage,
      });
      const response = await client.placeSignedOrder({
        ...signedOrder,
        clientId: "test cancel order",
      });
      const cancelSignature = await client.createOrderCancellationSignature({
        symbol,
        hashes: [response.response.data.hash],
      });
      const cancellationResponse = await client.placeCancelOrder({
        symbol,
        hashes: [response.response.data.hash],
        signature: cancelSignature,
      });
      expect(cancellationResponse.ok).to.be.equal(true);
    });

    it("should get Invalid Order Signature error", async () => {
      const signedOrder = await client.createSignedOrder({
        symbol,
        price: sellPrice,
        quantity: 0.001,
        side: ORDER_SIDE.SELL,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.LIMIT,
      });
      const response = await client.placeSignedOrder({ ...signedOrder });
      const cancellationResponse = await client.placeCancelOrder({
        symbol,
        hashes: [response.response.data.hash],
        signature: "0xSomeRandomStringWhichIsNotACorrectSignature",
      });

      expect(cancellationResponse.ok).to.be.equal(false);
      expect(cancellationResponse.response.message).to.be.equal(
        "Invalid Order Signature"
      );
    });

    it("should post a cancel order on exchange", async () => {
      const response = await client.postOrder({
        symbol,
        price: sellPrice + 2,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.LIMIT,
      });
      expect(response.ok).to.be.equal(true);

      const cancelResponse = await client.postCancelOrder({
        symbol,
        hashes: [response?.data?.hash as string],
      });

      expect(cancelResponse.ok).to.be.equal(true);
    });

    it("should cancel all open orders", async () => {
      const response = await client.cancelAllOpenOrders(symbol);
      expect(response.ok).to.be.equal(true);
    });

    it("should cancel all open orders on behalf of parent account", async () => {
      const response = await client.cancelAllOpenOrders(
        symbol,
        testAcctPubAddr
      );
      expect(response.ok).to.be.equal(true);
    });

    xit("should cancel STOP LIMIT order on exchange", async () => {
      const response = await client.postOrder({
        symbol,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.STOP_LIMIT,
        price: indexPrice - 4,
        triggerPrice: indexPrice - 2,
      });
      expect(response.ok).to.be.equal(true);

      const cancelResponse = await client.postCancelOrder({
        symbol,
        hashes: [response?.data?.hash as string],
      });

      expect(cancelResponse.ok).to.be.equal(true);
    });

    xit("should cancel STOP MARKET order on exchange", async () => {
      const response = await client.postOrder({
        symbol,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.STOP_MARKET,
        price: indexPrice - 4,
        triggerPrice: indexPrice - 2,
      });
      expect(response.ok).to.be.equal(true);

      const cancelResponse = await client.postCancelOrder({
        symbol,
        hashes: [response?.data?.hash as string],
      });

      expect(cancelResponse.ok).to.be.equal(true);
    });
  });

  describe("Get User Orders", () => {
    it("should get all open orders", async () => {
      const data = await client.getUserOrders({
        statuses: [ORDER_STATUS.OPEN],
        symbol,
      });
      expect(data.ok).to.be.equals(true);
      expect(data.response.data.length).to.be.gte(0);
    });

    xit("should get all stand by stop orders", async () => {
      const data = await client.getUserOrders({
        statuses: [ORDER_STATUS.STAND_BY, ORDER_STATUS.STAND_BY_PENDING],
        symbol,
      });
      expect(data.ok).to.be.equals(true);
      expect(data.response.data.length).to.be.gte(0);
    });

    xit("should get all open orders on behalf of parent account", async () => {
      // make sure to first whitelist the subaccount with the below parent account to run this test.
      // To whitelist the subaccount use the above test {set sub account}
      // and subaccount must be authenticated/initialized with the client.
      const data = await client.getUserOrders({
        statuses: [ORDER_STATUS.OPEN],
        symbol,
        parentAddress:
          "0xFEa83f912CF21d884CDfb66640CfAB6029D940aF".toLowerCase(),
      });
      expect(data.ok).to.be.equals(true);
      expect(data.response.data.length).to.be.gte(0);
    });

    it("should handle get open orders of non-existent hashes", async () => {
      const data = await client.getUserOrders({
        statuses: [ORDER_STATUS.OPEN],
        symbol,
        orderHashes: ["test0"], // incorrect hash
      });
      expect(data.ok).to.be.equals(true);
      expect(data.response.data.length).to.be.eq(0);
    });

    it("should get open orders of specific hashes", async () => {
      const data = await client.getUserOrders({
        statuses: [ORDER_STATUS.OPEN],
        symbol,
      });
      if (data.ok && data.data!.length > 0) {
        const data1 = await client.getUserOrders({
          statuses: [ORDER_STATUS.OPEN],
          symbol,
          orderHashes: data.response.data[0].hash,
        });

        expect(data1.ok).to.be.equals(true);
        expect(data1.data!.length).to.be.eq(1);
      }

      expect(data.ok).to.be.equals(true);
    });

    it("should get all cancelled orders", async () => {
      const data = await client.getUserOrders({
        statuses: [ORDER_STATUS.CANCELLED],
        symbol,
      });
      expect(data.ok).to.be.equal(true);
    });

    it("should get cancelled orders", async () => {
      const data = await client.getUserOrders({
        statuses: [ORDER_STATUS.CANCELLED],
        symbol,
        pageSize: 1,
      });
      expect(data.ok).to.be.equals(true);
    });

    it("should get 0 expired orders as page 10 does not exist for expired orders", async () => {
      const data = await client.getUserOrders({
        statuses: [ORDER_STATUS.EXPIRED],
        symbol,
        pageNumber: 10,
      });
      expect(data.response.data.length).to.be.equals(0);
    });

    it("should get only LIMIT filled orders", async () => {
      const data = await client.getUserOrders({
        statuses: [ORDER_STATUS.FILLED],
        orderType: [ORDER_TYPE.LIMIT],
        symbol,
      });
      expect(data.ok).to.be.equals(true);
      expect(data.response.data.length).to.be.gte(0);
    });
  });

  describe("Get User Position", () => {
    beforeEach(async () => {
      //   client.addMarket(symbol);
    });

    it("should return zero open positions for the user", async () => {
      // Given
      const clientTemp = new BluefinClient(true, network);
      await clientTemp.init();

      const response = await clientTemp.getUserPosition({});

      // Then
      expect(response.ok).to.be.equal(true);
      expect(response.response.data.length).to.be.equal(0);

      clientTemp.sockets.close();
    });

    it("should get user's BTC-PERP Position", async () => {
      const response = await client.getUserPosition({
        symbol,
      });

      const position = response.data as any as GetPositionResponse;
      if (Object.keys(position).length > 0) {
        expect(response.response.data.symbol).to.be.equal(symbol);
      }
    });

    it("should get all open positions for the user across all markets", async () => {
      const response = await client.getUserPosition({});
      expect(response.ok).to.be.equal(true);
    });
  });

  describe("Get User Trades", () => {
    beforeEach(async () => {
      //   client.addMarket(symbol);
    });

    it("should return zero trades for the user", async () => {
      // Given
      //   const web3 = new Web3(network.url);
      //   const wallet = web3.eth.accounts.create();
      const clientTemp = new BluefinClient(true, network);
      await clientTemp.init();

      // When
      //   clientTemp.addMarket(symbol);
      const response = await clientTemp.getUserTrades({});

      // Then
      expect(response.ok).to.be.equal(true);
      expect(response.response.data.length).to.be.equal(0);
      clientTemp.sockets.close();
    });

    it("should get user's BTC-PERP Trades", async () => {
      const response = await client.getUserTrades({
        symbol,
      });
      expect(response.ok).to.be.equal(true);
    });

    it("should return zero trades history for the user", async () => {
      // Given
      //   const web3 = new Web3(network.url);
      //   const wallet = web3.eth.accounts.create();
      const clientTemp = new BluefinClient(true, network);
      await clientTemp.init();

      // When
      //   clientTemp.addMarket(symbol);
      const response = await clientTemp.getUserTradesHistory({});

      // Then
      expect(response.ok).to.be.equal(true);
      expect(response.response.data.data.length).to.be.equal(0);
      clientTemp.sockets.close();
    });
    it("should get user's BTC-PERP Trades History", async () => {
      const response = await client.getUserTradesHistory({
        symbol,
      });
      expect(response.ok).to.be.equal(true);
    });
  });

  describe("Get Market Orderbook", () => {
    it(`should get ${symbol} orderbook with best ask and bid`, async () => {
      const response = await client.getOrderbook({
        symbol,
        limit: 1,
      });
      expect(response.ok).to.be.equal(true);
      expect(response?.data?.limit).to.be.equal(1);
      expect(response?.data?.symbol).to.be.equal(symbol);
    });

    it("should get no orderbook data as market for DOGE-PERP does not exist", async () => {
      const response = await client.getOrderbook({
        symbol: "DODGE-PERP",
        limit: 1,
      });
      expect(response.ok).to.be.equal(false);
    });
  });

  describe("User History and Account Related Routes", async () => {
    it("should get User Account Data", async () => {
      const response = await client.getUserAccountData();
      expect(response.ok).to.be.equal(true);
    });

    it("should get Transaction History records for user", async () => {
      const response = await client.getUserTransactionHistory({
        symbol,
        pageSize: 2,
        pageNumber: 1,
      });
      expect(response.ok).to.be.equal(true);
    });

    it("should get Funding History records for user", async () => {
      const response = await client.getUserFundingHistory({
        pageSize: 2,
        cursor: 1,
      });
      expect(response.ok).to.be.equal(true);
    });

    it(`should get Funding History records of ${symbol}`, async () => {
      const response = await client.getUserFundingHistory({
        symbol,
        pageSize: 2,
        cursor: 1,
      });
      expect(response.ok).to.be.equal(true);
    });

    it("should get all Transfer History records for user", async () => {
      const response = await client.getUserTransferHistory({});
      expect(response.ok).to.be.equal(true);
    });

    it("should get Transfer History of `Withdraw` records for user", async () => {
      const response = await client.getUserTransferHistory({
        action: "Withdraw",
      });
      expect(response.ok).to.be.equal(true);
    });
  });

  it("should get contract address", async () => {
    const response = await client.getContractAddresses();
    expect(response.ok).to.be.equal(true);
  });

  it("should get recent market trades of BTC-PERP Market", async () => {
    const response = await client.getMarketRecentTrades({
      symbol,
    });
    expect(response.ok).to.be.equal(true);
  });

  it("should get candle stick data", async () => {
    const response = await client.getMarketCandleStickData({
      symbol,
      interval: "1m",
    });
    expect(response.ok).to.be.equal(true);
  });

  it("should get exchange info for BTC Market", async () => {
    const response = await client.getExchangeInfo(symbol);
    expect(response.ok).to.be.equal(true);
    expect(response.data?.symbol).to.be.equal(symbol);
  });

  it("should get exchange info for all markets", async () => {
    const response = await client.getExchangeInfo();
    expect(response.ok).to.be.equal(true);
    expect(response.response.data.length).to.be.gte(1);
  });

  it("should get market data for BTC Market", async () => {
    const response = await client.getMarketData(symbol);
    expect(response.ok).to.be.equal(true);
  });

  it("should get market meta info for BTC Market", async () => {
    const response = await client.getMarketMetaInfo(symbol);
    expect(response.ok).to.be.equal(true);
  });

  it("should get market ticker data for BTC Market", async () => {
    const response = await client.getTickerData(symbol);
    expect(response.ok).to.be.equal(true);
  });

  it("should get master info of all markets", async () => {
    const response = await client.getMasterInfo();
    expect(response.ok).to.be.equal(true);
  });

  it(`should get master info of ${symbol}`, async () => {
    const response = await client.getMasterInfo(symbol);
    expect(response.ok).to.be.equal(true);
  });

  it("should get market symbols", async () => {
    const response = await client.getMarketSymbols();
    expect(response.ok).to.be.equal(true);
  });

  it("should get status of exchange to be alive", async () => {
    const response = await client.getExchangeStatus();
    expect(response.ok).to.be.equal(true);
    expect(response.data?.isAlive).to.be.equal(true);
  });

  it(`should return funding rate of ${symbol}`, async () => {
    const response = await client.getMarketFundingRate(symbol);
    expect(response.ok).to.be.equal(true);
  });

  it(`should return verification status`, async () => {
    const response = await client.verifyDeposit(100);
    expect(response.ok).to.be.equal(true);
  });

  describe("Growth Routes", async () => {
    it("should not generate referral code for non affiliated user", async () => {
      const response = await client.generateReferralCode({
        referralCode: "testReferCode",
        campaignId: 2,
      });
      expect(response.ok).to.be.equal(false);
      expect((response?.data as any).error?.code).to.be.equal(3078);
    });
    it("should not link referred user when given incorrect refer code", async () => {
      const response = await client.affiliateLinkReferredUser({
        referralCode: "testReferCode",
      });
      expect(response.ok).to.be.equal(false);
      expect((response?.data as any).error?.code).to.be.equal(9000);
    });
    it("should get referrer info", async () => {
      const response = await client.getReferrerInfo();
      expect(response.ok).to.be.equal(true);
    });
    it("should get campaign details", async () => {
      const response = await client.getCampaignDetails();
      expect(response.ok).to.be.equal(true);
    });
    it("should get campaign rewards", async () => {
      const response = await client.getCampaignRewards(3);
      expect(response.ok).to.be.equal(true);
    });
    it("should get user rewards history", async () => {
      const response = await client.getUserRewardsHistory();
      expect(response.ok).to.be.equal(true);
    });
    it("should get user rewards summary", async () => {
      const response = await client.getUserRewardsSummary();
      expect(response.ok).to.be.equal(true);
    });
    it("should get trade & earn rewards overview", async () => {
      const response = await client.getTradeAndEarnRewardsOverview(2);
      expect(response.ok).to.be.equal(true);
    });
    it("should get trade & earn rewards details", async () => {
      const response = await client.getTradeAndEarnRewardsDetail({
        campaignId: 3,
      });
      expect(response.ok).to.be.equal(true);
    });
    it("should get trade & earn historical rewards total", async () => {
      const response = await client.getTotalHistoricalTradingRewards();
      expect(response.ok).to.be.equal(true);
    });
    it("should not get affiliate payouts when user is not an affiliate", async () => {
      const response = await client.getAffiliatePayouts(1);
      expect(response.ok).to.be.equal(false);
      expect((response?.data as any).error?.code).to.be.equal(3078);
    });
    it("should not get affiliate referee details when user is not an affiliate", async () => {
      const response = await client.getAffiliateRefereeDetails({
        campaignId: 2,
      });
      expect(response.ok).to.be.equal(false);
      expect((response?.data as any).error?.code).to.be.equal(3078);
    });
    it("should not get affiliate count when user is not an affiliate", async () => {
      const response = await client.getAffiliateRefereeCount(2);
      expect(response.ok).to.be.equal(false);
      expect((response?.data as any).error?.code).to.be.equal(9000);
    });
  });

  describe("Sockets", () => {
    beforeEach(async () => {
      client.sockets.open();
      //   client.addMarket(symbol);
      client.sockets.subscribeGlobalUpdatesBySymbol(symbol);
      client.sockets.subscribeUserUpdateByToken();
    });

    it("should receive an event from candle stick", (done) => {
      const callback = (candle: MinifiedCandleStick) => {
        expect(candle[candle.length - 1]).to.be.equal(symbol);
        done();
      };
      client.sockets.onCandleStickUpdate(symbol, "1m", callback);
    });

    it("should receive an event for orderbook update when an order is placed on exchange", (done) => {
      const callback = ({ orderbook }: any) => {
        expect(orderbook.symbol).to.be.equal(symbol);
        done();
      };

      client.sockets.onOrderBookUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: sellPrice + 3,
          quantity: 0.1,
          side: ORDER_SIDE.SELL,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.LIMIT,
        });
      });
    });

    it("should receive an event for ticker update", (done) => {
      const callback = (tickerUpdate: TickerData[]) => {
        expect(tickerUpdate.length).to.be.greaterThan(0);
        done();
      };

      client.sockets.onTickerUpdate(callback);
    });

    it("should receive an event when a trade is performed", (done) => {
      const callback = ({
        trades,
      }: {
        trades: GetMarketRecentTradesResponse[];
      }) => {
        expect(trades[0].symbol).to.be.equal(symbol);
        done();
      };

      client.sockets.onRecentTrades(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.SELL,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });

    it("should receive order update event", (done) => {
      const callback = ({ order }: { order: PlaceOrderResponse }) => {
        expect(order.symbol).to.be.equal(symbol);
        done();
      };

      client.sockets.onUserOrderUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: sellPrice + 1,
          quantity: 0.1,
          side: ORDER_SIDE.SELL,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.LIMIT,
        });
      });
    });

    it("should receive position update event", (done) => {
      const callback = ({ position }: { position: GetPositionResponse }) => {
        expect(position.userAddress).to.be.equal(
          client.getPublicAddress().toLocaleLowerCase()
        );
        done();
      };

      client.sockets.onUserPositionUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.BUY,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });

    it("should receive user update event", (done) => {
      const callback = ({ trade }: { trade: GetUserTradesResponse }) => {
        expect(trade.maker).to.be.equal(false);
        expect(trade.symbol).to.be.equal(symbol);
        done();
      };

      client.sockets.onUserUpdates(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.BUY,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });

    it("should receive user account update event", (done) => {
      const callback = ({
        accountData,
      }: {
        accountData: GetAccountDataResponse;
      }) => {
        expect(accountData.address).to.be.equal(
          client.getPublicAddress().toLocaleLowerCase()
        );
        done();
      };

      client.sockets.onUserAccountDataUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.BUY,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });
    it("should receive an sent for settlement event when trade is performed", (done) => {
      const callback = (update: OrderSentForSettlementUpdateResponse) => {
        expect(update.symbol).to.be.equal(symbol);
        done();
      };

      client.sockets.onUserOrderSentForSettlementUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(async () => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.001,
          side: ORDER_SIDE.SELL,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });
  });

  describe("WebSockets", () => {
    beforeEach(async () => {
      //   client.addMarket(symbol);
      await client.webSockets?.open();
      client.webSockets?.subscribeGlobalUpdatesBySymbol(symbol);
      client.webSockets?.subscribeUserUpdateByToken();
    });

    afterEach(() => {
      client.webSockets?.close();
    });

    it("WebSocket Client: should receive an event from candle stick", (done) => {
      const callback = (candle: MinifiedCandleStick) => {
        expect(candle[candle.length - 1]).to.be.equal(symbol);
        done();
      };
      client.webSockets?.onCandleStickUpdate(symbol, "1m", callback);
    });

    it("WebSocket Client: should receive an event for orderbook update when an order is placed on exchange", (done) => {
      const callback = ({ orderbook }: any) => {
        expect(orderbook.symbol).to.be.equal(symbol);
        done();
      };

      client.webSockets?.onOrderBookUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: sellPrice + 3,
          quantity: 0.1,
          side: ORDER_SIDE.SELL,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.LIMIT,
        });
      });
    });

    it("WebSocket Client: should receive an event for ticker update", (done) => {
      const callback = (tickerUpdate: TickerData[]) => {
        expect(tickerUpdate.length).to.be.greaterThan(0);
        done();
      };

      client.webSockets?.onTickerUpdate(callback);
    });

    it("WebSocket Client: should receive an event when a trade is performed", (done) => {
      const callback = ({
        trades,
      }: {
        trades: GetMarketRecentTradesResponse[];
      }) => {
        expect(trades[0].symbol).to.be.equal(symbol);
        done();
      };

      client.webSockets?.onRecentTrades(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.BUY,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });

    it("WebSocket Client: should receive order update event", (done) => {
      const callback = ({ order }: { order: PlaceOrderResponse }) => {
        expect(order.symbol).to.be.equal(symbol);
        done();
      };

      client.webSockets?.onUserOrderUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: sellPrice + 1,
          quantity: 0.1,
          side: ORDER_SIDE.BUY,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.LIMIT,
        });
      });
    });

    it("WebSocket Client: should receive position update event", (done) => {
      const callback = ({ position }: { position: GetPositionResponse }) => {
        expect(position.userAddress).to.be.equal(
          client.getPublicAddress().toLocaleLowerCase()
        );
        done();
      };

      client.webSockets?.onUserPositionUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.BUY,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });

    it("WebSocket Client: should receive user update event", (done) => {
      const callback = ({ trade }: { trade: GetUserTradesResponse }) => {
        expect(trade.maker).to.be.equal(false);
        expect(trade.symbol).to.be.equal(symbol);
        done();
      };

      client.webSockets?.onUserUpdates(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.BUY,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });

    it("WebSocket Client: should receive user account update event", (done) => {
      const callback = ({
        accountData,
      }: {
        accountData: GetAccountDataResponse;
      }) => {
        expect(accountData.address).to.be.equal(
          client.getPublicAddress().toLocaleLowerCase()
        );
        done();
      };

      client.webSockets?.onUserAccountDataUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.BUY,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });
    it("WebSocket Client: should receive an sent for settlement event when trade is performed", (done) => {
      const callback = (update: OrderSentForSettlementUpdateResponse) => {
        expect(update.symbol).to.be.equal(symbol);
        done();
      };

      client.webSockets?.onUserOrderSentForSettlementUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(async () => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.001,
          side: ORDER_SIDE.SELL,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });
  });

  describe("Cancel On Disconnect - DMS", () => {
    beforeEach(async () => {
      //   client.addMarket(symbol);
    });

    it("should return 1 market accepted for countdown reset", async () => {
      // When
      const response = await client.resetCancelOnDisconnectTimer({
        countDowns: [
          {
            symbol,
            countDown: 200000,
          },
        ],
      });

      // remove countdown
      await client.resetCancelOnDisconnectTimer({
        countDowns: [
          {
            symbol,
            countDown: 0,
          },
        ],
      });
      // Then
      expect(response.ok).to.be.equal(true);
      expect(
        response.response.data.acceptedToReset.length
      ).to.be.greaterThanOrEqual(1);
    });

    it("should get user's symbol's countdown", async () => {
      // When
      await client.resetCancelOnDisconnectTimer({
        countDowns: [
          {
            symbol,
            countDown: 200000,
          },
        ],
      });
      const response = await client.getCancelOnDisconnectTimer(symbol);
      // Then
      // remove countdown
      await client.resetCancelOnDisconnectTimer({
        countDowns: [
          {
            symbol,
            countDown: 0,
          },
        ],
      });
      expect(response.ok).to.be.equal(true);
      expect(response.response.data.countDowns.length).to.be.greaterThanOrEqual(
        1
      );
    });

    it("should cancel user's symbol's countdown", async () => {
      // When
      await client.resetCancelOnDisconnectTimer({
        countDowns: [
          {
            symbol,
            countDown: 200000,
          },
        ],
      });
      // remove countdown
      await client.resetCancelOnDisconnectTimer({
        countDowns: [
          {
            symbol,
            countDown: 0,
          },
        ],
      });

      const response = await client.getCancelOnDisconnectTimer(symbol);
      // Then
      expect(response.ok).to.be.equal(true);
      expect(response.response.data.countDowns.length).to.be.greaterThanOrEqual(
        0
      );
    });
  });
});
describe("BluefinClient via ReadOnlyToken", () => {
  //* set environment from here
  const symbol = "ETH-PERP";
  let defaultLeverage = 3;
  let sellPrice = 20000;
  let buyPrice = 18000;
  let marketPrice = 0;
  let indexPrice = 1600;
  let readOnlyToken = "";
  let readOnlyClient: BluefinClient;

  before(async () => {
    client = new BluefinClient(true, network, testAcctKey, "ED25519");
    await client.init();
    // TODO! uncomment when done testing specifically on BTC-PERP
    // const allSymbols = await client.getMarketSymbols();
    // get first symbol to run tests on
    // if (allSymbols.data) {
    //   symbol = allSymbols.data[0];
    // }
    // TODO! uncomment above code when done testing specifically on BTC-PERP

    console.log(`--- Trading symbol: ${symbol} ---`);

    // get default leverage
    defaultLeverage = await client.getUserDefaultLeverage(symbol);
    console.log(`- on leverage: ${defaultLeverage}`);

    // market data
    const marketData = await client.getMarketData(symbol);
    if (marketData.data && toBaseNumber(marketData.data.marketPrice) > 0) {
      marketPrice = toBaseNumber(marketData.data.marketPrice);
      indexPrice = toBaseNumber(marketData.data.indexPrice || "0");
      const percentChange = 3 / 100; // 3%
      buyPrice = Number((marketPrice - marketPrice * percentChange).toFixed(0));
      sellPrice = Number(
        (marketPrice + marketPrice * percentChange).toFixed(0)
      );
      console.log(`- market price: ${marketPrice}`);
      console.log(`- index price: ${indexPrice}`);
    }
    const response = await await client.generateReadOnlyToken();
    if (response.data) {
      readOnlyToken = response.data;
    }
  });

  beforeEach(async () => {
    client = new BluefinClient(true, network, testAcctKey);
    await client.init();

    readOnlyClient = new BluefinClient(true, network);
    await readOnlyClient.init(true, readOnlyToken);
  });

  afterEach(() => {
    client.sockets.close();
  });

  it("should initialize the client", async () => {
    readOnlyClient = new BluefinClient(true, network);
    await readOnlyClient.init(true, readOnlyToken);
    expect(readOnlyClient).to.be.not.eq(undefined);
  });

  describe("Get User Orders", () => {
    it("should get all open orders", async () => {
      const data = await readOnlyClient.getUserOrders({
        statuses: [ORDER_STATUS.OPEN],
        symbol,
      });
      expect(data.ok).to.be.equals(true);
      expect(data.response.data.length).to.be.gte(0);
    });

    it("should get all stand by stop orders", async () => {
      const data = await readOnlyClient.getUserOrders({
        statuses: [ORDER_STATUS.STAND_BY, ORDER_STATUS.STAND_BY_PENDING],
        symbol,
      });
      expect(data.ok).to.be.equals(true);
      expect(data.response.data.length).to.be.gte(0);
    });

    it("should handle get open orders of non-existent hashes", async () => {
      const data = await readOnlyClient.getUserOrders({
        statuses: [ORDER_STATUS.OPEN],
        symbol,
        orderHashes: ["test0"], // incorrect hash
      });
      expect(data.ok).to.be.equals(true);
      expect(data.response.data.length).to.be.eq(0);
    });

    it("should get open orders of specific hashes", async () => {
      const data = await readOnlyClient.getUserOrders({
        statuses: [ORDER_STATUS.OPEN],
        symbol,
      });
      if (data.ok && data.data!.length > 0) {
        const data1 = await client.getUserOrders({
          statuses: [ORDER_STATUS.OPEN],
          symbol,
          orderHashes: data.response.data[0].hash,
        });

        expect(data1.ok).to.be.equals(true);
        expect(data1.data!.length).to.be.eq(1);
      }

      expect(data.ok).to.be.equals(true);
    });

    it("should get all cancelled orders", async () => {
      const data = await readOnlyClient.getUserOrders({
        statuses: [ORDER_STATUS.CANCELLED],
        symbol,
      });
      expect(data.ok).to.be.equal(true);
    });

    it("should get cancelled orders", async () => {
      const data = await readOnlyClient.getUserOrders({
        statuses: [ORDER_STATUS.CANCELLED],
        symbol,
        pageSize: 1,
      });
      expect(data.ok).to.be.equals(true);
    });

    it("should get 0 expired orders as page 10 does not exist for expired orders", async () => {
      const data = await readOnlyClient.getUserOrders({
        statuses: [ORDER_STATUS.EXPIRED],
        symbol,
        pageNumber: 10,
      });
      expect(data.response.data.length).to.be.equals(0);
    });

    it("should get only LIMIT filled orders", async () => {
      const data = await readOnlyClient.getUserOrders({
        statuses: [ORDER_STATUS.FILLED],
        orderType: [ORDER_TYPE.LIMIT],
        symbol,
      });
      expect(data.ok).to.be.equals(true);
      expect(data.response.data.length).to.be.gte(0);
    });
  });

  describe("Get User Position", () => {
    it("should get user's BTC-PERP Position", async () => {
      const response = await readOnlyClient.getUserPosition({
        symbol,
      });

      const position = response.data as any as GetPositionResponse;
      if (Object.keys(position).length > 0) {
        expect(response.response.data.symbol).to.be.equal(symbol);
      }
    });

    it("should get all open positions for the user across all markets", async () => {
      const response = await readOnlyClient.getUserPosition({});
      expect(response.ok).to.be.equal(true);
    });
  });

  describe("Get User Trades", () => {
    it("should get user's BTC-PERP Trades", async () => {
      const response = await readOnlyClient.getUserTrades({
        symbol,
      });
      expect(response.ok).to.be.equal(true);
    });
    it("should get user's BTC-PERP Trades History", async () => {
      const response = await readOnlyClient.getUserTradesHistory({
        symbol,
      });
      expect(response.ok).to.be.equal(true);
    });
  });

  describe("Get Market Orderbook", () => {
    it(`should get ${symbol} orderbook with best ask and bid`, async () => {
      const response = await readOnlyClient.getOrderbook({
        symbol,
        limit: 1,
      });
      expect(response.ok).to.be.equal(true);
      expect(response?.data?.limit).to.be.equal(1);
      expect(response?.data?.symbol).to.be.equal(symbol);
    });

    it("should get no orderbook data as market for DOGE-PERP does not exist", async () => {
      const response = await readOnlyClient.getOrderbook({
        symbol: "DODGE-PERP",
        limit: 1,
      });
      expect(response.ok).to.be.equal(false);
    });
  });

  describe("User History and Account Related Routes", async () => {
    it("should get User Account Data", async () => {
      const response = await readOnlyClient.getUserAccountData();
      expect(response.ok).to.be.equal(true);
    });

    it("should get Transaction History records for user", async () => {
      const response = await client.getUserTransactionHistory({
        symbol,
        pageSize: 2,
        pageNumber: 1,
      });
      expect(response.ok).to.be.equal(true);
    });

    it("should get Funding History records for user", async () => {
      const response = await client.getUserFundingHistory({
        pageSize: 2,
        cursor: 1,
      });
      expect(response.ok).to.be.equal(true);
    });

    it(`should get Funding History records of ${symbol}`, async () => {
      const response = await client.getUserFundingHistory({
        symbol,
        pageSize: 2,
        cursor: 1,
      });
      expect(response.ok).to.be.equal(true);
    });

    it("should get all Transfer History records for user", async () => {
      const response = await client.getUserTransferHistory({});
      expect(response.ok).to.be.equal(true);
    });

    it("should get Transfer History of `Withdraw` records for user", async () => {
      const response = await client.getUserTransferHistory({
        action: "Withdraw",
      });
      expect(response.ok).to.be.equal(true);
    });
  });

  describe("Growth Routes", async () => {
    it("should not allow generate referral code on readOnlyToken", async () => {
      const response = await readOnlyClient.generateReferralCode({
        referralCode: "testReferCode",
        campaignId: 2,
      });
      expect(response.ok).to.be.equal(false);
      expect((response?.data as any).error?.code).to.be.equal(2004);
    });
    it("should not allow link referred user on readOnlyToken", async () => {
      const response = await readOnlyClient.affiliateLinkReferredUser({
        referralCode: "testReferCode",
      });
      expect(response.ok).to.be.equal(false);
      expect((response?.data as any).error?.code).to.be.equal(2004);
    });
    it("should get referrer info", async () => {
      const response = await readOnlyClient.getReferrerInfo();
      expect(response.ok).to.be.equal(true);
    });
    it("should get campaign details", async () => {
      const response = await readOnlyClient.getCampaignDetails();
      expect(response.ok).to.be.equal(true);
    });
    it("should get campaign rewards", async () => {
      const response = await readOnlyClient.getCampaignRewards(3);
      expect(response.ok).to.be.equal(true);
    });
    it("should get user rewards history", async () => {
      const response = await readOnlyClient.getUserRewardsHistory();
      expect(response.ok).to.be.equal(true);
    });
    it("should get user rewards summary", async () => {
      const response = await readOnlyClient.getUserRewardsSummary();
      expect(response.ok).to.be.equal(true);
    });
    it("should get trade & earn rewards overview", async () => {
      const response = await readOnlyClient.getTradeAndEarnRewardsOverview(2);
      expect(response.ok).to.be.equal(true);
    });
    it("should get trade & earn rewards details", async () => {
      const response = await readOnlyClient.getTradeAndEarnRewardsDetail({
        campaignId: 3,
      });
      expect(response.ok).to.be.equal(true);
    });
    it("should get trade & earn historical rewards total", async () => {
      const response = await readOnlyClient.getTotalHistoricalTradingRewards();
      expect(response.ok).to.be.equal(true);
    });
    it("should not get affiliate payouts when user is not an affiliate", async () => {
      const response = await readOnlyClient.getAffiliatePayouts(1);
      expect(response.ok).to.be.equal(false);
      expect((response?.data as any).error?.code).to.be.equal(3078);
    });
    it("should not get affiliate referee details when user is not an affiliate", async () => {
      const response = await readOnlyClient.getAffiliateRefereeDetails({
        campaignId: 2,
      });
      expect(response.ok).to.be.equal(false);
      expect((response?.data as any).error?.code).to.be.equal(3078);
    });
    it("should not get affiliate count when user is not an affiliate", async () => {
      const response = await readOnlyClient.getAffiliateRefereeCount(2);
      expect(response.ok).to.be.equal(false);
      expect((response?.data as any).error?.code).to.be.equal(9000);
    });
  });

  it("should get contract address", async () => {
    const response = await readOnlyClient.getContractAddresses();
    expect(response.ok).to.be.equal(true);
  });

  it("should get recent market trades of BTC-PERP Market", async () => {
    const response = await readOnlyClient.getMarketRecentTrades({
      symbol,
    });
    expect(response.ok).to.be.equal(true);
  });

  it("should get candle stick data", async () => {
    const response = await readOnlyClient.getMarketCandleStickData({
      symbol,
      interval: "1m",
    });
    expect(response.ok).to.be.equal(true);
  });

  it("should get exchange info for BTC Market", async () => {
    const response = await readOnlyClient.getExchangeInfo(symbol);
    expect(response.ok).to.be.equal(true);
    expect(response.data?.symbol).to.be.equal(symbol);
  });

  it("should get exchange info for all markets", async () => {
    const response = await readOnlyClient.getExchangeInfo();
    expect(response.ok).to.be.equal(true);
    expect(response.response.data.length).to.be.gte(1);
  });

  it("should get market data for BTC Market", async () => {
    const response = await readOnlyClient.getMarketData(symbol);
    expect(response.ok).to.be.equal(true);
  });

  it("should get market meta info for BTC Market", async () => {
    const response = await readOnlyClient.getMarketMetaInfo(symbol);
    expect(response.ok).to.be.equal(true);
  });

  it("should get market ticker data for BTC Market", async () => {
    const response = await readOnlyClient.getTickerData(symbol);
    expect(response.ok).to.be.equal(true);
  });

  it("should get master info of all markets", async () => {
    const response = await readOnlyClient.getMasterInfo();
    expect(response.ok).to.be.equal(true);
  });

  it("should get status of exchange to be alive", async () => {
    const response = await readOnlyClient.getExchangeStatus();
    expect(response.ok).to.be.equal(true);
    expect(response.data?.isAlive).to.be.equal(true);
  });

  it(`should return funding rate of ${symbol}`, async () => {
    const response = await readOnlyClient.getMarketFundingRate(symbol);
    expect(response.ok).to.be.equal(true);
  });

  describe("Sockets", () => {
    beforeEach(async () => {
      readOnlyClient.sockets.open();
      readOnlyClient.sockets.subscribeGlobalUpdatesBySymbol(symbol);
      readOnlyClient.sockets.subscribeUserUpdateByToken();
    });

    it("should receive an event for orderbook update when an order is placed on exchange", (done) => {
      const callback = ({ orderbook }: any) => {
        expect(orderbook.symbol).to.be.equal(symbol);
        done();
      };

      readOnlyClient.sockets.onOrderBookUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: sellPrice + 3,
          quantity: 0.1,
          side: ORDER_SIDE.SELL,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.LIMIT,
        });
      });
    });

    it("should receive an event for ticker update", (done) => {
      const callback = (tickerUpdate: TickerData[]) => {
        expect(tickerUpdate.length).to.be.greaterThan(0);
        done();
      };

      readOnlyClient.sockets.onTickerUpdate(callback);
    });

    it("should receive an event when a trade is performed", (done) => {
      const callback = ({
        trades,
      }: {
        trades: GetMarketRecentTradesResponse[];
      }) => {
        expect(trades[0].symbol).to.be.equal(symbol);
        done();
      };

      readOnlyClient.sockets.onRecentTrades(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.SELL,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });

    it("should receive order update event", (done) => {
      const callback = ({ order }: { order: PlaceOrderResponse }) => {
        expect(order.symbol).to.be.equal(symbol);
        done();
      };

      readOnlyClient.sockets.onUserOrderUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: sellPrice + 1,
          quantity: 0.1,
          side: ORDER_SIDE.SELL,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.LIMIT,
        });
      });
    });

    it("should receive position update event", (done) => {
      const callback = ({ position }: { position: GetPositionResponse }) => {
        expect(position.userAddress).to.be.equal(
          readOnlyClient.getPublicAddress().toLocaleLowerCase()
        );
        done();
      };

      readOnlyClient.sockets.onUserPositionUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.BUY,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });

    it("should receive user update event", (done) => {
      const callback = ({ trade }: { trade: GetUserTradesResponse }) => {
        expect(trade.maker).to.be.equal(false);
        expect(trade.symbol).to.be.equal(symbol);
        done();
      };

      readOnlyClient.sockets.onUserUpdates(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.BUY,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });

    it("should receive user account update event", (done) => {
      const callback = ({
        accountData,
      }: {
        accountData: GetAccountDataResponse;
      }) => {
        expect(accountData.address).to.be.equal(
          readOnlyClient.getPublicAddress().toLocaleLowerCase()
        );
        done();
      };

      readOnlyClient.sockets.onUserAccountDataUpdate(callback);

      // wait for 1 sec as room might not had been subscribed
      setTimeout(1000).then(() => {
        client.postOrder({
          symbol,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.BUY,
          leverage: defaultLeverage,
          orderType: ORDER_TYPE.MARKET,
        });
      });
    });
  });

  describe("Post failure via read-only token", () => {
    it("should initialize the client with pvt and readonlytoken", async () => {
      readOnlyClient = new BluefinClient(true, network, testAcctKey);
      await readOnlyClient.init(true, readOnlyToken);
      expect(readOnlyClient).to.be.not.eq(undefined);
    });

    it("should post a LIMIT order on exchange", async () => {
      const response = await readOnlyClient.postOrder({
        symbol,
        price: buyPrice,
        quantity: 0.1,
        side: ORDER_SIDE.BUY,
        leverage: defaultLeverage,
        orderType: ORDER_TYPE.LIMIT,
        clientId: "Test limit order",
      });
      expect(response.ok).to.be.equal(false); // forbidden
    });
  });
});
