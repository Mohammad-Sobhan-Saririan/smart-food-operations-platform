import { useEffect, useRef } from 'react';

export function useIntersectionObserver(
    setActiveId: (id: string) => void,
    elementIds: string[],
    options?: IntersectionObserverInit
) {
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (observer.current) {
            observer.current.disconnect();
        }

        observer.current = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveId(entry.target.id);
                }
            });
        }, { rootMargin: '-35% 0px -65% 0px', ...options }); // This option makes the "active" trigger feel more natural in the middle of the screen

        const { current: currentObserver } = observer;

        elementIds.forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                currentObserver.observe(element);
            }
        });

        return () => currentObserver.disconnect();
    }, [elementIds, setActiveId, options]);
}