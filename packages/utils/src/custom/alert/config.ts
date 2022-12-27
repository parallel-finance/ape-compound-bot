import readPkg from "read-pkg"
import { cosmiconfigSync } from "cosmiconfig"
import { logger } from "../../logger"
import { ConfigStore, ToolDetail } from "./types"

export const slackAppName = process.env.SLACK_APP_NAME || ""
export const slackWebhook = process.env.SLACK_WEBHOOK || ""

export default class Config {
  private static instance: Config
  private static tools: ToolDetail[]

  private configStore: ConfigStore

  private constructor(configStore: ConfigStore) {
    this.configStore = configStore
  }

  private static getInstance(): Config {
    if (!this.instance) {
      throw new Error("Config not initialized")
    }

    return this.instance
  }

  private static isConfigStoreValid(configStore: ConfigStore): boolean {
    if (!configStore || !configStore.slackWebhook) {
      return false
    }

    return true
  }

  private static getConfigViaEnvVariables(): ConfigStore {
    return {
      project: slackAppName,
      slackWebhook: slackWebhook,
      tools: []
    }
  }

  private static loadAlertConfig(): ConfigStore {
    // get config from `rc` file
    const explorerSync = cosmiconfigSync("alert")
    const searchResult = explorerSync.search()

    const alertConfig = searchResult
      ? (searchResult.config as ConfigStore)
      : Config.getConfigViaEnvVariables()

    return alertConfig
  }

  public static init(): void {
    if (this.instance) {
      logger.debug("alert config is already initialized")
      return
    }

    const configStore = this.loadAlertConfig()

    if (!this.isConfigStoreValid(configStore)) {
      logger.debug("Invalid alert config")
    }

    if (!configStore.project) {
      try {
        const packageJSONDetails = readPkg.sync
        configStore.project = packageJSONDetails.name
      } catch (err) {}
    }

    this.instance = new Config(configStore)
  }

  public static getConfig(): ConfigStore {
    return this.getInstance().configStore
  }

  public static getProjectName(): string {
    const name = Config.getConfig().project
    return name || "project"
  }

  // TODO consider alternate module for tools
  private static initTools(): void {
    const tools: ToolDetail[] = []
    const configStore = this.getConfig()

    if (configStore.tools && configStore.tools.length) {
      configStore.tools.forEach(tool => {
        if (tool && tool.name && tool.link) {
          tools.push(tool)
        }
      })
    }

    this.tools = tools
  }

  public static getToolDetailsFromConfig(): ToolDetail[] {
    if (!this.tools) {
      this.initTools()
    }

    return this.tools
  }
}
