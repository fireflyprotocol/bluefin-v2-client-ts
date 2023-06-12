import {
  RawSigner,
  Keypair,
  JsonRpcProvider,
  Secp256k1Keypair,
  SignatureScheme,
  Ed25519Keypair,
  SuiTransactionBlockResponse,
} from "@mysten/sui.js";
import fs from "fs";
import {
  OnChainCalls,
  Faucet,
  toBigNumberStr,
  Transaction,
  Trader,
  OrderSigner,
  Order,
  ORDER_SIDE,
  TIME_IN_FORCE,
  toBigNumber,
} from "@firefly-exchange/library-sui";
import { OrderSignatureResponse } from "../src/interfaces/routes";

/**
 * Generates random number
 * @param multiplier number to multiply with random number generated
 * @returns random number
 */
export const generateRandomNumber = (multiplier: number) => {
  return Math.floor((Date.now() + Math.random() + Math.random()) * multiplier);
};

export function getSignerFromKeyPair(
  keypair: Keypair,
  provider: JsonRpcProvider
): RawSigner {
  return new RawSigner(keypair, provider);
}

export function getKeyPairFromSeed(
  seed: string,
  scheme: SignatureScheme = "Secp256k1"
): Keypair {
  switch (scheme) {
    case "ED25519":
      return Ed25519Keypair.deriveKeypair(seed);
    case "Secp256k1":
      return Secp256k1Keypair.deriveKeypair(seed);
    default:
      throw new Error("Provided scheme is invalid");
  }
}

export function getSignerFromSeed(
  seed: string,
  provider: JsonRpcProvider
): RawSigner {
  return getSignerFromKeyPair(getKeyPairFromSeed(seed), provider);
}

export function readFile(filePath: string): any {
  return fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath).toString())
    : {};
}

export async function setupTestAccounts(
  deployerWallet: OnChainCalls,
  testWallets: any[],
  faucetURL: string
): Promise<boolean> {
  {
    const mintAmount = 1000000000;
    for (const wallet of testWallets) {
      try {
        await Faucet.requestSUI(wallet.privateAddress, faucetURL);
      } catch (e) {
        console.log(e);
      }
    }
    for (const wallet of testWallets) {
      await deployerWallet.mintUSDC({
        amount: toBigNumberStr(mintAmount.toString(), 6),
        to: wallet.privateAddress,
        gasBudget: 10000000,
      });
    }
    return true;
  }
}

export async function performTrade(
  onChain: OnChainCalls,
  deployerSigner: RawSigner,
  makerOrder: OrderSignatureResponse,
  takerOrder: OrderSignatureResponse,
  tradePrice: number
): Promise<[boolean, SuiTransactionBlockResponse]> {
  const tx1 = await onChain.createSettlementOperator({
    operator: await deployerSigner.getAddress(),
    gasBudget: 400000000,
  });
  const settlementCapID = Transaction.getCreatedObjectIDs(tx1)[0];
  // Note: Assuming deployer is already price oracle operator
  // make admin of the exchange price oracle operator
  const tx2 = await onChain.setPriceOracleOperator({
    operator: await deployerSigner.getAddress(),
    gasBudget: 400000000,
  });
  const updateOPCapID = Transaction.getCreatedObjectIDs(tx2)[0];

  // set specific price on oracle
  const tx3 = await onChain.updateOraclePrice({
    price: toBigNumberStr(tradePrice),
    updateOPCapID: updateOPCapID,
    perpID: onChain.getPerpetualID(makerOrder.symbol),
    gasBudget: 400000000,
  });
  let status = Transaction.getStatus(tx3);
  const makerOnChainOrder: Order = {
    market: onChain.getPerpetualID(makerOrder.symbol),
    maker: makerOrder.maker,
    isBuy: makerOrder.side == ORDER_SIDE.BUY,
    reduceOnly: makerOrder.reduceOnly,
    postOnly: makerOrder.postOnly,
    orderbookOnly: makerOrder.orderbookOnly,
    ioc: makerOrder.timeInForce == TIME_IN_FORCE.IMMEDIATE_OR_CANCEL,
    quantity: toBigNumber(makerOrder.quantity),
    price: toBigNumber(makerOrder.price),
    leverage: toBigNumber(makerOrder.leverage),
    expiration: toBigNumber(makerOrder.expiration),
    salt: toBigNumber(makerOrder.salt),
  };
  const TakerOnChainOrder: Order = {
    market: onChain.getPerpetualID(makerOrder.symbol),
    maker: takerOrder.maker,
    isBuy: takerOrder.side == ORDER_SIDE.BUY,
    reduceOnly: takerOrder.reduceOnly,
    postOnly: takerOrder.postOnly,
    orderbookOnly: takerOrder.orderbookOnly,
    ioc: takerOrder.timeInForce == TIME_IN_FORCE.IMMEDIATE_OR_CANCEL,
    quantity: toBigNumber(takerOrder.quantity),
    price: toBigNumber(takerOrder.price),
    leverage: toBigNumber(takerOrder.leverage),
    expiration: toBigNumber(takerOrder.expiration),
    salt: toBigNumber(takerOrder.salt),
  };
  const tx = await onChain.trade({
    makerOrder: makerOnChainOrder,
    takerOrder: TakerOnChainOrder,
    makerSignature: makerOrder.orderSignature,
    takerSignature: takerOrder.orderSignature,
    settlementCapID,
    gasBudget: 400000000,
    perpID: onChain.getPerpetualID(makerOrder.symbol),
  });

  status = Transaction.getStatus(tx);
  if (status == "success") {
    console.log("Transaction success");
    return [true, tx];
  } else if (status == "failure") {
    console.log("Error:", Transaction.getError(tx));
    return [false, tx];
  } else {
    console.log("Transaction status %s", status);
    return [false, tx];
  }
}
