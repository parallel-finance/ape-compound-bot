import { ParaspaceMM, Types } from "paraspace-api"
import { Runtime, runtime } from "../runtime"
import { SimpleMatchOrder } from "../types"
import { Alert, logger, mapErrMsg, toEtherscanLink } from "@para-space/utils"
import { BigNumber, ethers } from "ethers"
import { GLOBAL_OVERRIDES, StakingType } from "../constant"

export const splitOrders = (orders: SimpleMatchOrder[], limit: number): SimpleMatchOrder[][] => {
    let orderAmount = orders.length
    let batchOrders: SimpleMatchOrder[][] = []
    while (orderAmount > 0) {
        batchOrders.push(orders.slice(0, limit))
        orders = orders.slice(limit)
        orderAmount = orders.length
    }
    return batchOrders
}

export const claimAndCompoundForP2PPairStaking = async (orders: SimpleMatchOrder[]) => {
    const batches = splitOrders(orders, 10)
    logger.info(
        `Try to claimForMatchedOrderAndCompound for ${orders.length} orders in ${batches.length} txs`
    )
    for (const batch of batches) {
        if (!batch || batch.length === 0) continue
        const tokenMsgs = batch
            .map(order =>
                order.stakingType <= StakingType.MAYCStaking
                    ? `${StakingType[order.stakingType]}-${order.apeTokenId}`
                    : `${StakingType[order.stakingType]}-${order.apeTokenId}-${
                          order.bakcTokenId
                      }(BAKC)`
            )
            .join(",")
        logger.info(tokenMsgs)

        try {
            const [txHash, errMsg] = await claimForMatchedOrderAndCompoundWithSimulation(batch)
            if (!!errMsg) {
                throw new Error(errMsg)
            }

            const receipt = await runtime.provider.getProvider().getTransactionReceipt(txHash)
            const gasFee = parseFloat(
                ethers.utils.formatEther(receipt.effectiveGasPrice.mul(receipt.gasUsed)).toString()
            ).toFixed(5)
            const etherscanLink = toEtherscanLink(
                txHash.toString(),
                runtime.networkName,
                runtime.isMainnet
            )
            const infoMsg = `Do P2P claimForMatchedOrderAndCompound succeed, tx ${etherscanLink}, gasFee ${gasFee}`

            logger.info(infoMsg)
            if (runtime.slack.enable) {
                Alert.info(infoMsg, [
                    { name: "network", value: runtime.networkName },
                    { name: "txHash", value: etherscanLink },
                    ...generateAlertMsgBody(batch)
                ])
            }
        } catch (e) {
            await resolveErrMsg(batch, e)
        }
    }
}

const resolveErrMsg = async (orders: SimpleMatchOrder[], e: any) => {
    const { wallet, networkName } = runtime
    const orderHashes = orders.map(data => data.orderHash)

    const errMsg = `Do P2P claimForMatchedOrderAndCompound error: ${mapErrMsg(e)}`
    logger.error(errMsg)
    if (runtime.slack.enable) {
        Alert.error(errMsg, [
            { name: "network", value: networkName },
            ...generateAlertMsgBody(orders),
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
                task: JSON.stringify(orderHashes).toString()
            }
        },
        event_action: "trigger",
        client: "paraspace-ape-compound-bot"
    })
}

const generateAlertMsgBody = (orders: SimpleMatchOrder[]) => {
    const totalPendingRewards = orders
        .reduce((acc, cur) => acc.add(cur.pendingReward), BigNumber.from(0))
        .toString()
    const tokenMsg = orders
        .map(order =>
            order.stakingType <= StakingType.MAYCStaking
                ? `${order.orderHash}-${StakingType[order.stakingType]}-${order.apeTokenId}`
                : `${order.orderHash}-${StakingType[order.stakingType]}-${order.apeTokenId}-${
                      order.bakcTokenId
                  }(BAKC)`
        )
        .join("\n")
    return [
        { name: "signer", value: runtime.wallet.address },
        {
            name: "totalPendingRewards",
            value:
                parseFloat(ethers.utils.formatEther(totalPendingRewards).toString()).toFixed(5) +
                " APE"
        },
        {
            name: "matchedOrders",
            value: `total: ${orders.length.toString()}\n${tokenMsg}`
        }
    ]
}

const claimForMatchedOrderAndCompoundWithSimulation = async (
    orders: SimpleMatchOrder[],
    overrides?: {
        disableCallStatic?: boolean
        force?: boolean
    }
): Promise<[string, string]> => {
    const p2pPairStaking: Types.P2PPairStaking = await runtime.provider.connectContract(
        ParaspaceMM.P2PPairStaking,
        runtime.wallet
    )
    const orderHashes = orders.map(data => data.orderHash)

    if (!overrides?.disableCallStatic) {
        try {
            await p2pPairStaking.callStatic.claimForMatchedOrderAndCompound(orderHashes)
            // No return and no error means the callStatic is successful
        } catch (e) {
            const errMsg = `callStatic claimForMatchedOrderAndCompound failed ${mapErrMsg(e)}`
            logger.error(`${errMsg}, params: ${JSON.stringify(orders)}`)
            return ["", errMsg]
        }
    }
    let options: any = {}
    if (overrides?.force) {
        options = { gasLimit: "10000000" }
    } else {
        try {
            const estimateGas: BigNumber =
                await p2pPairStaking.estimateGas.claimForMatchedOrderAndCompound(orderHashes)
            logger.info(`estimateGas claimForMatchedOrderAndCompound ${estimateGas.toString()}`)
            options = {
                gasLimit: estimateGas.add("100000")
            }
        } catch (e) {
            const errMsg = `estimateGas claimForMatchedOrderAndCompound failed ${mapErrMsg(e)}`
            console.log(`estimateGas Params: ${JSON.stringify(orders)}`)
            return ["", errMsg]
        }
    }
    options = {
        ...options,
        ...GLOBAL_OVERRIDES
    }
    const tx = await p2pPairStaking.claimForMatchedOrderAndCompound(orderHashes, options)
    logger.debug(`claimForMatchedOrderAndCompound tx hash: ${tx.hash}, wait for tx to be mined...`)
    await tx.wait(1)
    return [tx.hash, ""]
}
