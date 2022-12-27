import { Alert, logger, mapErrMsg, toEtherscanLink } from "@para-space/utils";
import { BigNumber } from "ethers";
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
        const info: CompoundInfo = {
            nftAsset: batch.nftAsset,
            users: batch.users,
            tokenIds: batch.tokenIds,
            rawData: batch.rawData,
        }
        try {
            const {
                nftAsset,
                users,
                tokenIds,
            } = info

            logger.info(`nftAsset: ${nftAsset}`)
            logger.info(`users: ${users}`)
            logger.info(`tokenIds: ${tokenIds}`)
            logger.info(`claimApeAndCompound..., signer address ${runtime.wallet.address}`)

            const [txHash, errMsg] = await claimApeAndCompoundWithSimulation(info)
            if (!!errMsg) { throw new Error(errMsg) }

            const etherscanLink = toEtherscanLink(txHash.toString(), runtime.networkName, runtime.isMainnet)
            const infoMsg = `Do claimAndCompound succeed, tx ${etherscanLink}`;
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
    callStatic?: boolean,
    force: boolean = false
): Promise<[string, string]> => {
    const pool: Types.IPool = runtime.provider.connectContract(ParaspaceMM.Pool, runtime.wallet)
    const {
        nftAsset,
        users,
        tokenIds,
    } = info
    if (callStatic) {
        try {
            await pool.callStatic.claimApeAndCompound(nftAsset, users, tokenIds)
            // No return and no error means the callStatic is successful
        } catch (e) {
            const errMsg = `callStatic claimApeAndCompound failed ${mapErrMsg(e)}`
            logger.error(`${errMsg}, params: ${JSON.stringify(info)}`)
        }
    }
    let options: any = {}
    if (force) {
        options = { gasLimit: "2000000" }
    } else {
        try {
            const estimateGas: BigNumber = await pool.estimateGas.claimApeAndCompound(nftAsset, users, tokenIds)
            logger.info(`estimateGas claimApeAndCompound ${estimateGas.toString()}`)
            options = {
                gasLimit: estimateGas.add("200000")
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
    const {
        nftAsset,
        users,
        tokenIds,
        rawData,
    } = info

    return [
        { name: "signer", value: runtime.wallet.address },
        { name: "collection", value: nftAsset },
        { name: "users", value: users.join(",") },
        { name: "tokenIds", value: tokenIds.join(",") },
        { name: "rawData", value: JSON.stringify(rawData) },
        { name: "task", value: JSON.stringify(info) },
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
            rawData: collectionInfo.rawData,
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
                    rawData: collectionInfo.rawData,
                }
                tokenIdLimit = limit
            }
        }

        splitCompoundInfos.push(...batches)
    }

    return splitCompoundInfos
}