import { getPasswordFromLocalOrConsole, logger, UtilsBox } from "@para-space/utils"
import { Environment, NetworkName, ParaspaceMM, Provider, Types } from "paraspace-api"

import dotenv from "dotenv"
import { Wallet } from "ethers"
import { keystore } from "@para-space/keystore"
import path from "path"
import fs from "fs"
import { DefaultKeystoreDir } from "@para-space/keystore/dist/lib/params"
import { KeystoreTypeDefault } from "@para-space/keystore/dist/lib/types"
import { ContractAddress } from "@para-space/utils"

dotenv.config({ path: ".env" })

export let runtime: {
    provider: Provider
    wallet: Wallet
    contracts: {
        nBAYC: ContractAddress
        nMAYC: ContractAddress
        apeCoinStaking: ContractAddress
        pool: ContractAddress
    }
    networkName: NetworkName
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
                keystoreName,
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

        const { ERC721, protocol } = provider.getContracts();
        const pool: Types.IPool = await provider.connectContract(ParaspaceMM.Pool);
        const baycData = await pool.getReserveData(ERC721.BAYC);
        const maycData = await pool.getReserveData(ERC721.MAYC);

        let wallet: Wallet
        if (privateKey) {
            wallet = Wallet.fromMnemonic(privateKey)
        } else {
            if (!keystoreName) throw new Error("Please give a keystore filename in .env");

            const keystorePath = path.resolve(keystoreDir || DefaultKeystoreDir + KeystoreTypeDefault, keystoreName.toLowerCase());
            if (!fs.existsSync(keystorePath)) throw new Error(`Keystore path is not found, ${keystorePath}`)

            let password = base64Password || plainPassword
            if (!password) password = await getPasswordFromLocalOrConsole()

            logger.info(`Unlocked keystore path: ${keystorePath}`)
            wallet = await keystore.InspectKeystoreWallet(
                keystoreName,
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
            contracts: {
                apeCoinStaking: protocol.apeCoinStaking,
                pool: protocol.pool,
                nBAYC: baycData.xTokenAddress,
                nMAYC: maycData.xTokenAddress
            },
            networkName: <NetworkName>networkName
        }
    }
}