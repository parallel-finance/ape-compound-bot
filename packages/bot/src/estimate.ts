import { logger, mapErrMsg, toBN } from "@para-space/utils"
import { BigNumber, ethers } from "ethers"
import { ParaSpaceEthMM, Types } from "paraspace-api"
import { Runtime, runtime } from "./runtime"
import { CompoundInfo, SimpleMatchOrder, ValidCompoundInfo } from "./types"
import { getApeSwapPrices } from "./uniswapv3"
import { splitCompoundInfos } from "./supplyAndStake/compound"
import { splitOrders } from "./p2p/compound"
import { fetchCompoundInfo } from "./supplyAndStake/fetch"
import { fetchP2PCompoundInfo } from "./p2p/fetch"

async function estimateClaimStakedNFTTotalGasAndFee(
    compoundInfo: ValidCompoundInfo
): Promise<[number, number, BigNumber, BigNumber]> {
    const batches = splitCompoundInfos(compoundInfo, 150)
    logger.info("Try to estimate claimAndCompound, split into " + batches.length + " batches")
    const totalTxsCount = batches.length
    let totalApeReward = toBN(0)
    let totalGasCost = toBN(0)
    let failedTxsCount = 0

    const pool: Types.IPool = runtime.provider.connectContract(ParaSpaceEthMM.Pool, runtime.wallet)

    const [apeToWethPrice, apeToUsdcPrice] = await getApeSwapPrices()

    for (const batch of batches) {
        if (!batch || batch.users.length === 0) continue
        const info: CompoundInfo = {
            nftAsset: batch.nftAsset,
            users: batch.users,
            tokenIds: batch.tokenIds,
            validStaked: batch.validStaked,
            isBakc: batch.isBakc,
            nftPairs: batch.nftPairs
        }
        const method = info.isBakc ? "claimPairedApeAndCompound" : "claimApeAndCompound"
        logger.info(`nftAsset: ${info.nftAsset}, method: ${method}`)
        logger.info(
            `users: ${info.users.length}, tokens: ${
                info.isBakc ? info.nftPairs.flat().length : info.tokenIds.flat().length
            }`
        )

        const { nftAsset, users, tokenIds, nftPairs } = info

        try {
            const estimateGas: BigNumber = info.isBakc
                ? await pool.estimateGas.claimPairedApeAndCompound(
                      nftAsset,
                      users,
                      nftPairs,
                      apeToUsdcPrice,
                      apeToWethPrice
                  )
                : await pool.estimateGas.claimApeAndCompound(
                      nftAsset,
                      users,
                      tokenIds,
                      apeToUsdcPrice,
                      apeToWethPrice
                  )
            logger.info(`estimateGas ${estimateGas.toString()}`)
            const _tokenIds = info.isBakc
                ? info.nftPairs.flat().map(data => data.bakcTokenId)
                : info.tokenIds.flat()
            const validTokenIds = info.validStaked.filter(v => _tokenIds.includes(v.tokenId))
            const totalPendingRewards = validTokenIds
                .reduce((acc, cur) => acc.add(cur.pendingReward), BigNumber.from(0))
                .toString()
            totalApeReward = totalApeReward.add(totalPendingRewards)
            totalGasCost = totalGasCost.add(estimateGas)
        } catch (e) {
            logger.error(`estimateGas ${method} failed ${mapErrMsg(e)}`)
            failedTxsCount = failedTxsCount + 1
            continue
        }
    }
    return [totalTxsCount, failedTxsCount, totalApeReward, totalGasCost]
}

export const estimateClaimP2PTotalGasAndFee = async (orders: SimpleMatchOrder[]) => {
    const p2pPairStaking: Types.P2PPairStaking = await runtime.provider.connectContract(
        ParaSpaceEthMM.P2PPairStaking
    )
    const batches = splitOrders(orders, 150)

    logger.info(
        `Try to estimate claimForMatchedOrderAndCompound for ${orders.length} orders in ${batches.length} txs`
    )
    const totalTxsCount = batches.length
    let totalApeReward = toBN(0)
    let totalGasCost = toBN(0)
    let failedTxsCount = 0
    for (const batch of batches) {
        if (!batch || batch.length === 0) continue
        const orderHashes = orders.map(data => data.orderHash)

        try {
            const estimateGas: BigNumber =
                await p2pPairStaking.estimateGas.claimForMatchedOrderAndCompound(orderHashes)
            logger.info(`estimateGas claimForMatchedOrderAndCompound ${estimateGas.toString()}`)
            const totalPendingRewards = orders
                .reduce((acc, cur) => acc.add(cur.pendingReward), BigNumber.from(0))
                .toString()
            totalApeReward = totalApeReward.add(totalPendingRewards)
            totalGasCost = totalGasCost.add(estimateGas)
        } catch (e) {
            logger.error(`estimateGas claimForMatchedOrderAndCompound failed ${mapErrMsg(e)}`)
            failedTxsCount += 1
            continue
        }
    }
    return [totalTxsCount, failedTxsCount, totalApeReward, totalGasCost]
}

async function main() {
    const worker = async () => {
        const compoundInfo: ValidCompoundInfo = await fetchCompoundInfo()
        const [stakedTotalTxsCount, stakedFailedTxsCount, stakedTotalApeReward, stakedGasCost] =
            await estimateClaimStakedNFTTotalGasAndFee(compoundInfo)
        logger.info(
            `stakedTxsCount: ${stakedTotalTxsCount}, stakedFailedTxsCount: ${stakedFailedTxsCount}`
        )
        logger.info(
            `stakedTotalApeReward: ${parseFloat(
                ethers.utils.formatEther(stakedTotalApeReward).toString()
            ).toFixed(5)}, stakedGasCost: ${stakedGasCost.toString()}`
        )

        const p2pCompoundInfo: SimpleMatchOrder[] = await fetchP2PCompoundInfo()
        const [p2pTotalTxsCount, p2pFailedTxsCount, p2pTotalApeReward, p2pTotalGasCost] =
            await estimateClaimP2PTotalGasAndFee(p2pCompoundInfo)
        logger.info(`p2pTxsCount: ${p2pTotalTxsCount}, p2pFailedTxsCount: ${p2pFailedTxsCount}`)
        logger.info(
            `p2pTotalApeReward: ${parseFloat(
                ethers.utils.formatEther(p2pTotalApeReward).toString()
            ).toFixed(5)}, p2pTotalGasCost: ${p2pTotalGasCost.toString()}`
        )
    }
    await Runtime.run(worker)
}

main().then(() => process.exit(0))
