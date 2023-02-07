import { ethers, Overrides } from "ethers"

export const GLOBAL_OVERRIDES: Overrides = {
    // maxFeePerGas: ethers.utils.parseUnits("100", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("1.5", "gwei"),
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
    BAYCPairStaking = 2,
    MAYCPairStaking = 3
}

export const paraspaceConfigurations = {
    requestedBlockRangeLimit: 1500,
    p2pPairStartBlock: {
        mainnet: 16411893,
        goerli: 8412962,
        fork_mainnet: 16411893
    }
}
