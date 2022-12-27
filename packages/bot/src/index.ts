import { logger, mapErrMsg, sleep } from "@para-space/utils"
import { claimAndCompound } from "./compound"
import { fetchCompoundInfo } from "./fetch"
import { runtime, Runtime } from "./runtime"
import { ValidCompoundInfo } from "./types"
import { types as LoggerTypes } from "@para-space/utils"

async function main() {
    logger.info("Starting paraspace-ape-compound-bot")

    const worker = async () => {
        const compoundInfo: ValidCompoundInfo = await fetchCompoundInfo()
        await claimAndCompound(compoundInfo)
    }
    await Runtime.run(worker)

    logger.info("Stopping paraspace-ape-compound-bot")
}

main().then(() => process.exit(0))
