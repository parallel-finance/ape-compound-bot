import { Wallet } from "ethers";
import path from "path";
import fs from "fs";
import { getTextViaConsole } from "@para-space/utils";
import { DefaultKeystoreDir } from "@para-space/keystore/dist/lib/params";
import { KeystoreTypeDefault } from "@para-space/keystore/dist/lib/types";

async function main() {
    const mnemonic = await getTextViaConsole("Please enter your mnemonic: ", true)
    const password = await getTextViaConsole("Enter password: ", true)
    const wallet = Wallet.fromMnemonic(mnemonic)
    const jsonWallet = await wallet.encrypt(password);

    const dir = path.resolve(DefaultKeystoreDir, KeystoreTypeDefault);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const keystorePath = path.resolve(DefaultKeystoreDir, KeystoreTypeDefault, wallet.address.toLowerCase());
    console.log(`Key file is saved to ${keystorePath}`)
    fs.writeFileSync(keystorePath, jsonWallet);
}

main().catch(
    (err: any) => {
        console.error(err);
        process.exit(1);
    }
);
