/** Returns the short form of a Git hash. */
export function short(hash: string): string {
    return hash.substr(0, 7);
}