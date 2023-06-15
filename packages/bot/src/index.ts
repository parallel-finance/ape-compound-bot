import { Runtime } from "./runtime"
import { logger } from "@para-space/utils"
import { claimAndCompound } from "./supplyAndStake/compound"
import { fetchCompoundInfo } from "./supplyAndStake/fetch"
import { fetchP2PCompoundInfo } from "./p2p/fetch"
import { claimAndCompoundForP2PPairStaking } from "./p2p/compound"
import { SimpleMatchOrder, ValidCompoundInfo } from "./types"
import { swapApeFeeToETH } from "./feeToEth"

async function main() {
    logger.info("Starting paraspace-ape-compound-bot")

    const worker = async () => {
        const compoundInfo: ValidCompoundInfo = await fetchCompoundInfo()
        await claimAndCompound(compoundInfo)
        const p2pCompoundInfo: SimpleMatchOrder[] = await fetchP2PCompoundInfo()
        await claimAndCompoundForP2PPairStaking(p2pCompoundInfo)
        await swapApeFeeToETH()
    }
    await Runtime.run(worker)

    logger.info("Stopping paraspace-ape-compound-bot")
}

main().then(() => process.exit(0))
