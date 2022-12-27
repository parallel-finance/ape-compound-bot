import { logger } from "./logger"
import * as Logger from "./logger"
import * as General from "./general"
import * as Config from "./config"
import * as Custom from "./custom"

export * from "./logger"
export * from "./general"
export * from "./config"
export * from "./custom"
export * from "./base"

export default {
  logger,
  Logger,
  General,
  Config,
  Custom
}
