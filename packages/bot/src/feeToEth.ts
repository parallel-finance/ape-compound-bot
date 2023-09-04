import { ComFactories, ComTypes, ParaSpaceEthMM } from "paraspace-provider"
import { runtime } from "./runtime"
import { ethers } from "ethers"
import { Alert, logger, mapErrMsg, toEtherscanLink } from "@para-space/utils"

const APE_WETH_FEE = "3000"
export const swapApeFeeToETH = async () => {
    logger.info("start withdraw cape to ape.")

    const ERC20 = runtime.v1Provider.getEthContracts().ERC20
    // withdraw v1 cape to ape
    {
        const v1cApe = runtime.v1Provider.connectContract(ParaSpaceEthMM.CAPE, runtime.wallet)
        const v1cApeBal = await v1cApe.balanceOf(runtime.wallet.address)

        if (v1cApeBal.gte(ethers.utils.parseEther("100"))) {
            const tx = await v1cApe.withdraw(v1cApeBal)
            await tx.wait(1)
            logger.info(`withdraw ${ethers.utils.formatEther(v1cApeBal)} v1 cape to ape.`)
        }
    }

    // withdraw v2 cape to ape
    {
        const v2cApe = runtime.v2Provider.connectContract(ParaSpaceEthMM.CAPE, runtime.wallet)
        const v2cApeBal = await v2cApe.balanceOf(runtime.wallet.address)

        if (v2cApeBal.gte(ethers.utils.parseEther("100"))) {
            const tx = await v2cApe.withdraw(v2cApeBal)
            await tx.wait(1)
            logger.info(`withdraw ${ethers.utils.formatEther(v2cApeBal)} v2 cape to ape.`)
        }
    }

    logger.info("start swap ape fee to eth.")
    const uniswapV3Quoter = runtime.v1Provider.connectContract(ParaSpaceEthMM.UniswapV3Quoter)
    const uniswapV3Router: ComTypes.IUniSwapV3Router02 = runtime.v1Provider.connectContract(
        ParaSpaceEthMM.UniswapV3Router,
        runtime.wallet
    )

    const apeWethPath = ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [ERC20.APE, APE_WETH_FEE, ERC20.WETH]
    )
    const ape: ComTypes.MintableERC20 = runtime.v1Provider.connectFactory(
        ComFactories.MintableERC20__factory,
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

        const weth = runtime.v1Provider.connectContract(ParaSpaceEthMM.WETH, runtime.wallet)
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
                        await runtime.v1Provider.getProvider().getBalance(runtime.wallet.address)
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
