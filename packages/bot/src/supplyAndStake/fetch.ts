import { mapErrMsg, sameAddress } from "@para-space/utils"
import { logger } from "@para-space/utils"
import { BigNumber, ethers } from "ethers"
import { chunk } from "lodash"
import { ComFactories, ComTypes, ParaSpaceEthMM, Provider } from "paraspace-provider"
import { APE_STAKING_POOL_ID } from "../constant"
import { runtime } from "../runtime"
import { strategy } from "../strategy"
import { NetworkContractParams, StakedToken, ValidCompoundInfo, ValidTokens } from "../types"

const requestBatchNFTOwnerInfo = async (
    provider: Provider,
    contract: string,
    tokenIds: string[]
) => {
    if (!tokenIds || tokenIds.length === 0) return []
    try {
        const nft = provider.connectMultiAbi(ComFactories.IERC721Enumerable__factory, contract)
        const calls = tokenIds.map(tokenId => nft.ownerOf(tokenId))
        return (
            await Promise.all(
                chunk(calls, 1000).map(batch => provider.getMulticallProvider().all(batch))
            )
        ).flat()
    } catch (e) {
        const errMsg = `requestBatchNFTOwnerInfo error: ${mapErrMsg(e)}`
        throw new Error(errMsg)
    }
}

const validateBAKCOwnerAndApproved = async (
    params: NetworkContractParams,
    stakeBakc: StakedToken
): Promise<boolean> => {
    const { provider, contracts } = params
    const nBakc = provider.connectFactory(ComFactories.IERC721Enumerable__factory, contracts.nBAKC)
    const bakc: ComTypes.IERC721Enumerable = provider.connectFactory(
        ComFactories.IERC721Enumerable__factory,
        runtime.contracts.BAKC
    )
    const bakcOwner = await bakc.ownerOf(stakeBakc.tokenId)
    const nBakcOwner = await nBakc.ownerOf(stakeBakc.tokenId)
    const isApproved = await bakc.isApprovedForAll(bakcOwner, runtime.contracts.pool)
    return (
        (sameAddress(stakeBakc.pair.mainTokenOwner, bakcOwner) ||
            sameAddress(stakeBakc.pair.mainTokenOwner, nBakcOwner)) &&
        isApproved
    )
}

const getValidBaycAndMaycStakedTokens = async ({
    provider,
    contracts
}: NetworkContractParams): Promise<{
    validBayc: StakedToken[]
    validMayc: StakedToken[]
}> => {
    logger.debug("Try get valid BAYC and MAYC staked tokens...")

    const apeCoinStaking: ComTypes.ApeCoinStaking = await provider.connectContract(
        ParaSpaceEthMM.ApeCoinStaking
    )
    const nContracts = [contracts.nBAYC, contracts.nMAYC]
    const limits = [
        strategy[runtime.networkName].BAYC_TOKEN_PENDING_REWARD_LIMIT,
        strategy[runtime.networkName].MAYC_TOKEN_PENDING_REWARD_LIMIT
    ]

    const validTokens = await Promise.all(
        nContracts.map(async (contract, i) => {
            const stakes = await apeCoinStaking.getAllStakes(contract)
            const validStakes: StakedToken[] = stakes
                .filter(data =>
                    [APE_STAKING_POOL_ID.BAYC, APE_STAKING_POOL_ID.MAYC].includes(
                        data.poolId.toString()
                    )
                        ? data.unclaimed.gt(ethers.utils.parseEther(limits[i]))
                        : false
                )
                .map(data => ({
                    pendingReward: data.unclaimed,
                    tokenId: data.tokenId.toString(),
                    owner: "",
                    poolId: data.poolId.toString(),
                    pair: {
                        mainTypePoolId: data.pair.mainTypePoolId.toString(),
                        mainTokenId: data.pair.mainTokenId.toString(),
                        mainTokenOwner: ""
                    }
                }))

            const nftOwners = await requestBatchNFTOwnerInfo(
                provider,
                contract,
                validStakes.map(data => data.tokenId)
            )
            return validStakes.map((data, i) => ({ ...data, owner: nftOwners[i] }))
        })
    )
    return {
        validBayc: validTokens[0],
        validMayc: validTokens[1]
    }
}

const getValidBakcStakedTokens = async (
    params: NetworkContractParams
): Promise<{
    validBakcForBayc: StakedToken[]
    validBakcForMayc: StakedToken[]
}> => {
    logger.debug("Try get valid BAKC staked tokens...")
    const { provider, contracts } = params

    const apeCoinStaking: ComTypes.ApeCoinStaking = await provider.connectContract(
        ParaSpaceEthMM.ApeCoinStaking
    )

    const nContracts = [contracts.nBAYC, contracts.nMAYC]
    const bakcLimits = strategy[runtime.networkName].BAKC_TOKEN_PENDING_REWARD_LIMIT

    const fetchedBakcTokens = await Promise.all(
        nContracts.map(async contract => {
            const stakes = await apeCoinStaking.getAllStakes(contract)
            const fetchedStakes: StakedToken[] = stakes
                .filter(data =>
                    data.poolId.toString() === APE_STAKING_POOL_ID.BAKC
                        ? data.unclaimed.gt(ethers.utils.parseEther(bakcLimits))
                        : false
                )
                .map(data => ({
                    pendingReward: data.unclaimed,
                    tokenId: data.tokenId.toString(),
                    owner: "",
                    poolId: data.poolId.toString(),
                    pair: {
                        mainTypePoolId: data.pair.mainTypePoolId.toString(),
                        mainTokenId: data.pair.mainTokenId.toString(),
                        mainTokenOwner: ""
                    }
                }))
            const mainTokenOwners = await requestBatchNFTOwnerInfo(
                provider,
                contract,
                fetchedStakes.map(data => data.pair.mainTokenId)
            )
            return fetchedStakes.map((data, i) => ({
                ...data,
                pair: {
                    ...data.pair,
                    mainTokenOwner: mainTokenOwners[i]
                }
            }))
        })
    )

    const bakcStatus = await Promise.all(
        fetchedBakcTokens.map(
            async data =>
                await Promise.all(
                    data.map(async token => await validateBAKCOwnerAndApproved(params, token))
                )
        )
    )

    return {
        validBakcForBayc: fetchedBakcTokens[0].filter((_, index) => bakcStatus[0][index]),
        validBakcForMayc: fetchedBakcTokens[1].filter((_, index) => bakcStatus[1][index])
    }
}

const getValidStakedTokens = async (params: NetworkContractParams): Promise<ValidTokens> => {
    const mainTokens = await getValidBaycAndMaycStakedTokens(params)
    const bakcTokens = runtime.config.compoundBakc
        ? await getValidBakcStakedTokens(params)
        : undefined

    return {
        validBayc: mainTokens.validBayc,
        validMayc: mainTokens.validMayc,
        validBakcForBayc: bakcTokens?.validBakcForBayc || [],
        validBakcForMayc: bakcTokens?.validBakcForMayc || []
    }
}

const filterByUserLimit = async (validTokens: ValidTokens): Promise<ValidCompoundInfo> => {
    const { ERC721 } = runtime.v1Provider.getEthContracts()
    let ownerToTokenIds: Map<string, StakedToken[]>[] = [new Map(), new Map()]
    let ownerToBakcTokenIds: Map<string, StakedToken[]>[] = [new Map(), new Map()]
    const limits = [
        strategy[runtime.networkName].BAYC_USER_PENDING_REWARD_LIMIT,
        strategy[runtime.networkName].MAYC_USER_PENDING_REWARD_LIMIT
    ]
    const bakcLimits = strategy[runtime.networkName].BAKC_USER_PENDING_REWARD_LIMIT

    Array.from([validTokens.validBayc, validTokens.validMayc]).forEach((BaycOrMayc, index) => {
        BaycOrMayc.forEach((data: StakedToken) => {
            const owner = data.owner
            if (ownerToTokenIds[index].has(owner)) {
                ownerToTokenIds[index].get(owner)?.push(data)
            } else {
                ownerToTokenIds[index].set(owner, [data])
            }
        })
    })

    Array.from([validTokens.validBakcForBayc, validTokens.validBakcForMayc]).forEach(
        (BaycOrMayc, index) => {
            BaycOrMayc.forEach((data: StakedToken) => {
                const mainTokenOwner = data.pair.mainTokenOwner
                if (ownerToBakcTokenIds[index].has(mainTokenOwner)) {
                    ownerToBakcTokenIds[index].get(mainTokenOwner)?.push(data)
                } else {
                    ownerToBakcTokenIds[index].set(mainTokenOwner, [data])
                }
            })
        }
    )

    ownerToTokenIds.forEach((collection, i) => {
        collection.forEach((tokens, owner) => {
            const userTotalReward = tokens
                .map(data => data.pendingReward)
                .reduce(
                    (accumulator: BigNumber, currentValue: BigNumber) =>
                        accumulator.add(currentValue),
                    BigNumber.from(0)
                )
            if (userTotalReward.lte(ethers.utils.parseEther(limits[i]))) collection.delete(owner)
        })
    })

    ownerToBakcTokenIds.forEach(collection => {
        collection.forEach((tokens, owner) => {
            const userTotalReward = tokens
                .map(data => data.pendingReward)
                .reduce(
                    (accumulator: BigNumber, currentValue: BigNumber) =>
                        accumulator.add(currentValue),
                    BigNumber.from(0)
                )
            if (userTotalReward.lte(ethers.utils.parseEther(bakcLimits))) collection.delete(owner)
        })
    })

    return {
        bayc: {
            nftAsset: ERC721.BAYC,
            users: Array.from(ownerToTokenIds[0].keys()),
            tokenIds: Array.from(ownerToTokenIds[0].keys()).map(
                owner => ownerToTokenIds[0].get(owner)?.map(data => data.tokenId) || []
            ),
            validStaked: validTokens.validBayc,
            nftPairs: [],
            isBakc: false
        },
        mayc: {
            nftAsset: ERC721.MAYC,
            users: Array.from(ownerToTokenIds[1].keys()),
            tokenIds: Array.from(ownerToTokenIds[1].keys()).map(
                owner => ownerToTokenIds[1].get(owner)?.map(data => data.tokenId) || []
            ),
            validStaked: validTokens.validMayc,
            nftPairs: [],
            isBakc: false
        },
        bakcForBayc: {
            nftAsset: ERC721.BAYC,
            users: Array.from(ownerToBakcTokenIds[0].keys()),
            nftPairs: Array.from(ownerToBakcTokenIds[0].keys()).map(
                owner =>
                    ownerToBakcTokenIds[0].get(owner)?.map(data => ({
                        mainTokenId: data.pair.mainTokenId,
                        bakcTokenId: data.tokenId
                    })) || []
            ),
            validStaked: validTokens.validBakcForBayc,
            tokenIds: [],
            isBakc: true
        },
        bakcForMayc: {
            nftAsset: ERC721.MAYC,
            users: Array.from(ownerToBakcTokenIds[1].keys()),
            nftPairs: Array.from(ownerToBakcTokenIds[1].keys()).map(
                owner =>
                    ownerToBakcTokenIds[1].get(owner)?.map(data => ({
                        mainTokenId: data.pair.mainTokenId,
                        bakcTokenId: data.tokenId
                    })) || []
            ),
            validStaked: validTokens.validBakcForMayc,
            tokenIds: [],
            isBakc: true
        }
    }
}

export const fetchCompoundInfo = async (isParaSpaceV1: boolean): Promise<ValidCompoundInfo> => {
    const validStakedTokens = await getValidStakedTokens({
        isParaSpaceV1,
        provider: isParaSpaceV1 ? runtime.v1Provider : runtime.v2Provider,
        contracts: isParaSpaceV1 ? runtime.v1Contracts : runtime.v2Contracts
    })
    return await filterByUserLimit(validStakedTokens)
}
