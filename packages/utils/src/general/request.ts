export const splitRangeBySize = (range: [number, number], size: number): [number, number][] => {
  const result: [number, number][] = []
  let [start, end] = range
  if (start > end) [start, end] = [end, start]
  for (let i = start; i <= end; i += size) result.push([i, Math.min(i + size - 1, end)])
  return result
}

export const collectAndFlat = async <T>(promises: Promise<T[]>[]): Promise<T[]> =>
  (await Promise.all(promises)).flat()
