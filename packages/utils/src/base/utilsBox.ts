import dotenvExpand from "dotenv-expand"
import { Logger } from "pino"
import { getGlobalConfig, GlobalConfig } from "../config"
import { Recordable } from "../general"
import logger, { createAlarmLogger } from "../logger"
import { AlarmLogger, AlarmLoggerConfig } from "../logger/types"

export let utilsBox: {
  config?: GlobalConfig
  loggers: Recordable<Logger>
  alarmLogger?: AlarmLogger
} = {
  config: undefined,
  loggers: {},
  alarmLogger: undefined
}

export namespace UtilsBox {
  export function init(envs: any) {
    try {
      dotenvExpand.expand(envs)
      const globalConfig: GlobalConfig = getGlobalConfig()

      utilsBox.config = globalConfig
      logger.info(`Utils are initialized for ${globalConfig.net.environment} ${globalConfig.net.networkName}`)
    } catch (e) {
      logger.error(`UtilsBox init error: ${e}`)
    }
  }

  export function getConfig(): GlobalConfig {
    if (!utilsBox.config) {
      logger.error("Utils config is not initialized")
    }
    return utilsBox.config!
  }

  export function initAlarmLogger(config: AlarmLoggerConfig) {
    logger.info("Initialize alarm logger...")

    utilsBox.alarmLogger = <AlarmLogger>createAlarmLogger(config)
  }
}
