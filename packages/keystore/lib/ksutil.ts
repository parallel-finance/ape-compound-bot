// Remove '0x' prefix
export function Remove0xPrefix(s: string): string {
    if (!s) {
        return ""
    }

    const index = s.indexOf("0x")
    if (index < 0) {
        return s
    }

    return s.substring(index + 2)
}

// Combination key
export function CombinationKey(keys: string[]): string {
    return keys.toString()
}
