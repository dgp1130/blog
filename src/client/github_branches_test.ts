import { afterEach, describe, expect, it, vi } from 'vitest';
import { Branch, listBranches } from './github_branches';
import { mockBranch } from './github_branches_mock';

describe('github_branches', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('listBranches', () => {
        it('lists all the branches from the GitHub API', async () => {
            const foo = mockBranch({ name: 'foo' });
            const bar = mockBranch({ name: 'bar' });

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
                new Response(JSON.stringify([ foo, bar ] satisfies Branch[])),
            );

            const branches = await listBranches('user', 'repo');
            expect(fetch).toHaveBeenCalledExactlyOnceWith(
                    'https://api.github.com/repos/user/repo/branches');

            expect(branches).toEqual([ foo, bar ]);
        });
    });

    it('throws on `fetch` error', async () => {
        const err = new Error('Cat cut the ethernet cable.');

        vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
            throw err;
        });

        await expect(listBranches('user', 'repo')).rejects.toBe(err);
    });

    it('throws on bad JSON', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
                new Response('not valid JSON'),
            );

            await expect(listBranches('user', 'repo'))
                    .rejects.toBeInstanceOf(Error);
    });
});
