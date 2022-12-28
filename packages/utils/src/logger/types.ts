import pino from "pino"

export type Logger = pino.Logger

export enum Metrics {
  ApeCompoundBotHealth = "ApeCompoundBotHealth"
}

export interface PagerdutyParams {
  payload: {
    summary: string
    timestamp?: string
    severity: "critical" | "error" | "warning" | "info"
    source: string
    component?: string
    group?: string
    class?: string
    // eslint-disable-next-line
    custom_details?: Record<string, string>
  }
  // eslint-disable-next-line
  routing_key?: string
  // eslint-disable-next-line
  event_action: "trigger" | "acknowledge" | "resolve"
  // eslint-disable-next-line
  dedup_key?: string
  client?: string
  // eslint-disable-next-line
  client_url?: string
  links?: {
    href: string
    text?: string
  }[]
  images?: {
    src: string
    href?: string
    alt?: string
  }[]
}

export type AlarmLogger = Logger & {
  alert: (webhook: string, payload: PagerdutyParams) => Promise<void>
}

export interface AlarmLoggerConfig {
  useCloudWatch: boolean
  chain: string
  structuredLog: boolean
}
