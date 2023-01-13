import pino from "pino"
import { AlarmLogger, AlarmLoggerConfig, PagerdutyParams } from "./types"

import * as dotenv from "dotenv"
import axios from "axios"
import CloudWatch, { MetricData, PutMetricDataInput } from "aws-sdk/clients/cloudwatch"

dotenv.config({ path: ".env" })

const transport = pino.transport({
  targets: [
    {
      level: "debug",
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        crlf: true,
        minimumLevel: "trace"
        // levelFirst: true,
        // singleLine: true,
      }
    }
  ]
})

export namespace CloudwatchClient {
  let cloudwatch: CloudWatch | undefined

  // Initialize CloudWatch client
  export function init() {
    const AWS = require("aws-sdk")
    AWS.config.update({ region: "us-east-2" })
    cloudwatch = new AWS.CloudWatch()
    logger.info("Initialize cloudwatch client")
  }

  // Send metric data to CloudWatch
  export function putMetricData(config: AlarmLoggerConfig, data: MetricData) {
    const params: PutMetricDataInput = {
      MetricData: data.map(e => ({
        ...e,
        Dimensions: [
          {
            Name: "Chain",
            Value: config.chain
          }
        ]
      })),
      Namespace: "para-space-ape-compound-bot"
    }

    cloudwatch!
      .putMetricData(params)
      .promise()
      .catch((e: any) =>
        logger.error({
          msg: `putMetricData error: ${JSON.stringify(params)}, ${e}`
        })
      )
      .finally(() => logger.debug(`CloudWatch metric sent: ${JSON.stringify(params)}`))
  }
}

export const createAlarmLogger = (
  config: AlarmLoggerConfig = {
    useCloudWatch: false,
    chain: process.env.ETH_NETWORK_NAME || "unknown",
    structuredLog: process.env.STRUCTURED_LOG?.toUpperCase() === "TRUE"
  }
): AlarmLogger => {
  if (config.useCloudWatch) CloudwatchClient.init()

  const logger = pino(
    {
      // name: "alarm",
      hooks: {
        logMethod(args, method, level) {
          if (level >= 0 /*level value of WARN*/ && typeof args[0] === "object") {
            const payload = args[0]
            payload["metric"] &&
              CloudwatchClient.putMetricData(config, [
                {
                  MetricName: payload["metric"],
                  Value: "value" in payload ? payload["value"] : 1
                }
              ])
          }
          return method.apply(this, args as any)
        }
      },
      level: "debug",
      levelVal: 10,
      customLevels: {
        metric: 100
      }
    },
    config.structuredLog ? undefined : transport
  )

  const alarmLogger: AlarmLogger = Object.assign(logger, {
    alert: async (webhook: string, message: PagerdutyParams) => {
      const endpoint = "https://events.pagerduty.com/v2/enqueue"
      message.routing_key = webhook
      try {
        logger.debug(`Sending message to pagerduty: ${JSON.stringify(message)}`)
        await axios.post(endpoint, message)
        logger.info(`send alert to pagerduty: ${message.payload.summary}`)
      } catch (err) {
        logger.error(`send alert to pagerduty meet error: ${err}`)
      }
    }
  })

  return alarmLogger
}

export let logger = createAlarmLogger()
