import { getPasswordFromLocalOrConsole, logger, sleep, UtilsBox } from "@para-space/utils"
import { Environment, NetworkName, Provider } from "paraspace-api"

import dotenv from "dotenv"
import { Wallet } from "ethers"
import { keystore } from "@para-space/keystore"
import path from "path"
import fs from "fs"
import { DefaultKeystoreDir } from "@para-space/keystore/dist/lib/params"
import { KeystoreTypeDefault } from "@para-space/keystore/dist/lib/types"

dotenv.config({ path: ".env" })

export let runtime: {
    provider: Provider
    wallet: Wallet
}

export namespace Runtime {
    export async function initialize() {
        const envs = dotenv.config({ path: ".env" })
        UtilsBox.init(envs)

        const {
            net: {
                environment,
                networkName,
                endpoint,
            },
            wallet: {
                privateKey,
                keystoreDir,
                address,
                plainPassword,
                base64Password,
            }
        } = UtilsBox.getConfig()

        // Check if the environment and network name is valid
        if (!Object.values(Environment).includes(<Environment>environment)
            || !Object.values(NetworkName).includes(<NetworkName>networkName)) {
            throw new Error(`Invalid environment: ${environment} or networkName: ${networkName}`)
        }

        const provider: Provider = new Provider(<Environment>environment, <NetworkName>networkName, endpoint)
        await provider.init()

        let wallet: Wallet
        if (privateKey) {
            wallet = Wallet.fromMnemonic(privateKey)
        } else {
            const keystorePath = path.resolve(keystoreDir || DefaultKeystoreDir + KeystoreTypeDefault, address.toLowerCase());
            if (!fs.existsSync(keystorePath)) throw new Error(`Keystore path is not found, ${keystorePath}`)

            let password = base64Password || plainPassword
            if (!password) password = await getPasswordFromLocalOrConsole()

            logger.info(`Unlocked keystore path: ${keystorePath}`)
            wallet = await keystore.InspectKeystoreWallet(
                address,
                KeystoreTypeDefault,
                password,
                {
                    isBase64: !!base64Password,
                }
            )
        }

        runtime = {
            provider,
            wallet: wallet.connect(provider.getProvider()),
        }
    }
}