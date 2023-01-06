import { mapErrMsg } from "@para-space/utils"
import { logger } from "@para-space/utils"
import { BigNumber, ethers } from "ethers"
import { chunk } from "lodash"
import { Types, ParaspaceMM, Factories } from "paraspace-api"
import { runtime } from "./runtime"
import { strategy } from "./strategy"
import { StakedToken, ValidCompoundInfo, ValidTokens } from "./types"

const requestBatchNFTOwnerInfo = async (
  contract: string,
  raw: Pick<StakedToken, keyof StakedToken>[]
): Promise<typeof raw & { owner: string }[]> => {
  if (!raw || raw.length === 0) return []
  try {
    const nToken = runtime.provider.connectMultiAbi(Factories.IERC721__factory, contract)
    const calls = raw.map(({ tokenId }) => nToken.ownerOf(tokenId.toString()))
    const nftOwners = (
      await Promise.all(
        chunk(calls, 2000).map(batch => runtime.provider.getMulticallProvider().all(batch))
      )
    ).flat()

    // Append owner info to raw data
    return raw.map((data, i) => ({ ...data, owner: nftOwners[i] }))
  } catch (e) {
    const errMsg = `requestBatchNFTOwnerInfo error: ${mapErrMsg(e)}`
    throw new Error(errMsg)
  }
}

const getValidStakedTokens = async (): Promise<ValidTokens> => {
  logger.debug("Try get valid staked tokens...")
  const apeCoinStaking: Types.ApeCoinStaking = await runtime.provider.connectContract(
    ParaspaceMM.ApeCoinStaking
  )

  const contracts = [runtime.contracts.nBAYC, runtime.contracts.nMAYC]
  const getStakeMethod = [apeCoinStaking.getBaycStakes, apeCoinStaking.getMaycStakes]
  const limits = [
    strategy[runtime.networkName].BAYC_TOKEN_PENDING_REWARD_LIMIT,
    strategy[runtime.networkName].MAYC_TOKEN_PENDING_REWARD_LIMIT
  ]

  const validTokens = await Promise.all(
    contracts.map(async (contract, i) => {
      const stakes = await getStakeMethod[i](contract)
      const validStakes: StakedToken[] = stakes
        .filter(data => data.unclaimed.gt(ethers.utils.parseEther(limits[i])))
        .map(data => ({
          pendingReward: data.unclaimed,
          tokenId: data.tokenId.toString(),
          owner: ""
        }))

      return await requestBatchNFTOwnerInfo(contract, validStakes)
    })
  )

  return {
    validBayc: validTokens[0],
    validMayc: validTokens[1]
  }
}

const filterByUserLimit = async (validTokens: ValidTokens): Promise<ValidCompoundInfo> => {
  const { ERC721 } = runtime.provider.getContracts()
  let ownerToTokenIds: Map<string, StakedToken[]>[] = [new Map(), new Map()]
  const limits = [
    strategy[runtime.networkName].BAYC_USER_PENDING_REWARD_LIMIT,
    strategy[runtime.networkName].MAYC_USER_PENDING_REWARD_LIMIT
  ]

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

  ownerToTokenIds.forEach((collection, i) => {
    collection.forEach((tokens, owner) => {
      const userTotalReward = tokens
        .map(data => data.pendingReward)
        .reduce(
          (accumulator: BigNumber, currentValue: BigNumber) => accumulator.add(currentValue),
          BigNumber.from(0)
        )
      if (userTotalReward.lte(ethers.utils.parseEther(limits[i]))) collection.delete(owner)
    })
  })

  return {
    bayc: {
      nftAsset: ERC721.BAYC,
      users: Array.from(ownerToTokenIds[0].keys()),
      tokenIds: Array.from(ownerToTokenIds[0].keys()).map(
        owner => ownerToTokenIds[0].get(owner)?.map(data => data.tokenId) || []
      ),
      validStaked: validTokens.validBayc
    },
    mayc: {
      nftAsset: ERC721.MAYC,
      users: Array.from(ownerToTokenIds[1].keys()),
      tokenIds: Array.from(ownerToTokenIds[1].keys()).map(
        owner => ownerToTokenIds[1].get(owner)?.map(data => data.tokenId) || []
      ),
      validStaked: validTokens.validMayc
    }
  }
}

export const fetchCompoundInfo = async (): Promise<ValidCompoundInfo> => {
  const validStakedTokens = await getValidStakedTokens()
  return await filterByUserLimit(validStakedTokens)
}
