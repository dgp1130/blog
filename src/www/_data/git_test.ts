import git from './git';

describe('git', () => {
    describe('default function', () => {
        it('outputs Git metadata', async () => {
            const execFile = jasmine.createSpy('execFile').and.returnValue(
                Promise.resolve({
                    stdout: 'abcdef',
                    stderr: 'Other junk...',
                }),
            );

            const { commit } = await git(execFile);

            expect(execFile).toHaveBeenCalledTimes(1);
            expect(execFile).toHaveBeenCalledWith(
                    'git', [ 'rev-parse', 'HEAD' ]);

            expect(commit).toBe('abcdef');
        });
    });
});