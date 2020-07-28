import { Repository, Revparse } from 'nodegit';

/** Retrieves information from the current Git repo. */
async function git() {
    const repo = await Repository.open('.');
    const obj = await Revparse.single(repo, 'HEAD');

    return {
        commit: obj.id().toString(),
    };
}

// Must use this syntax rather than `export default` so 11ty can pick up the
// value. See: https://github.com/microsoft/TypeScript/issues/2719#issuecomment-310969161
export = git;
