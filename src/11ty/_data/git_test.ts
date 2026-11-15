import { ChildProcess, execFile as execFileCb, PromiseWithChild } from 'child_process';
import { promisify } from 'util';
import { describe, expect, it, vi } from 'vitest';
import git from './git.js';

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
            const execFileSpy = vi.fn(execFile)
                .mockReturnValueOnce(/* getHeadSha */ mockExecResult({
                    exitCode: 0,
                    stdout: 'abc123',
                })).mockReturnValueOnce(/* isClean */ mockExecResult({
                    exitCode: 0,
                    stdout: '',
                })) as unknown as typeof execFile;

            const { sha } = await git({ execFile: execFileSpy });

            expect(sha).toBe('abc123');
        });

        it('outputs clean when the repository has no uncommitted changes', async () => {
            const execFileSpy = vi.fn(execFile)
                .mockReturnValueOnce(/* getHeadSha */ mockExecResult({
                    exitCode: 0,
                    stdout: 'abc123',
                })).mockReturnValueOnce(/* isClean */ mockExecResult({
                    exitCode: 0,
                    stdout: '',
                })) as unknown as typeof execFile;

            const { clean } = await git({ execFile: execFileSpy });

            expect(clean).toBe(true);
        });

        it('outputs unclean when the repository has uncommitted changes', async () => {
            const execFileSpy = vi.fn(execFile)
                .mockReturnValueOnce(/* getHeadSha */ mockExecResult({
                    exitCode: 0,
                    stdout: 'abc123',
                })).mockReturnValueOnce(/* isClean */ mockExecResult({
                    exitCode: 0,
                    stdout: `
 M src/foo.ts
 A src/bar.ts
                        `.trim(),
                })) as unknown as typeof execFile;

            const { clean } = await git({ execFile: execFileSpy });

            expect(clean).toBe(false);
        });

        it('fails when unable to read the repository for the SHA', async () => {
            const error = new Error('Could not "git"-er-done!');
            const execFileSpy = vi.fn(execFile)
                .mockRejectedValueOnce(/* getHeadSha */ error)
                .mockReturnValueOnce(/* isClean */ mockExecResult({
                    exitCode: 0,
                    stdout: '',
                })) as unknown as typeof execFile;

            await expect(git({ execFile: execFileSpy }))
                .rejects.toBe(error);
        });

        it('fails when unable to read the repository status', async () => {
            const error = new Error('Could not "git"-er-done!');
            const execFileSpy = vi.fn(execFile)
                .mockReturnValueOnce(/* getHeadSha */ mockExecResult({
                    exitCode: 0,
                    stdout: 'abc123',
                }))
                .mockRejectedValueOnce(/* isClean */ error);

            await expect(git({
                execFile: execFileSpy as unknown as typeof execFile,
            })).rejects.toBe(error);
        });

        it('fails when reading the repository SHA exits with a non-zero status code', async () => {
            const execFileSpy = vi.fn(execFile)
                .mockReturnValueOnce(/* getHeadSha */ mockExecResult({
                    exitCode: 1,
                    stderr: 'Could not "git"-er-done!',
                })).mockReturnValueOnce(/* isClean */ mockExecResult({
                    exitCode: 0,
                    stdout: '',
                })) as unknown as typeof execFile;

            await expect(git({ execFile: execFileSpy }))
                .rejects.toThrow(/Could not "git"-er-done!/);
        });

        it('fails when reading repository status exits with a non-zero status code', async () => {
            const error = new Error('Could not "git"-er-done!');
            const execFileSpy = vi.fn(execFile)
                .mockReturnValueOnce(/* getHeadSha */ mockExecResult({
                    exitCode: 0,
                    stdout: 'abc123',
                })).mockRejectedValueOnce(/* isClean */ error);

            await expect(git({
                execFile: execFileSpy as unknown as typeof execFile,
            })).rejects.toThrow(/Could not "git"-er-done!/);
        });
    });
});
