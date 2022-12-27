import { BigNumber } from "ethers";

export type StakedToken = {
    pendingReward: BigNumber;
    tokenId: string;
};

export type ValidTokens = {
    validBayc: StakedToken[];
    validMayc: StakedToken[];
};

export type CompoundInfo = {
    nftAsset: string;
    users: string[];
    tokenIds: string[][];
    rawData: Map<string, StakedToken[]>;
};

export type ValidCompoundInfo = {
    bayc: CompoundInfo;
    mayc: CompoundInfo;
};