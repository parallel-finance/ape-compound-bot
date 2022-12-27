import { Alert, logger, mapErrMsg, toEtherscanLink } from "@para-space/utils";
import { BigNumber } from "ethers";
import { ParaspaceMM, Types } from "paraspace-api";
import { Runtime, runtime } from "./runtime";
import { CompoundInfo, ValidCompoundInfo } from "./types";

export async function claimAndCompound(
    compoundInfo: ValidCompoundInfo,
) {
    logger.info("Try to claimAndCompound...")
    for (const [collection, info] of Object.entries(compoundInfo)) {
        try {
            const {
                nftAsset,
                users,
                tokenIds,
            } = info
            if (users.length === 0) {
                logger.info(`No ${collection} to claim and compound`)
                continue
            }

            logger.info(`collection: ${collection}`)
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