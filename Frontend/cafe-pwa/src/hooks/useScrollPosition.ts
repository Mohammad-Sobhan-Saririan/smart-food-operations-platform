import { useState, useEffect } from 'react';

// This new hook uses two thresholds to prevent flickering.
export function useScrollPosition(): boolean {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Get the current scroll position
            const currentScrollY = window.scrollY;

            // Hysteresis logic:
            // If user is scrolled down past 50px, set isScrolled to true.
            // If user is scrolled up past 10px, set isScrolled back to false.
            // This gap between 10px and 50px prevents flickering at the threshold.
            if (currentScrollY > 100) {
                setIsScrolled(true);
            } else if (currentScrollY < 20) {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return isScrolled;
}