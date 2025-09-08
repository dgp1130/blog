import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBranches } from './github_branches';
import { mockBranch } from './github_branches_mock';
import { main } from './preview';

vi.mock('./github_branches', async () => ({
    listBranches: vi.fn(),
}));

describe('preview', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    let previewList: HTMLUListElement;

    beforeEach(() => {
        previewList = document.createElement('ul');
        previewList.id = 'preview-list';

        document.body.appendChild(previewList);
    });

    afterEach(() => {
        previewList.remove();
    });

    describe('main', () => {
        describe('draft blog posts', () => {
            it('render on success', async () => {
                vi.mocked(listBranches).mockResolvedValueOnce([
                    mockBranch({name: 'foo'}),
                    mockBranch({name: 'posts/bar'}),
                    mockBranch({name: 'posts/baz'}),
                ]);

                await main();
                expect(listBranches)
                        .toHaveBeenCalledExactlyOnceWith('dgp1130', 'blog');

                const listItems = Array.from(previewList.children);
                expect(listItems.map((item) => item.tagName.toLowerCase()))
                        .toEqual([ 'li', 'li' ]);
                expect(listItems.map((item) => item.textContent)).toEqual([
                    'bar',
                    'baz',
                ]);

                const links = Array.from(previewList.querySelectorAll('a'));
                expect(links.map((a) => a.href)).toEqual([
                    'https://post-bar--dwac-blog.netlify.app/posts/bar/',
                    'https://post-baz--dwac-blog.netlify.app/posts/baz/',
                ]);
            });

            it('render error on branch fetch failure', async () => {
                const err = new Error('Too many leaves on the branches.');
                vi.mocked(listBranches).mockImplementationOnce(() => {
                    throw err;
                });

                await main();

                const listItems = Array.from(previewList.children);
                expect(listItems.map((item) => item.textContent)).toEqual([
                    'Error: Too many leaves on the branches.',
                ]);
            });

            it('render empty message when no posts are received', async () => {
                vi.mocked(listBranches).mockResolvedValueOnce([
                    mockBranch({ name: 'not-a-post' }),
                ]);

                await main();

                const listItems = Array.from(previewList.children);
                expect(listItems.map((item) => item.textContent)).toEqual([
                    'No draft posts to preview.',
                ]);
            });
        });
    });
});
