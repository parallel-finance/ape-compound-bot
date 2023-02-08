import { getBooleanEnv, getNumEnv, getStringEnv } from "../general/getEnv"

export interface NetworkConfig {
  environment: string
  networkName: string
  endpoint: string
}
export interface WalletConfig {
  keystoreName: string
  privateKey: string
  base64Password: string
  plainPassword: string
  keystoreDir: string
}

export interface GeneralConfig {
  scanInterval: number
  structuredLog: boolean
}

export interface AlertConfig {
  slackAppName: string
  slackWebhook: string
  cloudWatchNameSpace: string
  pagerdutyWebhook: string
}

export interface GlobalConfig {
  net: NetworkConfig
  wallet: WalletConfig
  general: GeneralConfig
  alert: AlertConfig
}

export const getGlobalConfig = (): GlobalConfig => ({
  net: {
    environment: getStringEnv("ETH_ENVIRONMENT") || "development",
    networkName: getStringEnv("ETH_NETWORK_NAME") || "goerli",
    endpoint: getStringEnv("ETH_ENDPOINT") || ""
  },
  wallet: {
    privateKey: getStringEnv("ETH_PRIVATE_KEY") || "",
    keystoreDir: getStringEnv("KEYSTORE_DIR") || "keystore/default",
    keystoreName: getStringEnv("KEYSTORE_NAME") || "",
    base64Password: getStringEnv("PASSWORD_BASE64") || "",
    plainPassword: getStringEnv("PASSWORD") || ""
  },
  general: {
    scanInterval: getNumEnv("SCAN_INTERVAL") || 0.5,
    structuredLog: getBooleanEnv("STRUCTURED_LOG")
  },
  alert: {
    slackAppName: getStringEnv("SLACK_APP_NAME") || "",
    slackWebhook: getStringEnv("SLACK_WEBHOOK") || "",
    cloudWatchNameSpace: getStringEnv("CLOUD_WATCH_NAMESPACE") || "",
    pagerdutyWebhook: getStringEnv("PAGERDUTY_WEBHOOK") || ""
  }
})
