import { NetworkConfiguration, Recordable } from "@para-space/utils";

export const strategy: NetworkConfiguration<Recordable<string>> = {
    mainnet: {
        BAYC_USER_PENDING_REWARD_LIMIT: "200",
        BAYC_TOKEN_PENDING_REWARD_LIMIT: "120",
        MAYC_USER_PENDING_REWARD_LIMIT: "75",
        MAYC_TOKEN_PENDING_REWARD_LIMIT: "25",
    },
    goerli: {
        BAYC_USER_PENDING_REWARD_LIMIT: "100",
        BAYC_TOKEN_PENDING_REWARD_LIMIT: "50",
        MAYC_USER_PENDING_REWARD_LIMIT: "100",
        MAYC_TOKEN_PENDING_REWARD_LIMIT: "50",
    },
    fork_mainnet: {
        BAYC_USER_PENDING_REWARD_LIMIT: "10",
        BAYC_TOKEN_PENDING_REWARD_LIMIT: "5",
        MAYC_USER_PENDING_REWARD_LIMIT: "10",
        MAYC_TOKEN_PENDING_REWARD_LIMIT: "5",
    },
};
