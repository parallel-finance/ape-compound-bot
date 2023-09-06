import { Alert, logger, mapErrMsg, toEtherscanLink, getOptMaxFeePerGas } from "@para-space/utils"
import { BigNumber, ethers } from "ethers"
import { EthTypes, ParaSpaceEthMM, Provider } from "paraspace-provider"
import { Runtime, runtime } from "../runtime"
import { CompoundInfo, PairNft, ValidCompoundInfo } from "../types"
import { cloneDeep } from "lodash"
import { GLOBAL_OVERRIDES } from "../constant"

export async function claimAndCompound(isParaSpaceV1: boolean, compoundInfo: ValidCompoundInfo) {
    const provider = isParaSpaceV1 ? runtime.v1Provider : runtime.v2Provider

    const batches = splitCompoundInfos(compoundInfo, 150)
    logger.info("Try to claimAndCompound, split into " + batches.length + " batches")
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
        logger.info(`nftAsset: ${info.nftAsset}, for BAKC: ${info.isBakc}`)
        logger.info(`users: ${info.users.length}: ${info.users}`)
        logger.info(
            `tokenIds: ${
                info.isBakc ? info.nftPairs.flat().length : info.tokenIds.flat().length
            }: ${info.isBakc ? info.nftPairs.flat().map(data => data.bakcTokenId) : info.tokenIds}`
        )
        logger.info(`${method}..., signer address ${runtime.wallet.address}`)

        try {
            const [txHash, errMsg] = await claimApeAndCompoundWithSimulation(provider, info)
            if (!!errMsg) {
                throw new Error(errMsg)
            }

            const receipt = await runtime.v1Provider.getProvider().getTransactionReceipt(txHash)
            const gasFee = parseFloat(
                ethers.utils.formatEther(receipt.effectiveGasPrice.mul(receipt.gasUsed)).toString()
            ).toFixed(5)
            const etherscanLink = toEtherscanLink(
                txHash.toString(),
                runtime.networkName,
                runtime.isMainnet
            )
            const infoMsg = `Do claimAndCompound succeed, tx ${etherscanLink}, gasFee ${gasFee}`

            logger.info(infoMsg)
            if (runtime.slack.enable) {
                Alert.info(infoMsg, [
                    { name: "network", value: runtime.networkName },
                    { name: "txHash", value: etherscanLink },
                    ...compoundInfoToAlertMsgBody(info)
                ])
            }
        } catch (e) {
            await resolveErrMsg(info, e)
        }
    }
}

const claimApeAndCompoundWithSimulation = async (
    provider: Provider,
    info: CompoundInfo,
    overrides?: {
        disableCallStatic?: boolean
        force?: boolean
    }
): Promise<[string, string]> => {
    const pool: EthTypes.IPool = provider.connectContract(ParaSpaceEthMM.Pool, runtime.wallet)
    const { nftAsset, users, tokenIds, nftPairs } = info
    const method = info.isBakc ? "claimPairedApeAndCompound" : "claimApeAndCompound"
    if (!overrides?.disableCallStatic) {
        try {
            info.isBakc
                ? await pool.callStatic.claimPairedApeAndCompound(nftAsset, users, nftPairs)
                : await pool.callStatic.claimApeAndCompound(nftAsset, users, tokenIds)
            // No return and no error means the callStatic is successful
        } catch (e) {
            const errMsg = `callStatic ${method} failed ${mapErrMsg(e)}`
            logger.error(`${errMsg}, params: ${JSON.stringify(info)}`)
            return ["", errMsg]
        }
    }
    let options: any = {}
    if (overrides?.force) {
        options = { gasLimit: "10000000" }
    } else {
        try {
            const estimateGas: BigNumber = info.isBakc
                ? await pool.estimateGas.claimPairedApeAndCompound(nftAsset, users, nftPairs)
                : await pool.estimateGas.claimApeAndCompound(nftAsset, users, tokenIds)
            logger.info(`estimateGas ${method} ${estimateGas.toString()}`)
            options = {
                gasLimit: estimateGas.add("100000")
            }
        } catch (e) {
            const errMsg = `estimateGas ${method} failed ${mapErrMsg(e)}`
            console.log(`estimateGas Params: ${JSON.stringify(info)}`)
            return ["", errMsg]
        }
    }
    options = {
        ...options,
        ...GLOBAL_OVERRIDES,
        maxFeePerGas: await getOptMaxFeePerGas(
            await provider.getProvider().getGasPrice(),
            runtime.isMainnet
        )
    }
    const tx = info.isBakc
        ? await pool.claimPairedApeAndCompound(nftAsset, users, nftPairs, options)
        : await pool.claimApeAndCompound(nftAsset, users, tokenIds, options)
    logger.debug(`${method} tx hash: ${tx.hash}, wait for tx to be mined...`)
    await tx.wait(2)
    return [tx.hash, ""]
}

function compoundInfoToAlertMsgBody(info: CompoundInfo) {
    const { nftAsset, users, isBakc } = info
    const tokenIds = isBakc
        ? info.nftPairs.flat().map(data => data.bakcTokenId)
        : info.tokenIds.flat()
    const validTokenIds = info.validStaked.filter(v => tokenIds.includes(v.tokenId))
    const totalPendingRewards = validTokenIds
        .reduce((acc, cur) => acc.add(cur.pendingReward), BigNumber.from(0))
        .toString()

    return [
        { name: "signer", value: runtime.wallet.address },
        { name: "collection", value: nftAsset },
        { name: "isBakc", value: isBakc.toString() },
        {
            name: "totalPendingRewards",
            value:
                parseFloat(ethers.utils.formatEther(totalPendingRewards).toString()).toFixed(5) +
                " APE"
        },
        { name: "users", value: `total: ${users.length.toString()}\n${users.join("\n")}` },
        {
            name: "tokenIds",
            value: `total: ${tokenIds.length.toString()}\n${info.tokenIds
                .map(t => t.join(","))
                .join("\n")}`
        }
    ]
}

export async function resolveErrMsg(info: CompoundInfo, e: any) {
    const { wallet, networkName } = runtime

    const errMsg = `Do claimAndCompound error: ${mapErrMsg(e)}`
    logger.error(errMsg)
    if (runtime.slack.enable) {
        Alert.error(errMsg, [
            ...compoundInfoToAlertMsgBody(info),
            { name: "network", value: networkName },
            { name: "error", value: (e as any).toString() }
        ])
    }

    Runtime.sendPagerduty({
        payload: {
            summary: errMsg,
            severity: "critical",
            source: networkName,
            group: networkName,
            custom_details: {
                signer: wallet.address,
                task: JSON.stringify(info).toString()
            }
        },
        event_action: "trigger",
        client: "paraspace-ape-compound-bot"
    })
}

export function splitCompoundInfos(compoundInfo: ValidCompoundInfo, limit: number): CompoundInfo[] {
    let splitCompoundInfos: CompoundInfo[] = []
    const baycSplitLimit = limit
    for (const [collection, collectionInfo] of Object.entries(compoundInfo)) {
        if (!compoundInfo || collectionInfo.users.length === 0) {
            logger.info(`No ${collection} to claim and compound`)
            continue
        }

        let users = cloneDeep(collectionInfo.users)
        let batches = []
        let tokenIdLimit = collection === "bayc" && baycSplitLimit <= limit ? baycSplitLimit : limit
        let userIndex = 0

        let tokenIds = cloneDeep(collectionInfo.tokenIds)
        let nftPairs = cloneDeep(collectionInfo.nftPairs)

        let totalAmount = collectionInfo.isBakc ? nftPairs.flat().length : tokenIds.flat().length

        let batch: CompoundInfo = {
            nftAsset: collectionInfo.nftAsset,
            users: [],
            tokenIds: [],
            validStaked: collectionInfo.validStaked,
            isBakc: collectionInfo.isBakc,
            nftPairs: []
        }

        while (totalAmount > 0) {
            let subAmount = 0
            batch.users.push(users[userIndex])

            if (collectionInfo.isBakc) {
                let userPairs: PairNft[] = nftPairs[userIndex].slice(0, tokenIdLimit)
                nftPairs[userIndex] = nftPairs[userIndex].slice(tokenIdLimit)
                batch.nftPairs.push(userPairs)
                subAmount = userPairs.length
            } else {
                let userTokenIds: string[] = tokenIds[userIndex].slice(0, tokenIdLimit)
                tokenIds[userIndex] = tokenIds[userIndex].slice(tokenIdLimit)
                batch.tokenIds.push(userTokenIds)
                subAmount = userTokenIds.length
            }

            tokenIdLimit -= subAmount
            totalAmount -= subAmount

            if (
                collectionInfo.isBakc
                    ? nftPairs[userIndex].length === 0
                    : tokenIds[userIndex].length === 0
            )
                userIndex++
            if (tokenIdLimit === 0 || totalAmount === 0) {
                batches.push(batch)
                batch = {
                    nftAsset: collectionInfo.nftAsset,
                    users: [],
                    tokenIds: [],
                    validStaked: collectionInfo.validStaked,
                    isBakc: collectionInfo.isBakc,
                    nftPairs: []
                }
                tokenIdLimit =
                    collection === "bayc" && baycSplitLimit <= limit ? baycSplitLimit : limit
            }
        }

        splitCompoundInfos.push(...batches)
    }

    return splitCompoundInfos
}
