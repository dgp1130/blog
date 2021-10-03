import mdLib from 'markdown-it';

import { addMdAnchorPlugin } from './anchor';

describe('anchor', () => {
    describe('addMdAnchorPlugin', () => {
        it('renders the anchor ID', () => {
            const md = mdLib();
            addMdAnchorPlugin(md);
    
            const rendered = md.render('## Some header title');
            expect(rendered).toContain(`id="some-header-title"`);
        });
    });
});
