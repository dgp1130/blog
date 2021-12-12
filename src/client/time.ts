/** Returns a `Promise` which waits for the given duration before resolving. */
export function timeout(durationMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => resolve(), durationMs);
    });
}
