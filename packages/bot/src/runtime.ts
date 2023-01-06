import {
  Alert,
  getPasswordFromLocalOrConsole,
  logger,
  mapErrMsg,
  sleep,
  UtilsBox
} from "@para-space/utils"
import { Environment, NetworkName, ParaspaceMM, Provider, Types } from "paraspace-api"
import dotenv from "dotenv"
import { ethers, Wallet } from "ethers"
import path from "path"
import fs from "fs"
import { ContractAddress, types as LoggerTypes } from "@para-space/utils"
import { utilsBox } from "@para-space/utils"
import { keystore } from "@para-space/keystore"

dotenv.config({ path: ".env" })

export let runtime: {
  provider: Provider
  wallet: Wallet
  state: {
    balanceLow: boolean
  }
  contracts: {
    nBAYC: ContractAddress
    nMAYC: ContractAddress
    apeCoinStaking: ContractAddress
    pool: ContractAddress
  }
  isMainnet: boolean
  networkName: NetworkName
  pagerduty: {
    enable: boolean
    webhook: string
  }
  slack: {
    enable: boolean
    appName: string
    webhook: string
  }
  cloudWatch: {
    enable: boolean
  }
  interval: {
    scan: number
  }
}

export namespace Runtime {
  export async function run(worker: () => Promise<void>) {
    await initialize()
    logger.info(`Your address: ${runtime.wallet.address}`)

    let retryCount = 5
    while (true) {
      try {
        logger.info("start to run...")
        await checkBalanceSufficient(
          runtime.wallet.address,
          ethers.utils.parseEther("0.2").toString()
        )
        await worker()
        heartBeat()
        logger.info(`don't worry, still alive... interval ${runtime.interval.scan / 60 / 1000} m`)
      } catch (e) {
        if (retryCount-- > 0) {
          logger.error(`process error: ${mapErrMsg(e)}`)
          console.trace(e)
        } else {
          const errMsg = `Too many retry times, service failed to run... please check it. ${mapErrMsg(
            e
          )}}`
          logger.error(errMsg)

          sendPagerduty({
            payload: {
              summary: errMsg,
              severity: "warning",
              source: runtime.networkName,
              group: runtime.networkName
            },
            event_action: "trigger",
            client: "paraspace-ape-compound-bot"
          })
        }
      }

      await sleep(runtime.interval.scan)
    }
  }

  export async function initialize() {
    const envs = dotenv.config({ path: ".env" })
    UtilsBox.init(envs)

    const {
      net: { environment, networkName, endpoint },
      wallet: { privateKey, keystoreDir, keystoreName, plainPassword, base64Password },
      alert: { slackAppName, slackWebhook, cloudWatchNameSpace, pagerdutyWebhook },
      general: { scanInterval, structuredLog }
    } = UtilsBox.getConfig()

    // Check if the environment and network name is valid
    if (
      !Object.values(Environment).includes(<Environment>environment) ||
      !Object.values(NetworkName).includes(<NetworkName>networkName)
    ) {
      throw new Error(`Invalid environment: ${environment} or networkName: ${networkName}`)
    }

    const provider: Provider = new Provider(
      <Environment>environment,
      <NetworkName>networkName,
      endpoint
    )
    await provider.init()

    const { ERC721, protocol } = provider.getContracts()
    const pool: Types.IPool = await provider.connectContract(ParaspaceMM.Pool)
    const baycData = await pool.getReserveData(ERC721.BAYC)
    const maycData = await pool.getReserveData(ERC721.MAYC)

    let wallet: Wallet
    if (privateKey) {
      wallet =
        privateKey.indexOf(" ") < 0 ? new Wallet(privateKey) : Wallet.fromMnemonic(privateKey)
    } else {
      if (!keystoreName) throw new Error("Please give a keystore filename in .env")

      const keystorePath = path.resolve(
        keystoreDir || keystore.params.DefaultKeystoreDir + keystore.types.KeystoreTypeDefault,
        keystoreName.toLowerCase()
      )
      if (!fs.existsSync(keystorePath))
        throw new Error(`Keystore path is not found, ${keystorePath}`)

      let password = base64Password || plainPassword
      if (!password) password = await getPasswordFromLocalOrConsole()

      logger.info(`Unlocked keystore path: ${keystorePath}`)
      wallet = await keystore.InspectKeystoreWallet(
        keystoreName,
        keystore.types.KeystoreTypeDefault,
        password,
        {
          isBase64: !!base64Password
        }
      )
    }

    const useSlack = !!slackWebhook
    const useCloudWatch = !!cloudWatchNameSpace
    const usePagerduty = !!pagerdutyWebhook
    if (useSlack) {
      await Alert.initSlackAlert()
      UtilsBox.initAlarmLogger({ useCloudWatch, chain: networkName, structuredLog })
    }

    runtime = {
      provider,
      wallet: wallet.connect(provider.getProvider()),
      state: {
        balanceLow: false
      },
      contracts: {
        apeCoinStaking: protocol.apeCoinStaking,
        pool: protocol.pool,
        nBAYC: baycData.xTokenAddress,
        nMAYC: maycData.xTokenAddress
      },
      networkName: <NetworkName>networkName,
      isMainnet: [NetworkName.fork_mainnet, NetworkName.mainnet].includes(<NetworkName>networkName),
      pagerduty: {
        enable: usePagerduty,
        webhook: pagerdutyWebhook
      },
      slack: {
        enable: useSlack,
        appName: slackAppName,
        webhook: slackWebhook
      },
      cloudWatch: {
        enable: useCloudWatch
      },
      interval: {
        scan: scanInterval * 60 * 1000
      }
    }
  }

  async function heartBeat() {
    const metric = LoggerTypes.Metrics.ApeCompoundBotHealth
    cloudwatch({
      msg: "ApeCompoundBot:: new round",
      metric: metric,
      value: 1
    })
  }

  async function checkBalanceSufficient(address: string, amount: string): Promise<boolean> {
    const balance = await runtime.provider.getProvider().getBalance(address)
    const belowThanThreshold = balance.lt(amount)
    const inBalanceLowStatus = runtime.state.balanceLow
    if (belowThanThreshold && !inBalanceLowStatus) {
      runtime.state.balanceLow = true
      const warnMsg = `The balance of ${address} is low (${ethers.utils.formatEther(
        balance
      )}), please check it.`
      logger.warn(warnMsg)
      Alert.warn(warnMsg)
    } else if (!belowThanThreshold && inBalanceLowStatus) {
      runtime.state.balanceLow = false
    } else {
      // Do nothing
    }
    return !belowThanThreshold
  }

  export async function sendPagerduty(payload: LoggerTypes.PagerdutyParams) {
    if (runtime.pagerduty.enable) {
      if (!utilsBox.alarmLogger) {
        logger.error("pagerdutyLogger not initialized, please check it")
        return
      }
      utilsBox.alarmLogger.alert(runtime.pagerduty.webhook, payload)
    } else {
      // logger.warn("Pagerduty disabled, cannot send payload")
    }
  }

  export async function cloudwatch(metricData: { msg: string; metric: string; value: any }) {
    if (runtime.cloudWatch.enable) {
      if (!utilsBox.alarmLogger) {
        logger.error("alarm logger not initialized, please check it")
        return
      }
      utilsBox.alarmLogger.info(metricData)
    } else {
      // logger.warn(`CloudWatch disabled, cannot send metric data ${metricData}`)
    }
  }
}
