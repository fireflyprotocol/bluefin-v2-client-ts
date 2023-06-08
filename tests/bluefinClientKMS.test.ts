// /* eslint-disable prettier/prettier */
// /* eslint-disable no-undef */
// import chai, { expect } from "chai";
// import chaiAsPromised from "chai-as-promised";

// import {
//   ORDER_SIDE,
//   ORDER_TYPE,
//   toBaseNumber,
// } from "@firefly-exchange/library";

// import { FireflyClient, Networks } from "../index";
// import { AwsKmsSigner } from "ethers-aws-kms-signer";

// chai.use(chaiAsPromised);

// let client: FireflyClient;

// describe("FireflyClient", () => {
//   //* set environment from here
//   const network = Networks.TESTNET_SUI;
//   const symbol = "ETH-PERP";
//   let defaultLeverage = 3;
//   let buyPrice = 18000;
//   //@ts-ignore
//   let sellPrice = 20000;
//   let marketPrice = 0;
//   let indexPrice = 1600;
//   let testAcctPubAddr =
//     "0x6967C92D93809CdC5158AB0E84A9919c9D0e4096".toLowerCase();

//   before(async () => {
//     const kmsSigner = new AwsKmsSigner({
//       region: "ap-northeast-1",
//       keyId: "arn:aws:kms:ap-northxxxxxxx",
//     });

//     client = new FireflyClient(true, network, kmsSigner);
//     await client.init();
//     // TODO! uncomment when done testing specifically on BTC-PERP
//     // const allSymbols = await client.getMarketSymbols();
//     // get first symbol to run tests on
//     // if (allSymbols.data) {
//     //   symbol = allSymbols.data[0];
//     // }
//     // TODO! uncomment above code when done testing specifically on BTC-PERP

//     console.log(`--- Trading symbol: ${symbol} ---`);

//     // get default leverage
//     defaultLeverage = await client.getUserDefaultLeverage(symbol);
//     console.log(`- on leverage: ${defaultLeverage}`);

//     // market data
//     const marketData = await client.getMarketData(symbol);
//     if (marketData.data && toBaseNumber(marketData.data.marketPrice) > 0) {
//       marketPrice = toBaseNumber(marketData.data.marketPrice);
//       indexPrice = toBaseNumber(marketData.data.indexPrice || "0");
//       const percentChange = 3 / 100; // 3%
//       buyPrice = Number((marketPrice - marketPrice * percentChange).toFixed(0));
//       sellPrice = Number(
//         (marketPrice + marketPrice * percentChange).toFixed(0)
//       );
//       console.log(`- market price: ${marketPrice}`);
//       console.log(`- index price: ${indexPrice}`);
//     }
//   });

//   beforeEach(async () => {
//     const kmsSigner = new AwsKmsSigner({
//       region: "ap-northeast-1",
//       keyId: "arn:aws:kms:ap-northxxxxxxx",
//     });

//     client = new FireflyClient(true, network, kmsSigner);
//     await client.init();
//     client.addMarket(symbol);
//   });

//   afterEach(() => {
//     client.sockets.close();
//   });

//   it("should initialize the client", async () => {
//     expect(client).to.be.not.eq(undefined);
//   });

//   it("should return public address of account", async () => {
//     expect(client.getPublicAddress()).to.be.equal(testAcctPubAddr);
//   });

//   describe("Create/Place/Post Orders", () => {
//     beforeEach(async () => {
//       client.addMarket(symbol);
//     });
//     it("should throw error as DOT market is not added to client", async () => {
//       await expect(
//         client.createSignedOrder({
//           symbol: "DOT-TEST",
//           price: 0,
//           quantity: 0.1,
//           side: ORDER_SIDE.SELL,
//           orderType: ORDER_TYPE.MARKET,
//         })
//       ).to.be.eventually.rejectedWith(
//         "Provided Market Symbol(DOT-TEST) is not added to client library"
//       );
//     });

//     it("should create signed order", async () => {
//       const signedOrder = await client.createSignedOrder({
//         symbol,
//         price: 0,
//         quantity: 0.1,
//         side: ORDER_SIDE.SELL,
//         orderType: ORDER_TYPE.MARKET,
//       });

//       expect(signedOrder.leverage).to.be.equal(1);
//       expect(signedOrder.price).to.be.equal(0);
//       expect(signedOrder.quantity).to.be.equal(0.1);
//     });

//     it("should create signed order and verify the signature", async () => {
//       const params = {
//         symbol,
//         price: 0,
//         quantity: 0.1,
//         side: ORDER_SIDE.SELL,
//         orderType: ORDER_TYPE.MARKET,
//       };
//       const signedOrder = await client.createSignedOrder(params);
//       const isValid = client.verifyOrderSignature(signedOrder);

//       expect(isValid).to.be.equal(true);
//     });
//     it("should post a LIMIT order on exchange", async () => {
//       const response = await client.postOrder({
//         symbol,
//         price: buyPrice,
//         quantity: 0.1,
//         side: ORDER_SIDE.BUY,
//         leverage: defaultLeverage,
//         orderType: ORDER_TYPE.LIMIT,
//         clientId: "Test limit order",
//       });

//       expect(response.ok).to.be.equal(true);
//     });
//   });
// });
