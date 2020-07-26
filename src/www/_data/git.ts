import { execFile as execFileImport } from 'child_process';
import { promisify } from 'util';

const execFile = promisify(execFileImport);

/**
 * Retrieves information from the Git repo.
 * 
 * Implementation note: `execFile` is injected to allow tests to easily mock it.
 */
async function git(exec: typeof execFile = execFile) {
    const { stdout: rev } = await exec('git', [ 'rev-parse', 'HEAD' ]);

    return {
        commit: rev.trim(),
    };
}

// Must use this syntax rather than `export default` so 11ty can pick up the
// value. See: https://github.com/microsoft/TypeScript/issues/2719#issuecomment-310969161
export = git;
