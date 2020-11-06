module.exports = {
  stories: ['../src/client/components/*.stories.{js,md,mdx}'],
  addons: [	
    'storybook-prebuilt/addon-knobs/register.js',	
  ],
  esDevServer: {
    // custom es-dev-server options
    nodeResolve: true,
    watch: true,
    open: true
  },
};
