# Analytics

Analytics are hosted on [Plausible](https://plausible.io/).

## Custom Events

Custom events can have very nuanced semantics about what exactly they mean. This
section attempts to capture and document these nuances to better understand what
the metics represent.

### `scroll-depth`

The `scroll-depth` event is sent when a user scrolls on a page. It is intended
to capture how much of a document is actually read by a user. For example, did a
user actually read the whole blog post, or did they just read the introduction,
get bored and move on?

This contains two values:

* `path` - The path of the page the user is currently navigated to.
* `depth` - The maximum percentage (as a string of the format "dd%") the user
  has scrolled on the page.

This event is debounced for frequent, repeated scroll events and users can
easily make quick, large scrolls. As a result, this percentage should be
interpreted as "the user scrolled *at least* X% down the page". They could have
briefly scrolled more, and they may not have necessarily read everything up to
X%.

The depth is computed based on the *bottom* of the user's viewport compared to
the total document height. The depth is also floored to the next lowest 10%
bucket. This avoids getting too specific and gives natural aggregation in
Plausible. A user who scrolls 35% down the page, is actually attributed as
scrolling 30% down the page.

Edge cases:
*   Scroll events before analytics have loaded are dropped.
*   Users can scroll up and down the page quickly scanning for something in
    particular. Quickly scrolling down the page and then back up will send the
    maximum scroll height detected, even if the user just peeked at it but
    didn't actually read anything.
*   Scroll depth is calculated from the total document height, headers and
    footers are *not* removed, so this number does not quite reflect the depth
    in page content.
*   Since depth is calculated based on the bottom of the viewport compared to
    the document height, a 100% event is only logged if the user actually hits
    the exact bottom of the page, which is quite rare in practice given that
    page content probably stops above a footer. A 90% event should be sufficient
    to indicate "user read the whole content".
*   Scroll percentage is computed as the height of the document at the time the
    event was sent. If the document height changes significantly between two
    events, they could give drastically different percentages for the same pixel
    amount.
*   No events are emitted for 0%. This metric roughly aligns with page views
    anyways.
*   Events are debounced until the user stops scrolling, even if the maximum
    scroll or bucket has not changed. This is to avoid sending an event for
    *every* bucket the user passes when they are still maintaining a reasonable
    scroll velocity down the page.
