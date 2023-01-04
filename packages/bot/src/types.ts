import { BigNumber } from "ethers";

export type StakedToken = {
    pendingReward: BigNumber;
    tokenId: string;
    owner: string;
    poolId: string;
    pair: {
        mainTypePoolId: string;
        mainTokenId: string;
        mainTokenOwner: string
    }
};

export type ValidTokens = {
    validBayc: StakedToken[];
    validMayc: StakedToken[];
    validBakcForBayc: StakedToken[];
    validBakcForMayc: StakedToken[];
};

export type CompoundInfo = {
    nftAsset: string;
    users: string[];
    tokenIds: string[][];
    validStaked: StakedToken[];
    nftPairs: PairNft[][];
    isBakc: boolean;
};

export type PairNft = {
    mainTokenId: string;
    bakcTokenId: string;
}

export type ValidCompoundInfo = {
    bayc: CompoundInfo;
    mayc: CompoundInfo;
    bakcForBayc: CompoundInfo;
    bakcForMayc: CompoundInfo;
};