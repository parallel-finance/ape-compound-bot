# :robot: APE-compound-bot

A bot that automatically claims APE rewards from ApeStaking in ParaSpace and then compound them, you can use the bot to earn rewards from this [operation](https://github.com/para-space), see our document.

## :bulb: Getting started

### 0. Prerequisites

- `pnpm install`: install dependencies
- `pnpm build`: build the project
- `cp .env.sample .env`: copy sample env file and configure environment variables in `.env` file

see [How to configure the bot](#how-to-configure-the-bot) for more details.

### 1. Create Keystore

:see_no_evil: Do not share screen while creating keystore

`pnpm create:keystore`

![create:keystore](https://github.com/para-space/ape-compound-bot/blob/master/resources/ape-compound-bot-keystore.gif)

The script will generate a keystore file in `**/keystore/default/<your-address>`, you can run the ape-compound-bot via this keystore.

### 2. Run via keystore or private key

You may need to run `pnpm build` before running the bot.

`pnpm start`

## :wrench: Appendix

### How to configure the bot

The bot is configured via environment variables. You can find the list of environment variables in the [`.env.sample`](.env.sample) file.

<details>
<summary>The .env file contains the following variables you need to configure:</summary>

- `ETH_ENDPOINT=<your-RPC-endpoint>`: The RPC endpoint of the Ethereum network you want to connect to. You can use [Infura](https://infura.io/) or [Alchemy](https://www.alchemy.com/) to get a free RPC endpoint.

- wallet connection: the bot will use the wallet to sign transactions directly.

  - **private key**: you can give the bot a private key directly.
  - **keystore** and **password**: you can give the bot a keystore and the password of the keystore, the bot will unlock the keystore you encrypted with the password.
</details>

<details>
<summary>Example .env</summary>

```shell
ETH_ENVIRONMENT=production
ETH_NETWORK_NAME=mainnet
ETH_ENDPOINT=https://eth-mainnet.g.alchemy.com/v2/<**your-api-key**>

# Make sure to set wallet connection, either:
## 1. private key
ETH_PRIVATE_KEY=

## 2. or keystore
### If you has a keystore `**/keystore/default/0x5D48a0512efE84C6Ed674481F774F285a85ab896` encrypted with password 123456
KEYSTORE_DIR=keystore/default
KEYSTORE_NAME=0x5D48a0512efE84C6Ed674481F774F285a85ab896
# PASSWORD_BASE64=MTIzNDU2
PASSWORD=123456
```
</details>

### How to start the bot

`pnpm start`: run the bot via **private key** or **keystore**

1. If you want to run the bot via **private key**, you need to set the `ETH_PRIVATE_KEY` environment variable.
2. If you want to run the bot via **keystore**, you need to set the `KEYSTORE_DIR` and `KEYSTORE_NAME` environment variables. The console will ask you to enter the password of the keystore you set in [1. Create Keystore](#1-create-keystore)

This project is [MIT Licensed](LICENSE).
