import { Object as GitObject, Oid, Repository, Revparse, StatusFile } from 'nodegit';

import git from './git';

describe('git', () => {
    describe('default function', () => {
        it('outputs Git commit data', async () => {
            const repo = {
                getStatus: () => [] as StatusFile[],
            } as unknown as Repository;
            const obj = {
                id: () => ({
                    toString: () => 'abcdef',
                }) as Oid,
            } as unknown as GitObject;

            spyOn(Repository, 'open').and.returnValue(Promise.resolve(repo));
            spyOn(Revparse, 'single').and.returnValue(Promise.resolve(obj));

            const { commit } = await git();

            expect(Repository.open).toHaveBeenCalledWith('.');
            expect(Revparse.single).toHaveBeenCalledWith(repo, 'HEAD');

            expect(commit).toBe('abcdef');
        });

        it('outputs clean when the repository has no uncommitted changes', async () => {
            const repo = {
                // `git status` returns no uncommitted changes.
                getStatus: () => [] as StatusFile[],
            } as unknown as Repository;
            const obj = {
                id: () => ({
                    toString: () => 'abcdef',
                }) as Oid,
            } as unknown as GitObject;

            spyOn(Repository, 'open').and.returnValue(Promise.resolve(repo));
            spyOn(Revparse, 'single').and.returnValue(Promise.resolve(obj));

            const { clean } = await git();

            expect(Repository.open).toHaveBeenCalledWith('.');

            expect(clean).toBe(true);
        });

        it('outputs unclean when the repository has uncommitted changes', async () => {
            const repo = {
                getStatus: () => [
                    { }, // First file.
                    { }, // Second file.
                ] as StatusFile[],
            } as unknown as Repository;
            const obj = {
                id: () => ({
                    toString: () => 'abcdef',
                }) as Oid,
            } as unknown as GitObject;

            spyOn(Repository, 'open').and.returnValue(Promise.resolve(repo));
            spyOn(Revparse, 'single').and.returnValue(Promise.resolve(obj));

            const { clean } = await git();

            expect(Repository.open).toHaveBeenCalledWith('.');

            expect(clean).toBe(false);
        });

        it('fails when unable to read the repository', async () => {
            const err = new Error('Could not "git"-er-done.');
            spyOn(Repository, 'open').and.returnValue(Promise.reject(err));

            await expectAsync(git()).toBeRejectedWith(err);
        });

        it('fails when unable to parse the revision', async () => {
            const err = new Error('Could not "git"-er-done.');
            spyOn(Repository, 'open').and.returnValue(Promise.resolve({
                getStatus: () => ([] as StatusFile[]),
            } as unknown as Repository));
            spyOn(Revparse, 'single').and.returnValue(Promise.reject(err));

            await expectAsync(git()).toBeRejectedWith(err);
        });

        it('fails when unable to read the repository status', async () => {
            const err = new Error('Could not "git"-er-done.');
            spyOn(Repository, 'open').and.returnValue(Promise.resolve({
                getStatus: () => {
                    throw err;
                },
            } as unknown as Repository));
            spyOn(Revparse, 'single').and.returnValue(Promise.reject(err));

            await expectAsync(git()).toBeRejectedWith(err);
        });
    });
});