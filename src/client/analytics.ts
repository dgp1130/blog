import { getLocation } from './browser_env';
import { debounce } from './debounce';
import { trackEvent } from './plausible';

/**
 * Runs all trackers on the page to report user behavior to analytics.
 *
 * @returns A function which stops all tracking. In practice you usually want to
 *     track for the lifetime of the page, so this is usually not needed.
 *     However if you ever want to stop tracking, call the returned function.
 */
export function trackAll(): () => void {
    const stopTrackingScrollDepth = trackScrollDepth();

    return () => {
        stopTrackingScrollDepth();
    };
}

/**
 * Sends analytics events tracking the user scrolling in the given element.
 *
 * @param host Testonly, always use the default value in prod.
 * @returns A function which stops tracking scroll depth.
 */
export function trackScrollDepth(host: EventTarget = window): () => void {
    let maxObservedScrollBucket = 0;
    let maxSentScrollBucket = 0;

    const debounceScrollEvent = debounce(
        1_500 /* ms */,
        () => {
            // Only send an event if is the deepest scroll we've seen so far.
            if (maxObservedScrollBucket <= maxSentScrollBucket) return;
            maxSentScrollBucket = maxObservedScrollBucket;
            const scrollPercentage = `${maxObservedScrollBucket * 100}%`;

            // See /doc/analytics.md#scroll-depth more details.
            trackEvent('scroll-depth', {
                props: {
                    path: getLocation().pathname,
                    depth: scrollPercentage,
                },
            });
        },
    );

    function onScroll(): void {
        const viewportBottom =
            window.scrollY + document.documentElement.clientHeight;
        const documentHeight = document.documentElement.scrollHeight;
    
        const scrollFraction = viewportBottom / documentHeight;
        const scrollBucket = Math.floor(scrollFraction * 10) / 10;
        if (scrollBucket > maxObservedScrollBucket) {
            maxObservedScrollBucket = scrollBucket;
        }

        // Debounce a scroll event even if the maximum hasn't changed because
        // the user is still scrolling and we want to wait for them to stop
        // before sending the event.
        debounceScrollEvent();
    };

    host.addEventListener('scroll', onScroll);
    return () => host.removeEventListener('scroll', onScroll);
}
