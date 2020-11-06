import './share';
import { html } from 'lit-element';

export default {
    title: 'Example/Share', // TODO
    argTypes: {
        target: { control: 'text' },
        articleTitle: { control: 'text' },
        prompt: { control: 'text' },
    },
};

interface ShareArgs {
    target?: string;
    articleTitle?: string;
    prompt?: string,
}

const Template = (args: ShareArgs) => html`
    <dwac-share .target="${args.target ? new URL(args.target) : undefined}"
            .articleTitle="${args.articleTitle}"
            .prompt="${args.prompt}">
    </dwac-share>
`;

export const Primary = Template.bind({});
(Primary as any).args = {
    target: 'https://blog.dwac.dev/',
    articleTitle: 'Devel without a Cause',
    prompt: 'Check out my blog!',
};
