import { BigNumber } from "bignumber.js"
import { BigNumber as EtherBN, BigNumberish } from "ethers"

export const BigNumberZeroDecimal = BigNumber.clone({
  DECIMAL_PLACES: 0,
  ROUNDING_MODE: BigNumber.ROUND_DOWN
})

export function valToBN(amount: any) {
  if (amount instanceof BigNumber) {
    return amount
  }
  return new BigNumber(amount)
}

export function valueToZDBigNumber(amount: any) {
  return new BigNumberZeroDecimal(amount)
}

export function normalize(n: any, decimals: number) {
  return normalizeBN(n, decimals).toString(10)
}

export function normalizeBN(n: any, decimals: number) {
  return valToBN(n).shiftedBy(decimals * -1)
}

export const sub = (a: string, b: string): string => {
  const res = valToBN(a).lt(b) ? "0" : valToBN(a).minus(b).toFixed()
  return Number(res) < 1 ? "0" : res
}

export const add = (a: string, b: string): string => valToBN(a).plus(b).toFixed()

export const mul = (amount: string, percent: string) => percentMul(amount, percent).toString()

export const percentDiv = (val: BigNumberish, percent: BigNumberish) => {
  const halfBps = EtherBN.from(percent).div(2)
  return halfBps.add(EtherBN.from(val).mul(10000)).div(percent)
}

export const percentMul = (val: BigNumberish, percent: BigNumberish) => {
  const halfBps = EtherBN.from(percent).div(2)
  return halfBps.add(EtherBN.from(val).mul(percent)).div(10000)
}

export const pow = function (val: string | number): EtherBN {
  return EtherBN.from(10).pow(EtherBN.from(val))
}

const hexRegex = /[A-Fa-fx]/g

export const toHex = (n: BigNumberish, numBytes: number = 0) => {
  const asHexString = EtherBN.isBigNumber(n)
    ? n.toHexString().slice(2)
    : typeof n === "string"
    ? hexRegex.test(n)
      ? n.replace(/0x/, "")
      : Number(n).toString(16)
    : Number(n).toString(16)
  return `0x${asHexString.padStart(numBytes * 2, "0")}`
}

export const toBN = (n: BigNumberish) => EtherBN.from(toHex(n))
