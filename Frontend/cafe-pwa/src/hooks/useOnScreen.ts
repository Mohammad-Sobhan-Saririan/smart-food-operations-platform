import { useState, useEffect, useMemo, RefObject } from 'react';

// The type RefObject<Element | null> is more flexible
export function useOnScreen(ref: RefObject<Element | null>) {
    const [isIntersecting, setIntersecting] = useState(false);

    // The observer logic remains the same
    const observer = useMemo(() =>
        new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting)),
        []
    );

    useEffect(() => {
        // We add a check here to make sure ref.current exists before observing it
        if (ref.current) {
            observer.observe(ref.current);
        }
        // The cleanup function remains the same
        return () => observer.disconnect();
    }, [ref, observer]);

    return isIntersecting;
}