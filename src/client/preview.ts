/** Implementation of the `/preview/` page. */

import { Branch, listBranches } from './github_branches';

const user = 'dgp1130';
const repo = 'blog';

/** Bootstrap the `/preview/` page. */
export async function main(): Promise<void> {
    await renderDraftPosts();
}

/** Renders any draft posts of the blog. */
async function renderDraftPosts(): Promise<void> {
    const list = document.querySelector('ul#preview-list')!;

    // Fetch all Git branches on the repo.
    let branches: Branch[];
    try {
        branches = await listBranches(user, repo);
    } catch (err) {
        list.appendChild(render('li', {}, [
            `Error: ${(err as Error).message ?? String(err)}`,
        ]));
        return;
    }

    // Get all branches starting with `posts/`.
    const posts = branches
            .filter((branch) => branch.name.startsWith('posts/'))
            .map((branch) => branch.name.slice('posts/'.length));

    if (posts.length === 0) {
        // Render the empty posts message.
        list.appendChild(render('li', {}, [
            'No draft posts to preview.',
        ]));
    } else {
        // Render a link to each preview.
        for (const name of posts) {
            list.appendChild(render('li', {}, [
                render('a', {
                    href: `https://post-${name}--dwac-blog.netlify.app/posts/${name}/`,
                }, [
                    render('code', {}, [name]),
                ]),
            ]));
        }
    }
}

/**
 * Mini-Hyperscript framework for rendering DOM nodes a little more
 * ergonomically.
 *
 * @param tag The tag name to render.
 * @param attrs HTML attributes to set on the element.
 * @param children Child nodes to append to the element or strings to apply as
 *     text nodes.
 * @returns The rendered element.
 */
function render<Tag extends keyof HTMLElementTagNameMap>(
    tag: Tag,
    attrs: Record<string, string>,
    children: Array<string | Node>,
): HTMLElementTagNameMap[Tag] {
    const el = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
        el.setAttribute(name, value);
    }
    el.append(...children);
    return el;
}
