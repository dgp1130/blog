import { getEnv } from '../environment';

// Must use this syntax rather than `export default` so 11ty can pick up the
// value. See: https://github.com/microsoft/TypeScript/issues/2719#issuecomment-310969161
export = getEnv;
