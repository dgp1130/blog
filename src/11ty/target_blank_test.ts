import mdLib from 'markdown-it';

import { addMdTargetBlankPlugin } from './target_blank';

describe('target_blank', () => {
    describe('addMdTargetBlankPlugin', () => {
        it('renders links to open in a new tab', () => {
            const md = mdLib();
            addMdTargetBlankPlugin(md);
    
            const rendered = md.render('[foo](/bar)');
            expect(rendered)
                .toContain('<a href="/bar" target="_blank">foo</a>');
        });
    });
});
