/** Mocks for GitHub branches types. */

import { Branch, Commit } from './github_branches';

/** Mocks a {@link Branch} object. */
export function mockBranch(overrides: Partial<Branch> = {}): Branch {
    return {
        name: 'my-branch',
        commit: mockCommit(),
        protected: false,
        ...overrides,
    };
}

/** Mocks a {@link Commit} object. */
export function mockCommit(overrides: Partial<Commit> = {}): Commit {
    const sha = overrides.sha ?? '71ba49c4045532b20f7744c2523ea60434e11321';
    return {
        sha,
        url: `https://api.github.com/repos/my-user/my-repo/commits/${sha}`,
        ...overrides,
    };
}
