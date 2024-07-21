import '../../client/components/share';

import { trackAll } from '../../client/analytics';

// Start analytics on the page. Run them for the lifetime of the page, so we
// drop the "stop tracking" return value of this function.
trackAll();
