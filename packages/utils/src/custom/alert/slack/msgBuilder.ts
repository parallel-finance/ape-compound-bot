import {
  Text,
  TextType,
  TextBlock,
  BlockType,
  FieldsBlock,
  Field,
  ContextBlock,
  Block
} from "./types"

function getMarkdownText(text: string): Text {
  return {
    type: TextType.mrkdwn,
    text: text
  }
}

function getTextBlock(text: string): TextBlock {
  return {
    type: BlockType.section,
    text: getMarkdownText(text)
  }
}

function getMultilineTextBlock(text: string): TextBlock {
  return {
    type: BlockType.section,
    text: getMarkdownText(parseToMultilineString(text))
  }
}

function getFieldMarkdownText(field: Field): Text {
  const fieldString = `*${field.name}*\n${field.value}`

  return getMarkdownText(fieldString)
}

function getFieldsBlock(fields: Field[]): FieldsBlock {
  return {
    type: BlockType.section,
    fields: fields.map(getFieldMarkdownText)
  }
}

function getContextBlock(elements: string[]): ContextBlock {
  return {
    type: BlockType.context,
    elements: elements.map(getMarkdownText)
  }
}

function getDividerBlock(): Block {
  return {
    type: BlockType.divider
  }
}

function parseToDateString(dt: Date): string {
  const dtUnix = Math.floor(dt.valueOf() / 1000)
  return `<!date^${dtUnix}^{date} at {time}|${dt.toISOString()}>`
}

function parseToLinkString(text: string, url: string): string {
  return `<${url}|${text}>`
}

function parseToWarnTitleString(customWarnMsg: string | undefined, err: Error | undefined): string {
  let warnTitle = ":mega:"

  if (customWarnMsg) {
    warnTitle += ` *${customWarnMsg}*`
  }

  if (err && err.message) {
    if (customWarnMsg) {
      warnTitle += `\nWarn: ${err.message}`
    } else {
      warnTitle += ` *Warn: ${err.message}*`
    }
  }

  return warnTitle
}

function parseToErrorTitleString(customErrMsg: string | undefined, err: Error | undefined): string {
  let errTitle = ":rotating_light:"

  if (customErrMsg) {
    errTitle += ` *${customErrMsg}*`
  }

  if (err && err.message) {
    if (customErrMsg) {
      errTitle += `\nError: ${err.message}`
    } else {
      errTitle += ` *Error: ${err.message}*`
    }
  }

  return errTitle
}

function parseToMultilineString(text: string): string {
  return "```" + text + "```"
}

export {
  getMarkdownText,
  getTextBlock,
  getMultilineTextBlock,
  getFieldMarkdownText,
  getFieldsBlock,
  getContextBlock,
  getDividerBlock,
  parseToDateString,
  parseToLinkString,
  parseToWarnTitleString,
  parseToErrorTitleString,
  parseToMultilineString
}
