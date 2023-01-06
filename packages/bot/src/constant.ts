import { ethers, Overrides } from "ethers"

export const GLOBAL_OVERRIDES: Overrides = {
  maxFeePerGas: ethers.utils.parseUnits("20", "gwei"),
  maxPriorityFeePerGas: ethers.utils.parseUnits("1.5", "gwei"),
  type: 2
}
