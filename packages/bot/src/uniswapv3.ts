import { BigNumber, BigNumberish, ethers } from "ethers"
import { Factories, ParaSpaceEthMM, Types, eqAddr } from "paraspace-api"
import { toBN, logger } from "@para-space/utils"
import { runtime } from "./runtime"
import { EthereumERC20Config } from "paraspace-api/dist/provider/types"

const APE_WETH_FEE = "3000"
const WETH_USDC_FEE = "500"

const getERC20 = (token: string): Types.ERC20 => {
    return runtime.provider.connectFactory(Factories.ERC20__factory, token)
}

export const getUniswapV3PoolAddress = async (
    tokenA: string,
    tokenB: string,
    fee: string
): Promise<string> => {
    const v3factory = runtime.provider.connectContract(ParaSpaceEthMM.UniswapV3Factory)
    return await v3factory.getPool(tokenA, tokenB, fee)
}

export async function getApeOrUsdcPrice(token: string): Promise<BigNumber> {
    const ERC20 = runtime.provider.getContracts().ERC20 as EthereumERC20Config
    const uniswapV3PoolAddr = eqAddr(token, ERC20.APE)
        ? await getUniswapV3PoolAddress(ERC20.APE, ERC20.WETH, APE_WETH_FEE)
        : await getUniswapV3PoolAddress(ERC20.USDC, ERC20.WETH, WETH_USDC_FEE)
    const uniswapV3Pool = runtime.provider.connectFactory(
        Factories.UniswapV3Pool__factory,
        uniswapV3PoolAddr
    )
    const isToken0 = ethers.utils.getAddress(token) < ethers.utils.getAddress(ERC20.WETH)
    const [token0, token1] = isToken0
        ? [getERC20(token), getERC20(ERC20.WETH)]
        : [getERC20(ERC20.WETH), getERC20(token)]
    const slot0 = await uniswapV3Pool.slot0()
    const [token0Decimals, token1Decimals] = [await token0.decimals(), await token1.decimals()]
    const token0Price = toBN(slot0.sqrtPriceX96)
        .pow(2)
        .mul(toBN(10).pow(18))
        .div(toBN(2).pow(192))
        .mul(toBN(10).pow(token0Decimals))
        .div(toBN(10).pow(token1Decimals))
    const price = isToken0
        ? token0Price
        : toBN(10)
              .pow(18 + 18)
              .div(token0Price)
    const formatPrice = ethers.utils.formatUnits(price, 18)
    logger.info(`token ${token} to eth price: ${formatPrice}`)
    return price
}

export const getApeSwapPrices = async (): Promise<[BigNumber, BigNumber]> => {
    const ERC20 = runtime.provider.getContracts().ERC20 as EthereumERC20Config
    const apeWethPrice = await getApeOrUsdcPrice(ERC20.APE)
    const usdcWethPrice = await getApeOrUsdcPrice(ERC20.USDC)

    const usdcUnit = toBN(10).pow(6)
    const apeUnit = toBN(10).pow(18)

    const apeToUsdcPrice = apeWethPrice
        .mul(usdcUnit)
        .mul(toBN(10).pow(18))
        .div(usdcWethPrice)
        .div(apeUnit)
    return [apeWethPrice.mul(95).div(100), apeToUsdcPrice.mul(95).div(100)]
}
