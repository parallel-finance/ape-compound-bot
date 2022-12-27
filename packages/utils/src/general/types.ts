export type Maybe<T> = T | undefined | null
export type AccountAddress = string
export type ContractAddress = string
export type Address = AccountAddress | ContractAddress
export type Recordable<T = any> = Record<string, T>
