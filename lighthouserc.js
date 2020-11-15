module.exports = {
    ci: {
        collect: {
            // staticDistDir: '_site/',
            url: ['http://172.22.89.105:8080/'],
            startServerCommand: 'npm start',
            settings: {
                chromeFlags: '--no-sandbox --no-headless',
            },
        },
        assert: {
            preset: 'lighthouse:recommended',
        },
    },
};
