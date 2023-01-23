import { Lazy } from './lazy';

describe('Lazy', () => {
    let lazy: Lazy|undefined;

    function init({ childNodes }: { childNodes: Node[] }): Lazy {
        lazy = document.createElement('dwac-lazy');
        lazy.append(...childNodes);

        document.body.appendChild(lazy);

        return lazy;
    }

    // Mock the global `IntersectionObserver`. This needs to be done exactly
    // once at the start of the tests because `<dwac-lazy />` will construct the
    // `IntersectionObserver` once and cache it between component instances.
    const mockObserver: jasmine.SpyObj<IntersectionObserver> =
        jasmine.createSpyObj(Object.keys(IntersectionObserver.prototype));
    let triggerIntersection:
        (...args: Parameters<IntersectionObserverCallback>) => void;
    beforeAll(() => {
        spyOn(globalThis, 'IntersectionObserver').and.callFake(function (cb) {
            triggerIntersection = cb;
            return mockObserver;
        });
    });

    afterEach(() => {
        lazy?.remove();

        (IntersectionObserver as unknown as jasmine.Spy).calls.reset();
        mockObserver.observe.calls.reset();
        mockObserver.unobserve.calls.reset();
    });

    it('is defined', () => {
        const lazy = init({ childNodes: [] });

        expect(lazy.tagName).toBe('DWAC-LAZY');
    });

    it('observes intersection with viewport', () => {
        const lazy = init({ childNodes: [] });

        expect(mockObserver.observe).toHaveBeenCalledOnceWith(lazy);
        lazy.remove();
        expect(mockObserver.unobserve).toHaveBeenCalledOnceWith(lazy);
    });

    it('renders child template on intersection', () => {
        const div = document.createElement('div');
        div.textContent = 'Hello, World!';
        const tmpl = document.createElement('template');
        tmpl.content.append(div);

        const lazy = init({ childNodes: [ tmpl ]});

        // Should be lazy, doesn't render immediately.
        expect(lazy.childNodes.length).toBe(1);
        expect(lazy.childNodes[0]).toBeInstanceOf(HTMLTemplateElement);

        const entry = {
            intersectionRatio: 1,
            target: lazy,
        } as unknown as IntersectionObserverEntry;
        triggerIntersection([ entry ], mockObserver);

        // Should be rendered.
        expect(lazy.childNodes.length).toBe(1);
        expect(lazy.childNodes[0]).toBeInstanceOf(HTMLDivElement);
        expect(lazy.childNodes[0]!.textContent).toBe('Hello, World!');
    });

    it('ignores non-intersection callbacks', () => {
        const tmpl = document.createElement('template');
        tmpl.innerHTML = '<div>Hello, World!</div>';
        const lazy = init({ childNodes: [ tmpl ]});

        // Should be lazy, doesn't render immediately.
        expect(lazy.childNodes.length).toBe(1);
        expect(lazy.childNodes[0]).toBeInstanceOf(HTMLTemplateElement);

        const entry = {
            intersectionRatio: 0, // No intersection.
            target: lazy,
        } as unknown as IntersectionObserverEntry;
        triggerIntersection([ entry ], mockObserver);

        // Should remain lazy, no need to render yet.
        expect(lazy.childNodes.length).toBe(1);
        expect(lazy.childNodes[0]).toBeInstanceOf(HTMLTemplateElement);
    });

    it('throws an error when there are multiple children', () => {
        const lazy = init({
            childNodes: [
                document.createElement('template'),
                document.createElement('div'),
            ],
        });

        const entry = {
            intersectionRatio: 1,
            target: lazy,
        } as unknown as IntersectionObserverEntry;

        expect(() => triggerIntersection([ entry ], mockObserver))
            .toThrowError('Expected exactly one `<template />` child (excluding `<noscript />`).');
    });

    it('throws an error when there are no children.', () => {
        const lazy = init({ childNodes: [] });

        const entry = {
            intersectionRatio: 1,
            target: lazy,
        } as unknown as IntersectionObserverEntry;

        expect(() => triggerIntersection([ entry ], mockObserver))
            .toThrowError('Expected exactly one `<template />` child (excluding `<noscript />`).');
    });

    it('throws an error when there is exactly one child which is not a `<template />`', () => {
        const lazy = init({
            childNodes: [ document.createElement('div') ],
        });

        const entry = {
            intersectionRatio: 1,
            target: lazy,
        } as unknown as IntersectionObserverEntry;

        expect(() => triggerIntersection([ entry ], mockObserver))
            .toThrowError('Expected exactly one `<template />` child (excluding `<noscript />`).');
    });

    it('allows extra `<noscript />` children', () => {
        const div = document.createElement('div');
        div.textContent = 'Hello, World!';
        const tmpl = document.createElement('template');
        tmpl.content.append(div);

        const lazy = init({
            childNodes: [
                tmpl,
                document.createElement('noscript'),
            ],
        });

        const entry = {
            intersectionRatio: 1,
            target: lazy,
        } as unknown as IntersectionObserverEntry;
        triggerIntersection([ entry ], mockObserver);

        expect(lazy.children.length).toBe(2);
        expect(lazy.children[0]!.tagName).toBe('NOSCRIPT');
        expect(lazy.children[1]!).toBeInstanceOf(HTMLDivElement);
        expect(lazy.children[1]!.textContent).toBe('Hello, World!');
    });

    it('remains lazy after reconnecting to the document', () => {
        const div = document.createElement('div');
        div.textContent = 'Hello, World!';
        const tmpl = document.createElement('template');
        tmpl.content.append(div);

        const lazy = init({ childNodes: [ tmpl ] });

        // Should be lazy, doesn't render immediately.
        expect(mockObserver.observe).toHaveBeenCalledTimes(1);
        expect(lazy.childNodes.length).toBe(1);
        expect(lazy.childNodes[0]).toBeInstanceOf(HTMLTemplateElement);

        // Should stop observing when removed.
        lazy.remove();
        expect(mockObserver.unobserve).toHaveBeenCalledTimes(1);

        // Should resume observing when reattached.
        document.body.append(lazy);
        expect(mockObserver.observe).toHaveBeenCalledTimes(2);
        
        // Should still be lazy, no intersection yet.
        expect(lazy.childNodes.length).toBe(1);
        expect(lazy.childNodes[0]).toBeInstanceOf(HTMLTemplateElement);

        const entry = {
            intersectionRatio: 1,
            target: lazy,
        } as unknown as IntersectionObserverEntry;
        triggerIntersection([ entry ], mockObserver);

        // Should be loaded.
        expect(lazy.children.length).toBe(1);
        expect(lazy.children[0]).toBeInstanceOf(HTMLDivElement);
        expect(lazy.children[0]!.textContent).toBe('Hello, World!');

        // Should stop observing immediately.
        expect(mockObserver.unobserve).toHaveBeenCalledTimes(2);

        // Should *not* re-observe when re-attached after loading.
        // Don't care about extra calls to `unobserve()`.
        lazy.remove();
        document.body.append(lazy);
        expect(mockObserver.observe).toHaveBeenCalledTimes(2);
    });
});
