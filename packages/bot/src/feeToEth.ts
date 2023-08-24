import { Factories, ParaspaceMM, Types } from "paraspace-api"
import { runtime } from "./runtime"
import { ethers } from "ethers"
import { Alert, logger, mapErrMsg, toEtherscanLink } from "@para-space/utils"

const APE_WETH_FEE = "3000"
export const swapApeFeeToETH = async () => {
    logger.info("start withdraw cape to ape.")

    const ERC20 = runtime.provider.getContracts().ERC20
    const cApe = runtime.provider.connectContract(ParaspaceMM.CAPE, runtime.wallet)
    const cApeBal = await cApe.balanceOf(runtime.wallet.address)

    if (cApeBal.lt(ethers.utils.parseEther("100"))) return

    const tx = await cApe.withdraw(cApeBal)
    await tx.wait(1)
    logger.info(`withdraw ${ethers.utils.formatEther(cApeBal)} cape to ape.`)

    logger.info("start swap ape fee to eth.")
    const uniswapV3Quoter = runtime.provider.connectContract(ParaspaceMM.UniswapV3Quoter)
    const uniswapV3Router: Types.IUniSwapV3Router02 = runtime.provider.connectContract(
        ParaspaceMM.UniswapV3Router,
        runtime.wallet
    )

    const apeWethPath = ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [ERC20.APE, APE_WETH_FEE, ERC20.WETH]
    )
    const ape: Types.ERC20 = runtime.provider.connectFactory(
        Factories.ERC20__factory,
        ERC20.APE,
        runtime.wallet
    )
    const amountIn = await ape.balanceOf(runtime.wallet.address)

    try {
        if ((await ape.allowance(runtime.wallet.address, uniswapV3Router.address)).lt(amountIn)) {
            const tx = await ape.approve(uniswapV3Router.address, ethers.constants.MaxUint256)
            await tx.wait()
            logger.info(`ape bot approve ape to uniswapV3Router, tx: ${tx.hash}`)
        }
        const amountOut = await uniswapV3Quoter.callStatic.quoteExactInput(apeWethPath, amountIn)
        const exactInputParams = {
            path: apeWethPath,
            recipient: runtime.wallet.address,
            amountIn,
            amountOutMinimum: amountOut.mul(9900).div(10000)
        }
        // console.log(uniswapV3Router.interface.encodeFunctionData("exactInput", [exactInputParams]))
        const gas = await uniswapV3Router.estimateGas.exactInput(exactInputParams)
        const tx = await uniswapV3Router.exactInput(exactInputParams, {
            gasLimit: gas.add("10000")
        })
        await tx.wait()
        const etherscanLink = toEtherscanLink(
            tx.hash.toString(),
            runtime.networkName,
            runtime.isMainnet
        )
        const infoMsg = `Do swap AC fee to ETH succeed, tx ${tx.hash}`

        const weth = runtime.provider.connectContract(ParaspaceMM.WETH, runtime.wallet)
        const wethBal = await weth.balanceOf(runtime.wallet.address)
        if (wethBal.gte(ethers.utils.parseEther("0.5"))) {
            const tx = await weth.withdraw(wethBal)
            await tx.wait()
        }

        logger.info(infoMsg)
        if (runtime.slack.enable) {
            Alert.info(infoMsg, [
                { name: "network", value: runtime.networkName },
                { name: "txHash", value: etherscanLink },
                {
                    name: "fee",
                    value:
                        ethers.utils.formatEther(amountIn) +
                        " APE ~~" +
                        ethers.utils.formatEther(amountOut.mul(99).div(100)) +
                        " ETH"
                },
                {
                    name: "bot balance",
                    value: ethers.utils.formatEther(
                        await runtime.provider.getProvider().getBalance(runtime.wallet.address)
                    )
                }
            ])
        }
    } catch (e) {
        const errMsg = `Do swap AC fee to ETH error: ${mapErrMsg(e)}`
        logger.error(errMsg)
        if (runtime.slack.enable) {
            Alert.error(errMsg, [
                { name: "network", value: runtime.networkName },
                { name: "error", value: (e as any).toString() }
            ])
        }
    }
    logger.info("end swap ape fee to eth.")
}
