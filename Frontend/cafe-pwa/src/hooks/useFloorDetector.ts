"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// We now have two keys to manage
export const FLOOR_ID_KEY = 'qr_scanned_floor_id';
export const FLOOR_TIMESTAMP_KEY = 'qr_scanned_floor_timestamp';

export function useFloorDetector() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const floorIdFromUrl = searchParams.get('floorId');

        if (floorIdFromUrl) {
            // When a QR code is scanned, save both the ID and the current time
            sessionStorage.setItem(FLOOR_ID_KEY, floorIdFromUrl);
            sessionStorage.setItem(FLOOR_TIMESTAMP_KEY, Date.now().toString());
        }
    }, [searchParams]);
}