import axios from "axios"

import Config from "../config"

import {
  getTextBlock,
  getFieldsBlock,
  getContextBlock,
  parseToDateString,
  parseToLinkString,
  parseToErrorTitleString,
  getDividerBlock,
  getMultilineTextBlock,
  parseToWarnTitleString
} from "./msgBuilder"
import { Color, ContextBlock, Field, LogNotifyArgs, ErrorNotifyArgs, FieldsBlock } from "./types"

export async function info(...args: (string | Field[])[]): Promise<void> {
  if (!args.length) {
    return
  }

  const logArgs = parseLogArgs(args)
  const payload: any = {
    attachments: [{ blocks: [] }]
  }

  if (logArgs.text) {
    payload.blocks = [getTextBlock(logArgs.text)]
  }

  if (logArgs.fields && logArgs.fields.length) {
    payload.attachments[0].blocks.push(getFieldsBlock(logArgs.fields))
  }

  if (logArgs.desc) {
    payload.attachments[0].blocks.push(getMultilineTextBlock(logArgs.desc))
  }

  payload.attachments[0].blocks.push(getContextForInfo())

  return sendMessage(payload)
}

export async function warn(...args: (string | Error | Field[])[]): Promise<void> {
  if (!args.length) {
    return
  }

  const errArgs = parseErrorArgs(args)

  const payload: any = {
    attachments: [{ color: Color.yellow, blocks: [] }]
  }

  payload.blocks = [getTextBlock(parseToWarnTitleString(errArgs.text, errArgs.error))]

  Array.prototype.push.apply(payload.attachments[0].blocks, getFieldsBlockForError(errArgs.fields))

  if (errArgs.error && errArgs.error.stack) {
    payload.attachments[0].blocks.push(getMultilineTextBlock(errArgs.error.stack))
  }

  if (errArgs.desc) {
    if (errArgs.error && errArgs.error.stack) {
      payload.attachments[0].blocks.push(getDividerBlock())
    }

    payload.attachments[0].blocks.push(getMultilineTextBlock(errArgs.desc))
  }

  payload.attachments[0].blocks.push(getContextForError())

  return sendMessage(payload)
}

export async function error(...args: (string | Error | Field[])[]): Promise<void> {
  if (!args.length) {
    return
  }

  const errArgs = parseErrorArgs(args)

  const payload: any = {
    attachments: [{ color: Color.danger, blocks: [] }]
  }

  payload.blocks = [getTextBlock(parseToErrorTitleString(errArgs.text, errArgs.error))]

  Array.prototype.push.apply(payload.attachments[0].blocks, getFieldsBlockForError(errArgs.fields))

  if (errArgs.error && errArgs.error.stack) {
    payload.attachments[0].blocks.push(getMultilineTextBlock(errArgs.error.stack))
  }

  if (errArgs.desc) {
    if (errArgs.error && errArgs.error.stack) {
      payload.attachments[0].blocks.push(getDividerBlock())
    }

    payload.attachments[0].blocks.push(getMultilineTextBlock(errArgs.desc))
  }

  payload.attachments[0].blocks.push(getContextForError())

  return sendMessage(payload)
}

async function sendMessage(payload: any): Promise<void> {
  return axios.post(Config.getConfig().slackWebhook, payload)
}

function getFieldsBlockForError(inputFields: Field[] | undefined): FieldsBlock[] {
  const now = new Date(Date.now())
  const resFieldBlocks: FieldsBlock[] = []

  const fields = inputFields ? inputFields.concat([]) : []

  const projectName = Config.getProjectName()
  if (projectName) {
    fields.push({ name: "Project", value: projectName })
  }

  fields.push({ name: "When", value: parseToDateString(now) })

  let sectionOfTwoFields: Field[] = []

  for (const field of fields) {
    sectionOfTwoFields.push(field)

    if (sectionOfTwoFields.length === 2) {
      resFieldBlocks.push(getFieldsBlock(sectionOfTwoFields))
      sectionOfTwoFields = []
    }
  }

  return resFieldBlocks
}

// TODO consider keeping a global singleton for this error content block
function getContextForError(): ContextBlock {
  const elements: string[] = [Config.getProjectName()]

  Config.getToolDetailsFromConfig().forEach(tool => {
    elements.push(parseToLinkString(tool.name, tool.link))
  })

  return getContextBlock(elements)
}

function getContextForInfo(): ContextBlock {
  const now = new Date(Date.now())
  const projectName = Config.getProjectName()

  return getContextBlock([[projectName || "", parseToDateString(now)].join(" - ")])
}

function parseLogArgs(args: (string | Field[])[]): LogNotifyArgs {
  const res: LogNotifyArgs = {}

  for (const arg of args) {
    if (Array.isArray(arg) && !res.fields) {
      res.fields = arg
    } else if (!res.text) {
      res.text = arg.toString()
    } else if (!res.desc) {
      res.desc = arg.toString()
    }
  }

  return res
}

function parseErrorArgs(args: (string | Error | Field[])[]): ErrorNotifyArgs {
  const res: ErrorNotifyArgs = {}

  for (const arg of args) {
    if (Array.isArray(arg) && !res.fields) {
      res.fields = arg
    } else if (arg instanceof Error) {
      res.error = arg
    } else if (!res.text) {
      res.text = arg.toString()
    } else if (!res.desc) {
      res.desc = arg.toString()
    }
  }

  return res
}
