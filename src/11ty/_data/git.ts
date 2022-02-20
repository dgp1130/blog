import { Repository, Revparse } from 'nodegit';

/** Retrieves information from the current Git repo. */
async function git() {
    const repo = await Repository.open('.');

    // Get the current HEAD commit.
    const obj = await Revparse.single(repo, 'HEAD');
    const commit = obj.id().toString();

    // Get whether or not the repository is clean (no uncommited changes).
    const files = await repo.getStatus();
    const clean = files.length === 0;

    return { commit, clean };
}

// Must use this syntax rather than `export default` so 11ty can pick up the
// value. See: https://github.com/microsoft/TypeScript/issues/2719#issuecomment-310969161
export = git;
