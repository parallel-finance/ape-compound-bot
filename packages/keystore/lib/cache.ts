type UnsafeCache = Map<any, any>;

export const ksCache: UnsafeCache = new Map();

export enum CacheType {
	Wallet = "Wallet",
	PK = "PK",
	PKWithoutPrefix = "PKWithoutPrefix"
}
