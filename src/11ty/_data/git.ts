import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFileCb);

/** Represents metadata and status information about a Git repo. */
interface RepoStatus {
    /** The SHA value of the current `HEAD` commit. */
    sha: string;

    /**
     * Whether or not the repository is "clean" based on whether any currently
     * modified files have not been committed.
     */
    clean: boolean;
}

/**
 * Gets the SHA value of the current `HEAD` commit.
 *
 * @param execFile Used to inject `execFile` dependency for testing purposes
 *     only.
 * @returns The full SHA value of the `HEAD` commit.
 */
async function getHeadSha({ execFile = execFilePromise }: {
    execFile?: typeof execFilePromise,
} = {}): Promise<string> {
    const process = execFile('git', [ 'rev-list', '-n', '1', 'HEAD' ]);
    const { stdout, stderr } = await process;
    const exitCode = process.child.exitCode;
    if (exitCode !== 0) {
        throw new Error(`Failed to resolve \`HEAD\` SHA:\n${stderr}`);
    }

    return stdout.trim();
}

/**
 * Returns whether or not the repository is "clean" based on whether any
 * currently modified files have not been committed.
 *
 * @param execFile Used to inject `execFile` dependency for testing purposes
 *     only.
 * @returns Whether or not the repository is "clean".
 */
async function isClean({ execFile = execFilePromise }: {
    execFile?: typeof execFilePromise,
} = {}): Promise<boolean> {
    const process = execFile('git', [ 'status', '-s' ]);
    const { stdout, stderr } = await process;
    const exitCode = process.child.exitCode;
    if (exitCode !== 0) {
        throw new Error(`Failed to check Git status:\n${stderr}`);
    }

    return stdout.trim() === '';
}

/**
 * Retrieves information from the current Git repo.
 *
 * @param execFile Used to inject `execFile` dependency for testing purposes
 *     only.
 * @returns The {@link RepoStatus} of the current Git repo.
 */
async function git({ execFile = execFilePromise }: {
    execFile?: typeof execFilePromise,
} = {}): Promise<RepoStatus> {
    const [ sha, clean ] = await Promise.all([
        getHeadSha({ execFile }),
        isClean({ execFile }),
    ]);

    return { sha, clean };
}

// Must use this syntax rather than `export default` so 11ty can pick up the
// value. See: https://github.com/microsoft/TypeScript/issues/2719#issuecomment-310969161
export = git;
