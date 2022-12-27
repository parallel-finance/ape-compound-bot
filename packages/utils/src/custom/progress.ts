import { stdout as slog } from "single-line-log"

export class ProgressBar {
  description: string
  length: number
  constructor(description: string, barLength: number) {
    this.description = description || "Progress"
    this.length = barLength || 25
  }

  render = (opts: { completed: number; total: number }) => {
    const percent: number = Number((opts.completed / opts.total).toFixed(4))
    const cell_num = Math.floor(percent * this.length)

    let cell = ""
    let empty = ""
    for (let i = 0; i < cell_num; i++) cell += "█"
    for (let i = 0; i < this.length - cell_num; i++) empty += "░"

    const cmdText =
      this.description +
      ": " +
      (100 * percent).toFixed(2) +
      "% " +
      cell +
      empty +
      " " +
      opts.completed +
      "/" +
      opts.total +
      "\n"

    slog(cmdText)
  }
}
