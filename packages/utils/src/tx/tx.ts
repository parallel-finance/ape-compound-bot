import { BigNumber, ethers } from "ethers"

export const getOptMaxFeePerGas = async (
  curGasPrice: BigNumber,
  isMainnet: boolean
): Promise<BigNumber> => {
  const maxGasPrice = ethers.utils.parseUnits("30", "gwei")
  const midGasPrice = ethers.utils.parseUnits("25", "gwei")
  if (!isMainnet) return maxGasPrice
  if (curGasPrice.gte(maxGasPrice)) return maxGasPrice
  if (curGasPrice.gte(midGasPrice)) return midGasPrice
  return curGasPrice.add(ethers.utils.parseUnits("1", "gwei"))
}
