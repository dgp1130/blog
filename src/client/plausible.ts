/**
 * @fileoverview Instantiate Plausible as a singleton and re-export its symbols.
 * This allows for easier mocking and testing.
 */

import plausibleLib from 'plausible-tracker';

const plausible = plausibleLib();

export const { trackEvent } = plausible;
