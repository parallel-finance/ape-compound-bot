import { Factories, ParaSpaceEthMM, Types } from "paraspace-api"
import { runtime } from "./runtime"
import { EthereumERC20Config } from "paraspace-api/dist/provider/types"
import { ethers } from "ethers"
import { Alert, logger, mapErrMsg, toEtherscanLink } from "@para-space/utils"

const APE_WETH_FEE = "3000"
export const swapApeFeeToETH = async () => {
    const uniswapV3Quoter = runtime.provider.connectContract(ParaSpaceEthMM.UniswapV3Quoter)
    const uniswapV3: Types.IUniSwapV3Router02 = runtime.provider.connectContract(
        ParaSpaceEthMM.UniswapV3Router,
        runtime.wallet
    )
    const ERC20 = runtime.provider.getContracts().ERC20 as EthereumERC20Config
    const apeWethPath = ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [ERC20.APE, APE_WETH_FEE, ERC20.WETH]
    )
    const amountIn = await runtime.provider
        .connectFactory(Factories.ERC20__factory, ERC20.APE)
        .balanceOf(runtime.wallet.address)
    try {
        const amountOut = await uniswapV3Quoter.callStatic.quoteExactInput(apeWethPath, amountIn)
        const exactInputParams = {
            path: apeWethPath,
            recipient: runtime.wallet.address,
            amountIn,
            amountOutMinimum: amountOut.mul(99).div(100)
        }
        const gas = await uniswapV3.estimateGas.exactInput(exactInputParams)
        const tx = await uniswapV3.exactInput(exactInputParams, {
            gasLimit: gas.add("10000")
        })
        await tx.wait()
        const etherscanLink = toEtherscanLink(
            tx.hash.toString(),
            runtime.networkName,
            runtime.isMainnet
        )
        const infoMsg = `Do swap AC fee to ETH succeed, tx ${tx.hash}`

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
        if (runtime.slack.enable) {
            const errMsg = `Do swap AC fee to ETH error: ${mapErrMsg(e)}`
            logger.error(errMsg)
            Alert.error(errMsg, [
                { name: "network", value: runtime.networkName },
                { name: "error", value: (e as any).toString() }
            ])
        }
    }
}
