export interface Field {
  name: string
  value: string
}

export enum BlockType {
  // eslint-disable-next-line no-unused-vars
  section = "section",
  // eslint-disable-next-line no-unused-vars
  context = "context",
  // eslint-disable-next-line no-unused-vars
  divider = "divider"
}

export enum TextType {
  // eslint-disable-next-line no-unused-vars
  mrkdwn = "mrkdwn"
}

export enum Color {
  // eslint-disable-next-line no-unused-vars
  yellow = "#fcc419",
  // eslint-disable-next-line no-unused-vars
  danger = "#ef5350"
}

export interface Text {
  type: TextType
  text: string
}

export interface LogNotifyArgs {
  text?: string
  desc?: string
  fields?: Field[]
}

export interface ErrorNotifyArgs {
  text?: string
  desc?: string
  fields?: Field[]
  error?: Error
}

export interface Block {
  type: BlockType
}

export interface TextBlock extends Block {
  text: Text
}

export interface FieldsBlock extends Block {
  fields: Text[]
}

export interface ContextBlock extends Block {
  elements: Text[]
}
