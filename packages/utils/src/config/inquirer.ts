import inquirer from "inquirer"
import * as fs from "fs-extra"
import { logger } from "../logger"

export async function getPasswordFromLocalOrConsole(path: string = "/tmp/para-space-ape-compound-bot-seed") {
  let privateKey: string
  try {
    privateKey = fs.readFileSync(path).toString()
    fs.remove(path, (err: any) => {
      if (err) return logger.error(err)
    })
  } catch (_err) {
    privateKey = await inquirer
      .prompt<{ seed: string }>([
        {
          type: "password",
          name: "seed",
          message: "Input your keystore password: "
        }
      ])
      .then(({ seed }) => seed)
  }

  return privateKey.trim()
}

export const getConfirmViaConsole = async (message: string) => {
  const flag = await inquirer
    .prompt<{ state: string }>([
      {
        type: "input",
        name: "state",
        message: message
      }
    ])
    .then(({ state }) => {
      return state
    })
  return flag.trim().toLocaleUpperCase()
}

export const getTextViaConsole = async (message: string, privacyMode: boolean = false) => {
  const privacy = privacyMode ? "password" : "input"
  const text = await inquirer
    .prompt<{ text: string }>([
      {
        type: privacy,
        name: "text",
        message: message
      }
    ])
    .then(({ text }) => {
      return text
    })
  return text.trim()
}

export const selectListViaConsole = async (message: string, choices: string[]) => {
  const typePromptList = [
    {
      type: "rawlist",
      message: message,
      pageSize: 10,
      name: "value",
      choices: choices
    }
  ]
  return await inquirer.prompt<{ value: string }>(typePromptList).then(({ value }) => value)
}

export const getMultipleParamsViaConsole = async (message: string) => {
  return await inquirer
    .prompt<{ params: string }>([
      {
        type: "input",
        name: "params",
        message: message
      }
    ])
    .then(({ params }) => params.split(" ").filter(ele => ele !== ""))
}
