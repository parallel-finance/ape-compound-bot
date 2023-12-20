import { Runtime } from "./runtime"
import { logger } from "@para-space/utils"
import { claimAndCompound } from "./supplyAndStake/compound"
import { fetchCompoundInfo } from "./supplyAndStake/fetch"
import { fetchP2PCompoundInfo } from "./p2p/fetch"
import { claimAndCompoundForP2PPairStaking } from "./p2p/compound"
import { SimpleMatchOrder, ValidCompoundInfo } from "./types"

async function main() {
    logger.info("Starting paraspace-ape-compound-bot")

    const worker = async () => {
        // const v1CompoundInfo: ValidCompoundInfo = await fetchCompoundInfo(true)
        // await claimAndCompound(true, v1CompoundInfo)
        // const v1P2pCompoundInfo: SimpleMatchOrder[] = await fetchP2PCompoundInfo(true)
        // await claimAndCompoundForP2PPairStaking(true, v1P2pCompoundInfo)

        const v2CompoundInfo: ValidCompoundInfo = await fetchCompoundInfo(false)
        await claimAndCompound(false, v2CompoundInfo)
        const v2P2pCompoundInfo: SimpleMatchOrder[] = await fetchP2PCompoundInfo(false)
        await claimAndCompoundForP2PPairStaking(false, v2P2pCompoundInfo)

        // await swapApeFeeToETH()
    }
    await Runtime.run(worker)

    logger.info("Stopping paraspace-ape-compound-bot")
}

main().then(() => process.exit(0))
