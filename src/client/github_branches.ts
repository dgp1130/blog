/** API service for interacting with GitHub branches. */

/** A Git branch as provided by the GitHub API. */
export interface Branch {
    name: string;
    commit: Commit;
    protected: boolean;
}

/** A Git commit as provided by the GitHub API. */
export interface Commit {
    sha: string;
    url: string;
}

/**
 * List the branches available on the given GitHub repo.
 *
 * @param user The owner of the repository.
 * @param repo The name of the repository.
 * @returns A list of branches in the repository.
 */
export async function listBranches(user: string, repo: string): Promise<Branch[]> {
    // Fetch list of active branches from the GitHub API.
    const res =
        await fetch(`https://api.github.com/repos/${user}/${repo}/branches`);
    return await res.json() as Branch[];
}
