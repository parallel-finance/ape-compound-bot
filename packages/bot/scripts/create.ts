import { logger, Wallet } from "ethers";
import path from "path";
import fs from "fs";
import { getTextViaConsole } from "@para-space/utils";
import { keystore } from "@para-space/keystore";

async function main() {
    const mnemonic = await getTextViaConsole("Please enter your mnemonic: ", true)
    const password = await getTextViaConsole("Enter password: ", true)
    const wallet = Wallet.fromMnemonic(mnemonic)
    const jsonWallet = await wallet.encrypt(password);

    const dir = path.resolve(keystore.params.DefaultKeystoreDir, keystore.types.KeystoreTypeDefault);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const keystorePath = path.resolve(keystore.params.DefaultKeystoreDir, keystore.types.KeystoreTypeDefault, wallet.address.toLowerCase());
    logger.info(`Keystore file is saved to ${keystorePath}`)
    fs.writeFileSync(keystorePath, jsonWallet);
}

main().catch(
    (err: any) => {
        console.error(err);
        process.exit(1);
    }
);
