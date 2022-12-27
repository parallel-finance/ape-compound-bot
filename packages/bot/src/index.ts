import { logger } from "@para-space/utils"
import { runtime, Runtime } from "./runtime"

async function main() {
    try {
        logger.info("Starting paraspace-ape-compound-bot")
        await Runtime.initialize()

        logger.info(`Your address: ${runtime.wallet.address}`)

        // TODO: @rjman-ljm: finish the bot logic here

        logger.info("Stopping paraspace-ape-compound-bot")
    } catch (e) {
        logger.error(`process error: ${e}`)
        console.trace(e)
    }
}

main().then(() => process.exit(0))
