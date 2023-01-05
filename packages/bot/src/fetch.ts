import { mapErrMsg, sameAddress } from "@para-space/utils";
import { notEmpty } from "@para-space/utils";
import { logger } from "@para-space/utils";
import { BigNumber, ethers } from "ethers";
import { chunk } from "lodash";
import { Types, ParaspaceMM, Factories } from "paraspace-api";
import { APE_STAKING_POOL_ID } from "./constant";
import { runtime } from "./runtime";
import { strategy } from "./strategy";
import { StakedToken, ValidCompoundInfo, ValidTokens } from "./types";

const requestBatchNFTOwnerInfo = async (contract: string, tokenIds: string[]) => {
  if (!tokenIds || tokenIds.length === 0) return [];
  try {
    const nft = runtime.provider.connectMultiAbi(Factories.IERC721__factory, contract);
    const calls = tokenIds.map((tokenId) => nft.ownerOf(tokenId));
    return (
      await Promise.all(
        chunk(calls, 2000).map((batch) => runtime.provider.getMulticallProvider().all(batch))
      )
    ).flat();
  } catch (e) {
    const errMsg = `requestBatchNFTOwnerInfo error: ${mapErrMsg(e)}`;
    throw new Error(errMsg);
  }
};

const validateBAKCOwnerAndApproved = async (stakeBakc: StakedToken): Promise<boolean> => {
  const nBakc = runtime.provider.connectFactory(
    Factories.IERC721__factory,
    runtime.contracts.nBAKC
  );
  const bakc: Types.IERC721 = runtime.provider.connectFactory(
    Factories.IERC721__factory,
    runtime.contracts.BAKC
  );
  const bakcOwner = await bakc.ownerOf(stakeBakc.tokenId);
  const nBakcOwner = await nBakc.ownerOf(stakeBakc.tokenId);
  const isApproved = await bakc.isApprovedForAll(bakcOwner, runtime.contracts.pool);
  return (
    (sameAddress(stakeBakc.pair.mainTokenOwner, bakcOwner) ||
      sameAddress(stakeBakc.pair.mainTokenOwner, nBakcOwner)) &&
    isApproved
  );
};

const getValidStakedTokens = async (): Promise<ValidTokens> => {
  logger.debug("Try get valid staked tokens...");
  const apeCoinStaking: Types.ApeCoinStaking = await runtime.provider.connectContract(
    ParaspaceMM.ApeCoinStaking
  );

  const contracts = [runtime.contracts.nBAYC, runtime.contracts.nMAYC];
  const getStakeMethod = apeCoinStaking.getAllStakes;
  const limits = [
    strategy[runtime.networkName].BAYC_TOKEN_PENDING_REWARD_LIMIT,
    strategy[runtime.networkName].MAYC_TOKEN_PENDING_REWARD_LIMIT,
  ];
  const bakcLimits = strategy[runtime.networkName].BAKC_TOKEN_PENDING_REWARD_LIMIT;

  const validTokens = await Promise.all(
    contracts.map(async (contract, i) => {
      const stakes = await getStakeMethod(contract);
      const validStakes: StakedToken[] = stakes
        .filter((data) => {
          return data.poolId.toString() === APE_STAKING_POOL_ID.BAYC ||
            data.poolId.toString() === APE_STAKING_POOL_ID.MAYC
            ? data.unclaimed.gt(ethers.utils.parseEther(limits[i]))
            : false;
        })
        .map((data) => ({
          pendingReward: data.unclaimed,
          tokenId: data.tokenId.toString(),
          owner: "",
          poolId: data.poolId.toString(),
          pair: {
            mainTypePoolId: data.pair.mainTypePoolId.toString(),
            mainTokenId: data.pair.mainTokenId.toString(),
            mainTokenOwner: "",
          },
        }));

      const nftOwners = await requestBatchNFTOwnerInfo(
        contract,
        validStakes.map((data) => data.tokenId)
      );
      return validStakes.map((data, i) => ({ ...data, owner: nftOwners[i] }));
    })
  );

  const validBakcTokens = await Promise.all(
    contracts.map(async (contract) => {
      const stakes = await getStakeMethod(contract);
      const validStakes: StakedToken[] = stakes
        .filter((data) => {
          return data.poolId.toString() === APE_STAKING_POOL_ID.BAKC
            ? data.unclaimed.gt(ethers.utils.parseEther(bakcLimits))
            : false;
        })
        .map((data) => ({
          pendingReward: data.unclaimed,
          tokenId: data.tokenId.toString(),
          owner: "",
          poolId: data.poolId.toString(),
          pair: {
            mainTypePoolId: data.pair.mainTypePoolId.toString(),
            mainTokenId: data.pair.mainTokenId.toString(),
            mainTokenOwner: "",
          },
        }));
      const mainTokenOwners = await requestBatchNFTOwnerInfo(
        contract,
        validStakes.map((data) => data.pair.mainTokenId)
      );
      return await Promise.all(validStakes
        .map(async (data, i) => {
          const stakeBakc: StakedToken = {
            ...data,
            pair: {
              ...data.pair,
              mainTokenOwner: mainTokenOwners[i],
            },
          }
          if (await validateBAKCOwnerAndApproved(stakeBakc)) {
            return stakeBakc
          }
        }) as unknown as StakedToken[]);
    })
  );

  return {
    validBayc: validTokens[0],
    validMayc: validTokens[1],
    validBakcForBayc: validBakcTokens[0].filter(notEmpty),
    validBakcForMayc: validBakcTokens[1].filter(notEmpty),
  };
};

const filterByUserLimit = async (validTokens: ValidTokens): Promise<ValidCompoundInfo> => {
  const { ERC721 } = runtime.provider.getContracts();
  let ownerToTokenIds: Map<string, StakedToken[]>[] = [new Map(), new Map()];
  let ownerToBakcTokenIds: Map<string, StakedToken[]>[] = [new Map(), new Map()];
  const limits = [
    strategy[runtime.networkName].BAYC_USER_PENDING_REWARD_LIMIT,
    strategy[runtime.networkName].MAYC_USER_PENDING_REWARD_LIMIT,
  ];
  const bakcLimits = strategy[runtime.networkName].BAKC_USER_PENDING_REWARD_LIMIT;

  Array.from([validTokens.validBayc, validTokens.validMayc]).forEach((BaycOrMayc, index) => {
    BaycOrMayc.forEach((data: StakedToken) => {
      const owner = data.owner;
      if (ownerToTokenIds[index].has(owner)) {
        ownerToTokenIds[index].get(owner)?.push(data);
      } else {
        ownerToTokenIds[index].set(owner, [data]);
      }
    });
  });

  Array.from([validTokens.validBakcForBayc, validTokens.validBakcForMayc]).forEach(
    (BaycOrMayc, index) => {
      BaycOrMayc.forEach((data: StakedToken) => {
        const mainTokenOwner = data.pair.mainTokenOwner;
        if (ownerToBakcTokenIds[index].has(mainTokenOwner)) {
          ownerToBakcTokenIds[index].get(mainTokenOwner)?.push(data);
        } else {
          ownerToBakcTokenIds[index].set(mainTokenOwner, [data]);
        }
      });
    }
  );

  ownerToTokenIds.forEach((collection, i) => {
    collection.forEach((tokens, owner) => {
      const userTotalReward = tokens
        .map((data) => data.pendingReward)
        .reduce(
          (accumulator: BigNumber, currentValue: BigNumber) => accumulator.add(currentValue),
          BigNumber.from(0)
        );
      if (userTotalReward.lte(ethers.utils.parseEther(limits[i]))) collection.delete(owner);
    });
  });

  ownerToBakcTokenIds.forEach((collection) => {
    collection.forEach((tokens, owner) => {
      const userTotalReward = tokens
        .map((data) => data.pendingReward)
        .reduce(
          (accumulator: BigNumber, currentValue: BigNumber) => accumulator.add(currentValue),
          BigNumber.from(0)
        );
      if (userTotalReward.lte(ethers.utils.parseEther(bakcLimits))) collection.delete(owner);
    });
  });

  return {
    bayc: {
      nftAsset: ERC721.BAYC,
      users: Array.from(ownerToTokenIds[0].keys()),
      tokenIds: Array.from(ownerToTokenIds[0].keys()).map(
        (owner) => ownerToTokenIds[0].get(owner)?.map((data) => data.tokenId) || []
      ),
      validStaked: validTokens.validBayc,
      nftPairs: [],
      isBakc: false,
    },
    mayc: {
      nftAsset: ERC721.MAYC,
      users: Array.from(ownerToTokenIds[1].keys()),
      tokenIds: Array.from(ownerToTokenIds[1].keys()).map(
        (owner) => ownerToTokenIds[1].get(owner)?.map((data) => data.tokenId) || []
      ),
      validStaked: validTokens.validMayc,
      nftPairs: [],
      isBakc: false,
    },
    bakcForBayc: {
      nftAsset: ERC721.BAYC,
      users: Array.from(ownerToBakcTokenIds[0].keys()),
      nftPairs: Array.from(ownerToBakcTokenIds[0].keys()).map(
        (owner) =>
          ownerToBakcTokenIds[0].get(owner)?.map((data) => ({
            mainTokenId: data.pair.mainTokenId,
            bakcTokenId: data.tokenId,
          })) || []
      ),
      validStaked: validTokens.validBakcForBayc,
      tokenIds: [],
      isBakc: true,
    },
    bakcForMayc: {
      nftAsset: ERC721.MAYC,
      users: Array.from(ownerToBakcTokenIds[1].keys()),
      nftPairs: Array.from(ownerToBakcTokenIds[1].keys()).map(
        (owner) =>
          ownerToBakcTokenIds[1].get(owner)?.map((data) => ({
            mainTokenId: data.pair.mainTokenId,
            bakcTokenId: data.tokenId,
          })) || []
      ),
      validStaked: validTokens.validBakcForMayc,
      tokenIds: [],
      isBakc: true,
    },
  };
};

export const fetchCompoundInfo = async (): Promise<ValidCompoundInfo> => {
  const validStakedTokens = await getValidStakedTokens();
  return await filterByUserLimit(validStakedTokens);
};
