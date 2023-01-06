import { ValidCompoundInfo } from "../src/types"
import { splitCompoundInfos } from "../src/compound"

describe("split tokenIds should work correctly", () => {
  const compoundInfo: ValidCompoundInfo = {
    bayc: {
      nftAsset: "BAYC",
      users: ["A", "B", "C", "D", "E"],
      tokenIds: [
        ["0"],
        ["1", "2", "3"],
        ["4", "5", "6", "7", "8", "9"],
        ["10", "11"],
        ["12", "13", "14", "15", "16", "17", "18", "19", "20", "21"]
      ],
      validStaked: []
    },
    mayc: {
      nftAsset: "MAYC",
      users: ["A", "B", "C"],
      tokenIds: [
        ["0", "1", "2", "3"],
        ["4", "5", "6"],
        ["7", "8", "9", "10", "11"]
      ],
      validStaked: []
    }
  }

  it("split compoundInfo with 10 tokenIds per batch", () => {
    const res = splitCompoundInfos(compoundInfo, 10)

    expect(res.length).toBe(5)
    expect(res[0]).toStrictEqual({
      nftAsset: "BAYC",
      users: ["A", "B", "C"],
      tokenIds: [["0"], ["1", "2", "3"], ["4", "5", "6", "7", "8", "9"]],
      validStaked: []
    })
    expect(res[1]).toStrictEqual({
      nftAsset: "BAYC",
      users: ["D", "E"],
      tokenIds: [
        ["10", "11"],
        ["12", "13", "14", "15", "16", "17", "18", "19"]
      ],
      validStaked: []
    })
    expect(res[2]).toStrictEqual({
      nftAsset: "BAYC",
      users: ["E"],
      tokenIds: [["20", "21"]],
      validStaked: []
    })
    expect(res[3]).toStrictEqual({
      nftAsset: "MAYC",
      users: ["A", "B", "C"],
      tokenIds: [
        ["0", "1", "2", "3"],
        ["4", "5", "6"],
        ["7", "8", "9"]
      ],
      validStaked: []
    })
    expect(res[4]).toStrictEqual({
      nftAsset: "MAYC",
      users: ["C"],
      tokenIds: [["10", "11"]],
      validStaked: []
    })
  })

  it("split compoundInfo with higher/lower limit should work", () => {
    const res1 = splitCompoundInfos(compoundInfo, 1000)
    expect(res1.length).toBe(2)

    const res2 = splitCompoundInfos(compoundInfo, 3)
    console.log(res2)
    expect(res2.length).toBe(12)

    const res3 = splitCompoundInfos(compoundInfo, 1)
    expect(res3.length).toBe(34)
  })
})
