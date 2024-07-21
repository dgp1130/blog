import { ChildProcess, execFile as execFileCb, PromiseWithChild } from 'child_process';
import { promisify } from 'util';
import git from './git';

const execFile = promisify(execFileCb);

function mockExecResult({ exitCode, stdout = '', stderr = '' }: {
    exitCode: number,
    stdout?: string,
    stderr?: string,
}): PromiseWithChild<{ stdout: string, stderr: string }> {
    const promise = new Promise((resolve) => {
        resolve({ stdout, stderr });
    }) as PromiseWithChild<{ stdout: string, stderr: string }>;
    promise.child = {
        exitCode,
    } as ChildProcess;
    return promise;
}

describe('git', () => {
    describe('default function', () => {
        it('outputs Git HEAD commit SHA', async () => {
            const execFileSpy = jasmine.createSpy<typeof execFile>('execFile')
                .and.returnValues(
                    /* getHeadSha */ mockExecResult({
                        exitCode: 0,
                        stdout: 'abc123',
                    }),
                    /* isClean */ mockExecResult({
                        exitCode: 0,
                        stdout: '',
                    }),
                ) as unknown as typeof execFile;

            const { sha } = await git({ execFile: execFileSpy });

            expect(sha).toBe('abc123');
        });

        it('outputs clean when the repository has no uncommitted changes', async () => {
            const execFileSpy = jasmine.createSpy<typeof execFile>('execFile')
                .and.returnValues(
                    /* getHeadSha */ mockExecResult({
                        exitCode: 0,
                        stdout: 'abc123',
                    }),
                    /* isClean */ mockExecResult({
                        exitCode: 0,
                        stdout: '',
                    }),
                ) as unknown as typeof execFile;

            const { clean } = await git({ execFile: execFileSpy });

            expect(clean).toBeTrue();
        });

        it('outputs unclean when the repository has uncommitted changes', async () => {
            const execFileSpy = jasmine.createSpy<typeof execFile>('execFile')
                .and.returnValues(
                    /* getHeadSha */ mockExecResult({
                        exitCode: 0,
                        stdout: 'abc123',
                    }),
                    /* isClean */ mockExecResult({
                        exitCode: 0,
                        stdout: `
 M src/foo.ts
 A src/bar.ts
                        `.trim(),
                    }),
                ) as unknown as typeof execFile;

            const { clean } = await git({ execFile: execFileSpy });

            expect(clean).toBeFalse();
        });

        it('fails when unable to read the repository for the SHA', async () => {
            const error = new Error('Could not "git"-er-done!');
            const execFileSpy = jasmine.createSpy<typeof execFile>('execFile')
                .and.returnValues(
                    /* getHeadSha */ Promise.reject(error) as
                        PromiseWithChild<{ stdout: string, stderr: string }>,
                    /* isClean */ mockExecResult({
                        exitCode: 0,
                        stdout: '',
                    }),
                ) as unknown as typeof execFile;

            await expectAsync(git({ execFile: execFileSpy }))
                .toBeRejectedWith(error);
        });

        it('fails when unable to read the repository status', async () => {
            const error = new Error('Could not "git"-er-done!');
            const execFileSpy = jasmine.createSpy<typeof execFile>('execFile')
                .and.returnValues(
                    /* getHeadSha */ mockExecResult({
                        exitCode: 0,
                        stdout: 'abc123',
                    }),
                    /* isClean */ Promise.reject(error) as
                        PromiseWithChild<{ stdout: string, stderr: string }>,
                ) as unknown as typeof execFile;

            await expectAsync(git({ execFile: execFileSpy }))
                .toBeRejectedWith(error);
        });

        it('fails when reading the repository SHA exits with a non-zero status code', async () => {
            const execFileSpy = jasmine.createSpy<typeof execFile>('execFile')
                .and.returnValues(
                    /* getHeadSha */ mockExecResult({
                        exitCode: 1,
                        stderr: 'Could not "git"-er-done!',
                    }),
                    /* isClean */ mockExecResult({
                        exitCode: 0,
                        stdout: '',
                    }),
                ) as unknown as typeof execFile;

            await expectAsync(git({ execFile: execFileSpy }))
                .toBeRejectedWithError(/Could not "git"-er-done!/);
        });

        it('fails when reading repository status exits with a non-zero status code', async () => {
            const execFileSpy = jasmine.createSpy<typeof execFile>('execFile')
                .and.returnValues(
                    /* getHeadSha */ mockExecResult({
                        exitCode: 0,
                        stdout: 'abc123',
                    }),
                    /* isClean */ mockExecResult({
                        exitCode: 1,
                        stderr: 'Could not "git"-er-done!',
                    }),
                ) as unknown as typeof execFile;

            await expectAsync(git({ execFile: execFileSpy }))
                .toBeRejectedWithError(/Could not "git"-er-done!/);
        });
    });
});
