import { trackScrollDepth } from './analytics';
import * as browserEnv from './browser_env';
import * as plausible from './plausible';

describe('analytics', () => {
    beforeEach(() => {
        jasmine.clock().install();
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    describe('trackScrollDepth()', () => {
        it('tracks the bucket of the scroll depth', () => {
            spyOn(browserEnv, 'getLocation').and.returnValue({
                pathname: '/page',
            } as typeof window.location);

            // Currently scrolled 100px down.
            spyOnProperty(window, 'scrollY').and.returnValue(100 /* px */);

            // Viewport is 500px tall.
            spyOnProperty(document.documentElement, 'clientHeight')
                .and.returnValue(500 /* px */);

            // Document is 2000px tall.
            spyOnProperty(document.documentElement, 'scrollHeight')
                .and.returnValue(2000 /* px */);
            
            spyOn(plausible, 'trackEvent');
            
            const host = document.createElement('div');
            const stopTracking = trackScrollDepth(host);

            // User scrolls, queueing a Plausible event, but doesn't send yet.
            host.scroll({ top: 200 /* px */ });
            host.dispatchEvent(new Event('scroll'));
            expect(plausible.trackEvent).not.toHaveBeenCalled();

            jasmine.clock().tick(1_499);
            expect(plausible.trackEvent).not.toHaveBeenCalled();

            // After 1,500 ms of no scrolling, expect event to be sent.
            jasmine.clock().tick(1);
            expect(plausible.trackEvent)
                .toHaveBeenCalledOnceWith('scroll-depth', {
                    props: {
                        path: '/page',
                        // Viewport bottom is at 200 (viewport top) + 500
                        // (viewport height). This is 35% of 2000 (document
                        // height) which rounds down to 30%.
                        depth: '30%',
                        tag: '/page - 30%',
                    },
                },
            );

            stopTracking();
        });

        it('debounces consecutive scrolls', () => {
            spyOn(browserEnv, 'getLocation').and.returnValue({
                pathname: '/page',
            } as typeof window.location);

            // Currently scrolled 100px down.
            spyOnProperty(window, 'scrollY').and.returnValue(100 /* px */);

            // Viewport is 500px tall.
            spyOnProperty(document.documentElement, 'clientHeight')
                .and.returnValue(500 /* px */);

            // Document is 2000px tall.
            spyOnProperty(document.documentElement, 'scrollHeight')
                .and.returnValue(2000 /* px */);
            
            spyOn(plausible, 'trackEvent');
            
            const host = document.createElement('div');
            const stopTracking = trackScrollDepth(host);

            // User scrolls, queueing a Plausible event, but doesn't send yet.
            host.scroll({ top: 200 /* px */ });
            host.dispatchEvent(new Event('scroll'));
            expect(plausible.trackEvent).not.toHaveBeenCalled();

            jasmine.clock().tick(1_000);
            expect(plausible.trackEvent).not.toHaveBeenCalled();

            // User scrolls again, delaying the Plausible event.
            host.scroll({ top: 300 /* px */ });
            host.dispatchEvent(new Event('scroll'));
            expect(plausible.trackEvent).not.toHaveBeenCalled();

            // Should not send an event at the previously scheduled time.
            jasmine.clock().tick(500);
            expect(plausible.trackEvent).not.toHaveBeenCalled();

            jasmine.clock().tick(999);
            expect(plausible.trackEvent).not.toHaveBeenCalled();

            // After 1,500 ms of no scrolling, expect event to be sent.
            jasmine.clock().tick(1);
            expect(plausible.trackEvent)
                .toHaveBeenCalledOnceWith('scroll-depth', {
                    props: {
                        path: '/page',
                        // Viewport bottom is at 200 (viewport top) + 500
                        // (viewport height). This is 35% of 2000 (document
                        // height) which rounds down to 30%.
                        depth: '30%',
                        tag: '/page - 30%',
                    },
                },
            );

            stopTracking();
        });

        it('does not send scroll events lower than previously sent events', () => {
            spyOn(browserEnv, 'getLocation').and.returnValue({
                pathname: '/page',
            } as typeof window.location);

            // Currently scrolled 100px down.
            spyOnProperty(window, 'scrollY').and.returnValue(100 /* px */);

            // Viewport is 500px tall.
            spyOnProperty(document.documentElement, 'clientHeight')
                .and.returnValue(500 /* px */);

            // Document is 2000px tall.
            spyOnProperty(document.documentElement, 'scrollHeight')
                .and.returnValue(2000 /* px */);
            
            spyOn(plausible, 'trackEvent');
            
            const host = document.createElement('div');
            const stopTracking = trackScrollDepth(host);

            // User scrolls and an event is sent.
            host.scroll({ top: 200 /* px */ });
            host.dispatchEvent(new Event('scroll'));
            jasmine.clock().tick(1_500);
            expect(plausible.trackEvent).toHaveBeenCalledTimes(1);

            // User scrolls *back up*, an event should not be sent since we
            // already sent a deeper event.
            host.scroll({ top: 100 /* px */ });
            host.dispatchEvent(new Event('scroll'));
            jasmine.clock().tick(1_500);
            expect(plausible.trackEvent).toHaveBeenCalledTimes(1);

            stopTracking();
        });

        it('sends the maximum scroll event received', () => {
            spyOn(browserEnv, 'getLocation').and.returnValue({
                pathname: '/page',
            } as typeof window.location);

            // Currently scrolled 100px down.
            spyOnProperty(window, 'scrollY').and.returnValue(100 /* px */);

            // Viewport is 500px tall.
            spyOnProperty(document.documentElement, 'clientHeight')
                .and.returnValue(500 /* px */);

            // Document is 2000px tall.
            spyOnProperty(document.documentElement, 'scrollHeight')
                .and.returnValue(2000 /* px */);
            
            spyOn(plausible, 'trackEvent');
            
            const host = document.createElement('div');
            const stopTracking = trackScrollDepth(host);

            // User scrolls to 200px.
            host.scroll({ top: 200 /* px */ });
            host.dispatchEvent(new Event('scroll'));
            jasmine.clock().tick(1_000);
            expect(plausible.trackEvent).not.toHaveBeenCalled();

            // Before the event is sent, user scrolls back up to 100px.
            host.scroll({ top: 100 /* px */ });
            host.dispatchEvent(new Event('scroll'));
            jasmine.clock().tick(1_500);

            // Event should only send the 200px scroll, since that is the
            // maximum depth the user scrolled.
            expect(plausible.trackEvent)
                .toHaveBeenCalledOnceWith('scroll-depth', {
                    props: {
                        path: '/page',
                        // Viewport bottom is at 200 (viewport top) + 500
                        // (viewport height). This is 35% of 2000 (document
                        // height) which rounds down to 30%.
                        depth: '30%',
                        tag: '/page - 30%',
                    },
                },
            );

            stopTracking();
        });

        it('stops tracking when the returned function is called', () => {
            spyOn(plausible, 'trackEvent');

            // Start tracking scrolls.
            const host = document.createElement('div');
            const stopTracking = trackScrollDepth(host);

            // User scrolls, expect event to be emitted.
            host.scroll({ top: 100 /* px */ });
            host.dispatchEvent(new Event('scroll'));
            jasmine.clock().tick(1_500 /* ms */);
            expect(plausible.trackEvent).toHaveBeenCalledTimes(1);

            stopTracking();

            // User scrolls again, expect event *not* to be emitted.
            host.scroll({ top: 100 /* px */ });
            host.dispatchEvent(new Event('scroll'));
            jasmine.clock().tick(1_500 /* ms */);
            // Should *not* be called again.
            expect(plausible.trackEvent).toHaveBeenCalledTimes(1);
        });

        it('does not emit a scroll event for < 10%', () => {
            spyOn(browserEnv, 'getLocation').and.returnValue({
                pathname: '/page',
            } as typeof window.location);

            // Currently scrolled 100px down.
            spyOnProperty(window, 'scrollY').and.returnValue(100 /* px */);

            // Viewport is 500px tall.
            spyOnProperty(document.documentElement, 'clientHeight')
                .and.returnValue(500 /* px */);

            // Document is 10,000px tall.
            spyOnProperty(document.documentElement, 'scrollHeight')
                .and.returnValue(10_000 /* px */);
            
            spyOn(plausible, 'trackEvent');
            
            const host = document.createElement('div');
            const stopTracking = trackScrollDepth(host);

            // User scrolls to 200px, placing the bottom of the viewport at
            // 700px which is less than 10% of the total document height
            // (10,000px).
            host.scroll({ top: 200 /* px */ });
            host.dispatchEvent(new Event('scroll'));
            jasmine.clock().tick(1_500);
            // Expect no event to be sent because the user has not reached 10%
            // of the document yet.
            expect(plausible.trackEvent).not.toHaveBeenCalled();

            stopTracking();
        });
    });
});
