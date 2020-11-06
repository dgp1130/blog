import './share';
import { html } from 'lit-html';

export default {
    title: 'Example/Share', // TODO
    argTypes: {
        target: { control: 'text' },
        articleTitle: { control: 'text' },
        prompt: { control: 'text' },
    },
    component: 'dwac-share',
};

interface ShareArgs {
    target?: string;
    articleTitle?: string;
    prompt?: string,
}

export const primary = ({
    target = 'https://blog.dwac.dev/',
    articleTitle = 'Devel without a Cause',
    prompt = 'Check out my blog!',
}: ShareArgs = {}) => {
    
    return html`
        <dwac-share .target="${target ? new URL(target) : undefined}"
                article-title="${articleTitle}"
                prompt="${prompt}">
        </dwac-share>        
    `
};

// export const Primary = Template.bind({});
// (Primary as any).args = {
//     target: 'https://blog.dwac.dev/',
//     articleTitle: 'Devel without a Cause',
//     prompt: 'Check out my blog!',
// };
