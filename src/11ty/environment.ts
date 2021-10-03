/** The environment 11ty is building for. */
export enum Environment {
    DEV = 'dev',
    PROD = 'prod',
}

/** Returns the environment the build is running in. */
export function getEnv(): Environment {
    const env = process.env['DWAC_ENV'];
    switch (env) {
        case undefined:
        case 'dev':
            return Environment.DEV;
        case 'prod':
            return Environment.PROD;
        default:
            throw new Error(`Unknown environment in $DWAC_ENV: ${env}`);
    }
}
