import { Object as GitObject, Oid, Repository, Revparse } from 'nodegit';

import git from './git';

describe('git', () => {
    describe('default function', () => {
        it('outputs Git metadata', async () => {
            const repo = {} as Repository;
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

        it('fails when unable to read the repository', async () => {
            const err = new Error('Could not "git"-er-done.');
            spyOn(Repository, 'open').and.returnValue(Promise.reject(err));

            await expectAsync(git()).toBeRejectedWith(err);
        });

        it('fails when unable to parse the revision', async () => {
            const err = new Error('Could not "git"-er-done.');
            spyOn(Repository, 'open').and.returnValue(
                    Promise.resolve({} as Repository));
            spyOn(Revparse, 'single').and.returnValue(Promise.reject(err));

            await expectAsync(git()).toBeRejectedWith(err);
        });
    });
});