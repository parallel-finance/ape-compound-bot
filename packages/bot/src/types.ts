import { ContractAddress } from "@para-space/utils"
import { BigNumber } from "ethers"
import { Provider, NetworkConfiguration } from "paraspace-provider"

export type ParaspaceConfigurations = {
    requestedBlockRangeLimit: number
    p2pPairStartBlock: NetworkConfiguration<number>
}

export type StakedToken = {
    pendingReward: BigNumber
    tokenId: string
    owner: string
    poolId: string
    pair: {
        mainTypePoolId: string
        mainTokenId: string
        mainTokenOwner: string
    }
}

export type ValidTokens = {
    validBayc: StakedToken[]
    validMayc: StakedToken[]
    validBakcForBayc: StakedToken[]
    validBakcForMayc: StakedToken[]
}

export type CompoundInfo = {
    nftAsset: string
    users: string[]
    tokenIds: string[][]
    validStaked: StakedToken[]
    nftPairs: PairNft[][]
    isBakc: boolean
}

export type PairNft = {
    mainTokenId: string
    bakcTokenId: string
}

export type ValidCompoundInfo = {
    bayc: CompoundInfo
    mayc: CompoundInfo
    bakcForBayc: CompoundInfo
    bakcForMayc: CompoundInfo
}

export type SimpleMatchOrder = {
    orderHash: string
    stakingType: number
    apeToken: string
    apeTokenId: number
    bakcTokenId: number
    pendingReward: BigNumber
}

export type NetworkContractParams = {
    isParaSpaceV1: boolean
    provider: Provider
    contracts: {
        nBAYC: ContractAddress
        nMAYC: ContractAddress
        nBAKC: ContractAddress
    }
}
