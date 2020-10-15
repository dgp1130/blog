// @ts-check

const CleanCss = require('clean-css');

/** @type {!CleanCss.Options} */
module.exports.cleanCssConfig = {
    level: 2,
};

/** @type {!CleanCss.Options} */
module.exports.cleanCssConfigDev = {
    level: 0,
};
