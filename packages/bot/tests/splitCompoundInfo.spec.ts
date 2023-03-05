import { ValidCompoundInfo } from "../src/types"
import { splitCompoundInfos } from "../src/supplyAndStake/compound"

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
            validStaked: [],
            isBakc: false,
            nftPairs: []
        },
        mayc: {
            nftAsset: "MAYC",
            users: ["A", "B", "C"],
            tokenIds: [
                ["0", "1", "2", "3"],
                ["4", "5", "6"],
                ["7", "8", "9", "10", "11"]
            ],
            validStaked: [],
            isBakc: false,
            nftPairs: []
        },
        bakcForBayc: {
            nftAsset: "BAYC",
            users: ["A", "B", "C", "D", "E"],
            tokenIds: [],
            validStaked: [],
            isBakc: true,
            nftPairs: [
                [
                    { mainTokenId: "21368", bakcTokenId: "9990" },
                    { mainTokenId: "12180", bakcTokenId: "2545" },
                    { mainTokenId: "29730", bakcTokenId: "8933" },
                    { mainTokenId: "23652", bakcTokenId: "9137" },
                    { mainTokenId: "4265", bakcTokenId: "1370" },
                    { mainTokenId: "3411", bakcTokenId: "6677" },
                    { mainTokenId: "14167", bakcTokenId: "1543" },
                    { mainTokenId: "516", bakcTokenId: "2393" },
                    { mainTokenId: "24058", bakcTokenId: "6312" },
                    { mainTokenId: "14666", bakcTokenId: "7635" },
                    { mainTokenId: "3641", bakcTokenId: "9160" },
                    { mainTokenId: "6987", bakcTokenId: "7457" }
                ],
                [
                    { mainTokenId: "27458", bakcTokenId: "6772" },
                    { mainTokenId: "14964", bakcTokenId: "7373" },
                    { mainTokenId: "16580", bakcTokenId: "3401" },
                    { mainTokenId: "26873", bakcTokenId: "9212" }
                ],
                [
                    { mainTokenId: "26206", bakcTokenId: "1154" },
                    { mainTokenId: "26207", bakcTokenId: "1155" },
                    { mainTokenId: "26208", bakcTokenId: "1156" },
                    { mainTokenId: "26209", bakcTokenId: "1157" },
                    { mainTokenId: "26210", bakcTokenId: "1158" },
                    { mainTokenId: "26211", bakcTokenId: "1159" }
                ],
                [{ mainTokenId: "15439", bakcTokenId: "2672" }],
                [{ mainTokenId: "18140", bakcTokenId: "7008" }]
            ]
        },
        bakcForMayc: {
            nftAsset: "MAYC",
            users: ["A", "B", "C", "D", "E"],
            tokenIds: [],
            validStaked: [],
            isBakc: true,
            nftPairs: [
                [
                    { mainTokenId: "21368", bakcTokenId: "9990" },
                    { mainTokenId: "12180", bakcTokenId: "2545" },
                    { mainTokenId: "29730", bakcTokenId: "8933" },
                    { mainTokenId: "23652", bakcTokenId: "9137" },
                    { mainTokenId: "4265", bakcTokenId: "1370" },
                    { mainTokenId: "3411", bakcTokenId: "6677" },
                    { mainTokenId: "14167", bakcTokenId: "1543" },
                    { mainTokenId: "516", bakcTokenId: "2393" },
                    { mainTokenId: "24058", bakcTokenId: "6312" },
                    { mainTokenId: "14666", bakcTokenId: "7635" },
                    { mainTokenId: "3641", bakcTokenId: "9160" },
                    { mainTokenId: "6987", bakcTokenId: "7457" }
                ],
                [
                    { mainTokenId: "27458", bakcTokenId: "6772" },
                    { mainTokenId: "14964", bakcTokenId: "7373" },
                    { mainTokenId: "16580", bakcTokenId: "3401" },
                    { mainTokenId: "26873", bakcTokenId: "9212" }
                ],
                [{ mainTokenId: "26206", bakcTokenId: "1154" }],
                [{ mainTokenId: "15439", bakcTokenId: "2672" }],
                [{ mainTokenId: "18140", bakcTokenId: "7008" }]
            ]
        }
    }

    it("split compoundInfo with 10 tokenIds per batch", () => {
        const res = splitCompoundInfos(compoundInfo, 10)

        expect(res.length).toBe(10)
        expect(res[0]).toStrictEqual({
            nftAsset: "BAYC",
            users: ["A", "B", "C"],
            tokenIds: [["0"], ["1", "2", "3"], ["4", "5", "6", "7", "8", "9"]],
            validStaked: [],
            isBakc: false,
            nftPairs: []
        })
        expect(res[1]).toStrictEqual({
            nftAsset: "BAYC",
            users: ["D", "E"],
            tokenIds: [
                ["10", "11"],
                ["12", "13", "14", "15", "16", "17", "18", "19"]
            ],
            validStaked: [],
            isBakc: false,
            nftPairs: []
        })
        expect(res[2]).toStrictEqual({
            nftAsset: "BAYC",
            users: ["E"],
            tokenIds: [["20", "21"]],
            validStaked: [],
            isBakc: false,
            nftPairs: []
        })
        expect(res[3]).toStrictEqual({
            nftAsset: "MAYC",
            users: ["A", "B", "C"],
            tokenIds: [
                ["0", "1", "2", "3"],
                ["4", "5", "6"],
                ["7", "8", "9"]
            ],
            validStaked: [],
            isBakc: false,
            nftPairs: []
        })
        expect(res[4]).toStrictEqual({
            nftAsset: "MAYC",
            users: ["C"],
            tokenIds: [["10", "11"]],
            validStaked: [],
            isBakc: false,
            nftPairs: []
        })
        expect(res[5]).toStrictEqual({
            nftAsset: "BAYC",
            users: ["A"],
            tokenIds: [],
            validStaked: [],
            isBakc: true,
            nftPairs: [
                [
                    { mainTokenId: "21368", bakcTokenId: "9990" },
                    { mainTokenId: "12180", bakcTokenId: "2545" },
                    { mainTokenId: "29730", bakcTokenId: "8933" },
                    { mainTokenId: "23652", bakcTokenId: "9137" },
                    { mainTokenId: "4265", bakcTokenId: "1370" },
                    { mainTokenId: "3411", bakcTokenId: "6677" },
                    { mainTokenId: "14167", bakcTokenId: "1543" },
                    { mainTokenId: "516", bakcTokenId: "2393" },
                    { mainTokenId: "24058", bakcTokenId: "6312" },
                    { mainTokenId: "14666", bakcTokenId: "7635" }
                ]
            ]
        })
        expect(res[6]).toStrictEqual({
            nftAsset: "BAYC",
            users: ["A", "B", "C"],
            tokenIds: [],
            validStaked: [],
            isBakc: true,
            nftPairs: [
                [
                    { mainTokenId: "3641", bakcTokenId: "9160" },
                    { mainTokenId: "6987", bakcTokenId: "7457" }
                ],
                [
                    { mainTokenId: "27458", bakcTokenId: "6772" },
                    { mainTokenId: "14964", bakcTokenId: "7373" },
                    { mainTokenId: "16580", bakcTokenId: "3401" },
                    { mainTokenId: "26873", bakcTokenId: "9212" }
                ],
                [
                    { mainTokenId: "26206", bakcTokenId: "1154" },
                    { mainTokenId: "26207", bakcTokenId: "1155" },
                    { mainTokenId: "26208", bakcTokenId: "1156" },
                    { mainTokenId: "26209", bakcTokenId: "1157" }
                ]
            ]
        })
        expect(res[7]).toStrictEqual({
            nftAsset: "BAYC",
            users: ["C", "D", "E"],
            tokenIds: [],
            validStaked: [],
            isBakc: true,
            nftPairs: [
                [
                    { mainTokenId: "26210", bakcTokenId: "1158" },
                    { mainTokenId: "26211", bakcTokenId: "1159" }
                ],
                [{ mainTokenId: "15439", bakcTokenId: "2672" }],
                [{ mainTokenId: "18140", bakcTokenId: "7008" }]
            ]
        })

        expect(res[8]).toStrictEqual({
            nftAsset: "MAYC",
            users: ["A"],
            tokenIds: [],
            validStaked: [],
            isBakc: true,
            nftPairs: [
                [
                    { mainTokenId: "21368", bakcTokenId: "9990" },
                    { mainTokenId: "12180", bakcTokenId: "2545" },
                    { mainTokenId: "29730", bakcTokenId: "8933" },
                    { mainTokenId: "23652", bakcTokenId: "9137" },
                    { mainTokenId: "4265", bakcTokenId: "1370" },
                    { mainTokenId: "3411", bakcTokenId: "6677" },
                    { mainTokenId: "14167", bakcTokenId: "1543" },
                    { mainTokenId: "516", bakcTokenId: "2393" },
                    { mainTokenId: "24058", bakcTokenId: "6312" },
                    { mainTokenId: "14666", bakcTokenId: "7635" }
                ]
            ]
        })
        expect(res[9]).toStrictEqual({
            nftAsset: "MAYC",
            users: ["A", "B", "C", "D", "E"],
            tokenIds: [],
            validStaked: [],
            isBakc: true,
            nftPairs: [
                [
                    { mainTokenId: "3641", bakcTokenId: "9160" },
                    { mainTokenId: "6987", bakcTokenId: "7457" }
                ],
                [
                    { mainTokenId: "27458", bakcTokenId: "6772" },
                    { mainTokenId: "14964", bakcTokenId: "7373" },
                    { mainTokenId: "16580", bakcTokenId: "3401" },
                    { mainTokenId: "26873", bakcTokenId: "9212" }
                ],
                [{ mainTokenId: "26206", bakcTokenId: "1154" }],
                [{ mainTokenId: "15439", bakcTokenId: "2672" }],
                [{ mainTokenId: "18140", bakcTokenId: "7008" }]
            ]
        })
    })

    it("split compoundInfo with 20 tokenIds per batch", () => {
        const res = splitCompoundInfos(compoundInfo, 20)

        expect(res.length).toBe(6)
        expect(res[0]).toStrictEqual({
            nftAsset: "BAYC",
            users: ["A", "B", "C", "D", "E"],
            tokenIds: [
                ["0"],
                ["1", "2", "3"],
                ["4", "5", "6", "7", "8", "9"],
                ["10", "11"],
                ["12", "13", "14"]
            ],
            validStaked: [],
            isBakc: false,
            nftPairs: []
        })
        expect(res[1]).toStrictEqual({
            nftAsset: "BAYC",
            users: ["E"],
            tokenIds: [["15", "16", "17", "18", "19", "20", "21"]],
            validStaked: [],
            isBakc: false,
            nftPairs: []
        })
        expect(res[2]).toStrictEqual({
            nftAsset: "MAYC",
            users: ["A", "B", "C"],
            tokenIds: [
                ["0", "1", "2", "3"],
                ["4", "5", "6"],
                ["7", "8", "9", "10", "11"]
            ],
            validStaked: [],
            isBakc: false,
            nftPairs: []
        })
        expect(res[3]).toStrictEqual({
            nftAsset: "BAYC",
            users: ["A", "B", "C"],
            tokenIds: [],
            validStaked: [],
            isBakc: true,
            nftPairs: [
                [
                    { mainTokenId: "21368", bakcTokenId: "9990" },
                    { mainTokenId: "12180", bakcTokenId: "2545" },
                    { mainTokenId: "29730", bakcTokenId: "8933" },
                    { mainTokenId: "23652", bakcTokenId: "9137" },
                    { mainTokenId: "4265", bakcTokenId: "1370" },
                    { mainTokenId: "3411", bakcTokenId: "6677" },
                    { mainTokenId: "14167", bakcTokenId: "1543" },
                    { mainTokenId: "516", bakcTokenId: "2393" },
                    { mainTokenId: "24058", bakcTokenId: "6312" },
                    { mainTokenId: "14666", bakcTokenId: "7635" },
                    { mainTokenId: "3641", bakcTokenId: "9160" },
                    { mainTokenId: "6987", bakcTokenId: "7457" }
                ],
                [
                    { mainTokenId: "27458", bakcTokenId: "6772" },
                    { mainTokenId: "14964", bakcTokenId: "7373" },
                    { mainTokenId: "16580", bakcTokenId: "3401" },
                    { mainTokenId: "26873", bakcTokenId: "9212" }
                ],
                [
                    { mainTokenId: "26206", bakcTokenId: "1154" },
                    { mainTokenId: "26207", bakcTokenId: "1155" },
                    { mainTokenId: "26208", bakcTokenId: "1156" },
                    { mainTokenId: "26209", bakcTokenId: "1157" }
                ]
            ]
        })
        expect(res[4]).toStrictEqual({
            nftAsset: "BAYC",
            users: ["C", "D", "E"],
            tokenIds: [],
            validStaked: [],
            isBakc: true,
            nftPairs: [
                [
                    { mainTokenId: "26210", bakcTokenId: "1158" },
                    { mainTokenId: "26211", bakcTokenId: "1159" }
                ],
                [{ mainTokenId: "15439", bakcTokenId: "2672" }],
                [{ mainTokenId: "18140", bakcTokenId: "7008" }]
            ]
        })
        expect(res[5]).toStrictEqual({
            nftAsset: "MAYC",
            users: ["A", "B", "C", "D", "E"],
            tokenIds: [],
            validStaked: [],
            isBakc: true,
            nftPairs: [
                [
                    { mainTokenId: "21368", bakcTokenId: "9990" },
                    { mainTokenId: "12180", bakcTokenId: "2545" },
                    { mainTokenId: "29730", bakcTokenId: "8933" },
                    { mainTokenId: "23652", bakcTokenId: "9137" },
                    { mainTokenId: "4265", bakcTokenId: "1370" },
                    { mainTokenId: "3411", bakcTokenId: "6677" },
                    { mainTokenId: "14167", bakcTokenId: "1543" },
                    { mainTokenId: "516", bakcTokenId: "2393" },
                    { mainTokenId: "24058", bakcTokenId: "6312" },
                    { mainTokenId: "14666", bakcTokenId: "7635" },
                    { mainTokenId: "3641", bakcTokenId: "9160" },
                    { mainTokenId: "6987", bakcTokenId: "7457" }
                ],
                [
                    { mainTokenId: "27458", bakcTokenId: "6772" },
                    { mainTokenId: "14964", bakcTokenId: "7373" },
                    { mainTokenId: "16580", bakcTokenId: "3401" },
                    { mainTokenId: "26873", bakcTokenId: "9212" }
                ],
                [{ mainTokenId: "26206", bakcTokenId: "1154" }],
                [{ mainTokenId: "15439", bakcTokenId: "2672" }],
                [{ mainTokenId: "18140", bakcTokenId: "7008" }]
            ]
        })
    })

    it("split compoundInfo with higher/lower limit should work", () => {
        const res1 = splitCompoundInfos(compoundInfo, 1000)
        expect(res1.length).toBe(5)

        const res2 = splitCompoundInfos(compoundInfo, 3)
        console.log(res2)
        expect(res2.length).toBe(27)

        const res3 = splitCompoundInfos(compoundInfo, 1)
        expect(res3.length).toBe(77)
    })
})
