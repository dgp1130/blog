import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { AtpAgent } from '@atproto/api';
import * as Document from './gen/site/standard/document.js';

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
    for (const docName of documents) {
        const tid = docName.slice(0, -'.json'.length);
        const docText =
            await fs.readFile(path.join(DOCUMENT_ROOT, docName), 'utf8');
        const docJson = JSON.parse(docText);
        const document = Document.$build(docJson);

        const res = await agent.com.atproto.repo.putRecord({
            repo: agent.did as `did:${string}:${string}`,
            collection: 'site.standard.document',
            rkey: tid,
            record: document,
        });
        if (!res.success) throw new Error('Publish failed', {cause: res.data});
    }

    console.log(`Published ${documents.length} records successfully!`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
