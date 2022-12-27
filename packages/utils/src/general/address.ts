import { ethers } from "ethers"

const convertToChecksumAddress = (address: string) => {
  try {
    if (address === "" || !address) return address
    return ethers.utils.getAddress(address?.toLowerCase())
  } catch (e) {
    return address
  }
}

export const sameAddress = (addr1: string, addr2: string): boolean =>
  convertToChecksumAddress(addr1) === convertToChecksumAddress(addr2)

export const toEtherscanLink = (txHash: string, network: string, isMainnet: boolean): string =>
  `https://${(isMainnet ? "" : `${network}.`) + "etherscan.io"}/tx/` + txHash
