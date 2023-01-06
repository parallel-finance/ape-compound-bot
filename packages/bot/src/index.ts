import { logger } from "@para-space/utils"
import { claimAndCompound } from "./compound"
import { fetchCompoundInfo } from "./fetch"
import { Runtime } from "./runtime"
import { ValidCompoundInfo } from "./types"

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
