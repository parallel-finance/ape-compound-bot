import { SimpleMatchOrder } from "../src/types"
import { splitOrders } from "../src/p2p/compound"
import { BigNumber } from "ethers"

describe("split tokenIds should work correctly", () => {
    const basicOrder = {
        orderHash: "0x1",
        stakingType: 0,
        apeToken: "0xF40299b626ef6E197F5d9DE9315076CAB788B6Ef",
        apeTokenId: 0,
        bakcTokenId: 0,
        pendingReward: BigNumber.from(0)
    }
    const orders: SimpleMatchOrder[] = [
        basicOrder,
        basicOrder,
        basicOrder,
        basicOrder,
        basicOrder,
        basicOrder,
        basicOrder,
        basicOrder,
        basicOrder,
        basicOrder
    ]

    it("split orders with 10 hash per batch", () => {
        const res = splitOrders(orders, 10)

        expect(res.length).toBe(1)
        expect(res[0]).toStrictEqual(orders)
    })

    it("split orders with higher/lower limit should work", () => {
        const res1 = splitOrders(orders, 1)
        expect(res1.length).toBe(10)

        const res2 = splitOrders(orders, 3)
        console.log(res2)
        expect(res2.length).toBe(4)

        const res3 = splitOrders(orders, 1000)
        expect(res3.length).toBe(1)
    })
})
