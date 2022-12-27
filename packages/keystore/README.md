# Ether Keystore

[![npm](https://img.shields.io/npm/v/@jovijovi/ether-keystore.svg)](https://www.npmjs.com/package/@jovijovi/ether-keystore)
[![GitHub Actions](https://github.com/jovijovi/ether-keystore/workflows/Test/badge.svg)](https://github.com/jovijovi/ether-keystore)
[![Coverage](https://img.shields.io/codecov/c/github/jovijovi/ether-keystore?label=\&logo=codecov\&logoColor=fff)](https://codecov.io/gh/jovijovi/ether-keystore)

A keystore toolkit for Ethereum ecosystem.

## Philosophy

*:kiss: KISS. Keep it small and simple.*

## Features

- Retrieves wallet or private key from encrypted JSON wallet with password
- Keystore cache

## Development Environment

- typescript `4.9.3`
- node `v18.12.1`
- ts-node `v10.9.1`
- yarn `v1.22.19`

## Install

```shell
npm install @jovijovi/ether-keystore
```

or

```shell
yarn add @jovijovi/ether-keystore
```

## Usage

```typescript
import {keystore} from '@jovijovi/ether-keystore';

const pk = await keystore.InspectKeystorePK(
    '0x7a1bdd1481e5713e36f501a8cca4a9eaa423d547',   // Wallet address
    keystore.types.KeystoreTypeMiner,               // Keystore type
    'MTIzNDU2'                                      // Passphrase in BASE64
);
console.log("PK=", pk);

const wallet = await keystore.InspectKeystoreWallet(
    '0x7a1bdd1481e5713e36f501a8cca4a9eaa423d547',   // Wallet address
    keystore.types.KeystoreTypeFee,                 // Keystore type
    'MTIzNDU2'                                      // Passphrase in BASE64
);
console.debug("Wallet address=", wallet.address);
```

## Roadmap

- Documents
- Security keystore in memory

## License

[MIT](LICENSE)
