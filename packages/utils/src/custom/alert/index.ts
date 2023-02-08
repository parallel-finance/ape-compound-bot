import { mapErrMsg } from "../../general/common"
import { logger } from "../../logger"

import * as boot from "./boot"
import { slackAppName } from "./config"
import { parseToLinkString } from "./slack"
import * as slack from "./slack"

interface Alert {
  info: (...args: (string | slack.Field[])[]) => Promise<void>
  warn: (...args: (string | Error | slack.Field[])[]) => Promise<void>
  error: (...args: (string | Error | slack.Field[])[]) => Promise<void>
}

export const alert: Alert = { info, error, warn }

export async function info(...args: (string | slack.Field[])[]): Promise<void> {
  if (slackAppName === "") return
  await slack.info(...args).catch(err => {
    const errMsg = `alert failed to send info message :( ${mapErrMsg(err)}`
    logger.error(errMsg)
    throw new Error(errMsg)
  })
}

export async function warn(...args: (string | Error | slack.Field[])[]): Promise<void> {
  if (slackAppName === "") return
  await slack.warn(...args).catch(err => {
    const errMsg = `alert failed to send warn message :( ${mapErrMsg(err)}`
    logger.error(errMsg)
    throw new Error(errMsg)
  })
}

export async function error(...args: (string | Error | slack.Field[])[]): Promise<void> {
  if (slackAppName === "") return
  await slack.error(...args).catch(err => {
    const errMsg = `alert failed to send error message :( ${mapErrMsg(err)}`
    logger.error(errMsg)
    throw new Error(errMsg)
  })
}

export async function initSlackAlert() {
  try {
    logger.debug("slack boot init...")
    boot.init()

    await info("slack alert initialized :)", [
      { name: "project", value: "paraspace-ape-compound-bot" }
    ])
  } catch (err) {
    const errMsg = `alert failed to initialize :( ${mapErrMsg(err)}`
    logger.error(errMsg)
    throw new Error(errMsg)
  }
}

export { parseToLinkString }
