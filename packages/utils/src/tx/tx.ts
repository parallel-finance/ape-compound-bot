import { BigNumber, ethers } from "ethers"

export const getOptMaxFeePerGas = async (): Promise<BigNumber> => {
  const nowUTCHour = new Date().getUTCHours()

  // UTC 2:00 ~ 14:00
  if (2 <= nowUTCHour && nowUTCHour < 14) {
    return ethers.utils.parseUnits("20", "gwei")
  } else {
    return ethers.utils.parseUnits("25", "gwei")
  }
}
