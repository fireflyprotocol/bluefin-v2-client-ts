import {
  address,
  ADJUST_MARGIN,
  FactoryName,
  mapContract,
  NETWORK_NAME,
  toBigNumber,
  toBigNumberStr,
} from "@firefly-exchange/library";

import { Contract, Signer, Wallet } from "ethers";
import { DEFAULT_PRECISION, EXTRA_FEES } from "../constants";
import { SuccessMessages, TransformToResponseSchema } from "./contractErrorHandling.service";
//@ts-ignore
import { default as interpolate } from "interpolate";
import { OnChainCalls } from "../../submodules/library-sui/src";
import { RawSigner, SignerWithProvider, SuiTransactionBlockResponse } from "@mysten/sui.js";

export const adjustLeverageContractCall = async (
  perpContract: any,
  wallet: Signer | Wallet,
  leverage: number,
  gasLimit: number,
  networkName: string,
  getPublicAddress: () => address
) => {
  const contract = mapContract(networkName, FactoryName.perpetual, perpContract).connect(wallet)

  //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
  if (networkName == NETWORK_NAME.arbitrum) {
    gasLimit = (+await contract.estimateGas.adjustLeverage(getPublicAddress(), toBigNumberStr(leverage))) + EXTRA_FEES;    
  }
  return TransformToResponseSchema(async () => {
    const tx = await contract.adjustLeverage(getPublicAddress(), toBigNumberStr(leverage), {
      gasLimit,
    });
    if (wallet instanceof Wallet) {
      return tx.wait();
    }

    return tx;
  }, interpolate(SuccessMessages.adjustLeverage, {leverage}));
};

export const setSubAccount=async (
  perpContract:any,
  publicAddress:address,
  status:boolean,
  wallet: Signer | Wallet,
  gasLimit: number,
  networkName: string
)=>{
  const contract = mapContract(networkName, FactoryName.perpetual, perpContract).connect(wallet);

  if (networkName == NETWORK_NAME.arbitrum) {
    gasLimit = (+await contract.estimateGas.setSubAccount(publicAddress,status)) + EXTRA_FEES;    
  }

  return TransformToResponseSchema(async () => {
    const tx = await contract.setSubAccount(publicAddress, status, {
      gasLimit,
    });
    if (wallet instanceof Wallet) {
      return tx.wait();
    }

    return tx;
  }, interpolate(SuccessMessages.setSubAccounts, {address:publicAddress,status:status?"added":"removed"}));

}

export const adjustMarginContractCall = async (
  operationType: ADJUST_MARGIN,
  perpContract: any,
  wallet: Signer | Wallet,
  amount: number,
  gasLimit: number,
  networkName: string,
  getPublicAddress: () => address
) => {
  const contract = mapContract(networkName, FactoryName.perpetual, perpContract).connect(wallet)

  //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
  if (networkName == NETWORK_NAME.arbitrum) {
    if (operationType == ADJUST_MARGIN.Add) {
      gasLimit = (+await contract.estimateGas.addMargin(getPublicAddress(), toBigNumberStr(amount))) + EXTRA_FEES;
    }
    else {
      gasLimit = (+await contract.estimateGas.removeMargin(getPublicAddress(), toBigNumberStr(amount))) + EXTRA_FEES;
    }
  }
  const msg = operationType === ADJUST_MARGIN.Add ? SuccessMessages.adjustMarginAdd : SuccessMessages.adjustMarginRemove
  return TransformToResponseSchema(async () => {
    // ADD margin
    if (operationType === ADJUST_MARGIN.Add) {
      const tx = await contract
        .addMargin(getPublicAddress(), toBigNumberStr(amount), {
          gasLimit: gasLimit,
        });
      if (wallet instanceof Wallet) {
        return tx.wait();
      }

      return tx;
    }
    // REMOVE margin
    else {
      const tx = await contract
        .removeMargin(getPublicAddress(), toBigNumberStr(amount), {
          gasLimit: gasLimit,
        });
      if (wallet instanceof Wallet) {
        return tx.wait();
      }

      return tx;
    }
  }, interpolate(msg, {amount: amount.toFixed(DEFAULT_PRECISION)}));
};

export const withdrawFromMarginBankContractCall = async (
  amount: Number,
  contractCalls:OnChainCalls,
  signer:RawSigner,
):Promise<SuiTransactionBlockResponse> => {
  return await contractCalls.withdrawFromBank(
    {
      amount: amount.toString(),
    },
    signer
  );
};

// export const approvalFromUSDCContractCall = async (
//   tokenContract: any,
//   marginBankContract: any,
//   amount: number,
//   MarginTokenPrecision: number,
//   wallet: Signer | Wallet,
//   gasLimit: number,
//   networkName: string,
// ) => {
//   const amountString = toBigNumberStr(amount, MarginTokenPrecision);
//   const contract = (tokenContract as Contract).connect(wallet)
//   const mbContract = mapContract(networkName, FactoryName.marginBank, marginBankContract)

//   //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
//   if (networkName == NETWORK_NAME.arbitrum) {
//     gasLimit = (+await contract.estimateGas.approve((mbContract).address, amountString)) + EXTRA_FEES;    
//   }

//   return TransformToResponseSchema(async () => {
//     return await(
//       await contract
//         .approve(
//           (mbContract).address,
//           amountString,
//           { gasLimit: gasLimit }
//         )
//     ).wait();
//   }, interpolate(SuccessMessages.approveUSDC, {amount: amount.toFixed(DEFAULT_PRECISION)}));
// };

export const depositToMarginBankContractCall = async (
  amount: number,
  coinID: string,
  contractCalls:OnChainCalls,
  signer:RawSigner,  
): Promise<SuiTransactionBlockResponse> => {
  return await contractCalls.depositToBank(
    {
      amount: amount.toString(),
      coinID: coinID
    },
    signer
  );
};
