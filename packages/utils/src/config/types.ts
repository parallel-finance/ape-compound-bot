export type NetworkConfiguration<T = any> = {
  mainnet: T
  goerli: T
  fork_mainnet: T
  [key: string]: T
}

export interface CommandConfig {
  network: string
  dryRun: boolean
  endpoint: string
}
