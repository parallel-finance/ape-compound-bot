import { logger } from "../logger"

export const getStringEnv = (envName: string, must: boolean = false): string | undefined => {
  const value = process.env[envName]
  if (!value) {
    if (must) logger.error(`Configuration ${envName} is not specified`)
    return undefined
  }
  return value
}

export const getNumEnv = (envName: string, must: boolean = false): number | undefined => {
  const value = Number(getStringEnv(envName, must))
  return Number.isNaN(value) ? undefined : value
}

export const getBooleanEnv = (envName: string, must: boolean = false): boolean => {
  const envValue = getStringEnv(envName, must)
  return envValue ? Boolean(envValue.toUpperCase() === "TRUE") : false
}
