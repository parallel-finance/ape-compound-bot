import { NetworkConfiguration, Recordable } from "@para-space/utils";

export const strategy: NetworkConfiguration<Recordable<string>> = {
    mainnet: {
        BAYC_USER_PENDING_REWARD_LIMIT: "60",
        BAYC_TOKEN_PENDING_REWARD_LIMIT: "55",
        MAYC_USER_PENDING_REWARD_LIMIT: "18",
        MAYC_TOKEN_PENDING_REWARD_LIMIT: "15",
    },
    goerli: {
        BAYC_USER_PENDING_REWARD_LIMIT: "10",
        BAYC_TOKEN_PENDING_REWARD_LIMIT: "5",
        MAYC_USER_PENDING_REWARD_LIMIT: "10",
        MAYC_TOKEN_PENDING_REWARD_LIMIT: "5",
    },
    fork_mainnet: {
        BAYC_USER_PENDING_REWARD_LIMIT: "1",
        BAYC_TOKEN_PENDING_REWARD_LIMIT: "0.5",
        MAYC_USER_PENDING_REWARD_LIMIT: "1",
        MAYC_TOKEN_PENDING_REWARD_LIMIT: "0.5",
    },
};
