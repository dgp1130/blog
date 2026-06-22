import * as fs from 'node:fs/promises';
import { AtpAgent } from '@atproto/api';

const DOCUMENT_ROOT = '../../dist/standard-site-documents';
const ATPROTO_PROVIDER = 'https://bsky.social';
const ATPROTO_HANDLE = 'develwithoutacause.dwac.dev';
const ATPROTO_PASSWORD = process.env['ATPROTO_PASSWORD'];

async function main(): Promise<void> {
    // Secret must be provided via environment variable.
    if (!ATPROTO_PASSWORD) {
        throw new Error('ATPROTO_PASSWORD environment variable is required.');
    }

    // Log in as the target user.
    const agent = new AtpAgent({ service: ATPROTO_PROVIDER });
    const res = await agent.login({
        identifier: ATPROTO_HANDLE,
        password: ATPROTO_PASSWORD,
    })
    if (!res.success) throw new Error('Login failed', {cause: res.data});

    // Read and publish all documents.
    const documents = await fs.readdir(DOCUMENT_ROOT);
    for (const document of documents) {
        const tid = document.slice(0, -'.json'.length);
        const rkey = tid;
        console.log(rkey);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
