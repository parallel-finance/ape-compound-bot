import { ethers, Overrides } from "ethers"
import { ParaspaceConfigurations } from "./types"

export const GLOBAL_OVERRIDES: Overrides = {
    // maxFeePerGas: ethers.utils.parseUnits("100", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("1", "gwei"),
    type: 2
}

export const APE_STAKING_POOL_ID = {
    APE: "0",
    BAYC: "1",
    MAYC: "2",
    BAKC: "3"
}

export enum StakingType {
    BAYCStaking = 0,
    MAYCStaking = 1,
    BAKCPairStaking = 2
}

export const paraspaceConfigurations: ParaspaceConfigurations = {
    requestedBlockRangeLimit: 10000,
    p2pPairStartBlock: {
        mainnet: 16602128,
        mainnet_v2: 18016736,
        goerli: 8465573,
        goerli_v2: 9636428,
        fork_mainnet: 16582462,
        fork_mainnet_v2: 16582462
    }
}
