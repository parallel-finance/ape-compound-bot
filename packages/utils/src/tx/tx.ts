import { BigNumber, ethers } from "ethers"

export const getOptMaxFeePerGas = async (
  curGasPrice: BigNumber,
  isMainnet: boolean
): Promise<BigNumber> => {
  curGasPrice
  if (!isMainnet) return ethers.utils.parseUnits("1000", "gwei")
  const maxGasPrice = ethers.utils.parseUnits("25", "gwei")
  return maxGasPrice
  // const midGasPrice = ethers.utils.parseUnits("25", "gwei")
  // if (curGasPrice.gte(maxGasPrice)) return maxGasPrice
  // if (curGasPrice.gte(midGasPrice)) return midGasPrice
  // return curGasPrice.add(ethers.utils.parseUnits("1", "gwei"))
}
