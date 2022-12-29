import { Alert, logger, mapErrMsg, toEtherscanLink } from "@para-space/utils";
import { BigNumber, ethers } from "ethers";
import { ParaspaceMM, Types } from "paraspace-api";
import { Runtime, runtime } from "./runtime";
import { CompoundInfo, ValidCompoundInfo } from "./types";
import { cloneDeep } from "lodash"

export async function claimAndCompound(
    compoundInfo: ValidCompoundInfo,
) {
    const batches = splitCompoundInfos(compoundInfo, 30)
    logger.info("Try to claimAndCompound, split into " + batches.length + " batches")
    for (const batch of batches) {
        if (!batch || batch.users.length === 0) continue
        const info: CompoundInfo = {
            nftAsset: batch.nftAsset,
            users: batch.users,
            tokenIds: batch.tokenIds,
            validStaked: batch.validStaked,
        }
        logger.info(`nftAsset: ${info.nftAsset}`)
        logger.info(`users: ${info.users.length}: ${info.users}`)
        logger.info(`tokenIds: ${info.tokenIds.flat().length}: ${info.tokenIds}`)
        logger.info(`claimApeAndCompound..., signer address ${runtime.wallet.address}`)

        try {
            const [txHash, errMsg] = await claimApeAndCompoundWithSimulation(info)
            if (!!errMsg) { throw new Error(errMsg) }

            const receipt = await runtime.provider.getProvider().getTransactionReceipt(txHash)
            const gasFee = parseFloat(ethers.utils.formatEther(receipt.effectiveGasPrice.mul(receipt.gasUsed)).toString()).toFixed(5)
            const etherscanLink = toEtherscanLink(txHash.toString(), runtime.networkName, runtime.isMainnet)
            const infoMsg = `Do claimAndCompound succeed, tx ${etherscanLink}, gasFee ${gasFee}`;

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
    info: CompoundInfo,
    overrides?: {
        disableCallStatic?: boolean,
        force?: boolean,
    }
): Promise<[string, string]> => {
    const pool: Types.IPool = runtime.provider.connectContract(ParaspaceMM.Pool, runtime.wallet)
    const {
        nftAsset,
        users,
        tokenIds,
    } = info
    if (!overrides?.disableCallStatic) {
        try {
            await pool.callStatic.claimApeAndCompound(nftAsset, users, tokenIds)
            // No return and no error means the callStatic is successful
        } catch (e) {
            const errMsg = `callStatic claimApeAndCompound failed ${mapErrMsg(e)}`
            logger.error(`${errMsg}, params: ${JSON.stringify(info)}`)
            return ["", errMsg]
        }
    }
    let options: any = {}
    if (overrides?.force) {
        options = { gasLimit: "2000000" }
    } else {
        try {
            const estimateGas: BigNumber = await pool.estimateGas.claimApeAndCompound(nftAsset, users, tokenIds)
            logger.info(`estimateGas claimApeAndCompound ${estimateGas.toString()}`)
            options = {
                gasLimit: estimateGas.add("100000")
            }
        } catch (e) {
            const errMsg = `estimateGas claimApeAndCompound failed ${mapErrMsg(e)}`
            console.log(`estimateGas Params: ${JSON.stringify(info)}`)
            return ["", errMsg]
        }
    }
    const tx = await pool.claimApeAndCompound(nftAsset, users, tokenIds, options)
    logger.debug(`claimApeAndCompound tx hash: ${tx.hash}, wait for tx to be mined...`)
    await tx.wait()
    return [tx.hash, ""]
}

function compoundInfoToAlertMsgBody(info: CompoundInfo) {
    const { nftAsset, users } = info
    const tokenIds = info.tokenIds.flat()
    const validTokenIds = info.validStaked.filter((v) => tokenIds.includes(v.tokenId))
    const totalPendingRewards = (validTokenIds.reduce((acc, cur) => acc.add(cur.pendingReward), BigNumber.from(0))).toString()

    return [
        { name: "signer", value: runtime.wallet.address },
        { name: "collection", value: nftAsset },
        { name: "totalPendingRewards", value: parseFloat(ethers.utils.formatEther(totalPendingRewards).toString()).toFixed(5) + " APE" },
        { name: "users", value: `total: ${users.length.toString()}\n${users.join("\n")}` },
        { name: "tokenIds", value: `total: ${tokenIds.length.toString()}\n${info.tokenIds.map(t => t.join(",")).join("\n")}` },
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
            { name: "error", value: (e as any).toString() },
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
                task: JSON.stringify(info).toString(),
            }
        },
        event_action: "trigger",
        client: "paraspace-ape-compound-bot",
    })
}

export function splitCompoundInfos(
    compoundInfo: ValidCompoundInfo,
    limit: number
): CompoundInfo[] {
    let splitCompoundInfos: CompoundInfo[] = []
    for (const [collection, collectionInfo] of Object.entries(compoundInfo)) {
        if (!compoundInfo || collectionInfo.users.length === 0) {
            logger.info(`No ${collection} to claim and compound`)
            continue
        }

        let users = cloneDeep(collectionInfo.users)
        let tokenIds = cloneDeep(collectionInfo.tokenIds)
        let batches = []

        let tokenIdLimit = limit
        let userIndex = 0
        let totalTokenIds = tokenIds.reduce((acc, cur) => acc + cur.length, 0)
        let batch: CompoundInfo = {
            nftAsset: collectionInfo.nftAsset,
            users: [],
            tokenIds: [],
            validStaked: collectionInfo.validStaked,
        }
        while (totalTokenIds > 0) {
            let userTokenIds: string[] = tokenIds[userIndex].slice(0, tokenIdLimit)
            tokenIds[userIndex] = tokenIds[userIndex].slice(tokenIdLimit)

            batch.users.push(users[userIndex])
            batch.tokenIds.push(userTokenIds)

            tokenIdLimit -= userTokenIds.length
            totalTokenIds -= userTokenIds.length

            if (tokenIds[userIndex].length === 0) userIndex++
            if (tokenIdLimit === 0 || totalTokenIds === 0) {
                batches.push(batch)
                batch = {
                    nftAsset: collectionInfo.nftAsset,
                    users: [],
                    tokenIds: [],
                    validStaked: collectionInfo.validStaked,
                }
                tokenIdLimit = limit
            }
        }

        splitCompoundInfos.push(...batches)
    }

    return splitCompoundInfos
}