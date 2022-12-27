import { Maybe } from "./types"

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const notEmpty = <T>(value: Maybe<T>): value is T => value !== null && value !== undefined

export const isNumber = (val: string) => {
  const regPos = /^[0-9]+.?[0-9]*/
  return regPos.test(val)
}

export const ObjectTransformer = <T, E>(
  obj: Record<string, T>,
  transform: (x: T) => E
): Record<string, E> => {
  let newObj: Record<string, E> = {}
  Object.entries(obj).map(([k, v]: [string, T]) => {
    if (!isNumber(k)) newObj[k] = transform(v)
  })
  return newObj
}

export const mapErrMsg = (err: any): string => err.message.slice(0, 400)
