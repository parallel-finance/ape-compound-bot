const convertToTimestamp = (timestamp: string) =>
  Number(timestamp.length === 10 ? Number(timestamp) * 1000 : timestamp)

const inTimeRange = (start: string, end: string, now: string, bias: number = 60): boolean => {
  const nowTime: number = convertToTimestamp(now)
  return nowTime >= convertToTimestamp(start) && nowTime + bias <= convertToTimestamp(end)
}

export { inTimeRange }
