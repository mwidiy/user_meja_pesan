'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { io } from 'socket.io-client';
import { getTableByQrCode, getDynamicUrl } from '../services/api';

export default function TableGuard({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const socketRef = useRef(null);

    // 1. API Check on Navigation (Safety Net)
    // Runs every time user navigates to ensure they are allowed on this page
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const rawTable = localStorage.getItem('customer_table');
                if (!rawTable) return;

                const table = JSON.parse(rawTable);
                if (!table || !table.qrCode) return;

                const data = await getTableByQrCode(table.qrCode);

                // If inactive -> Force Close (unless already there)
                if (data && data.isActive === false && pathname !== '/close') {
                    console.warn("[TableGuard] API: Table inactive -> Redirect /close");
                    router.push('/close');
                }
                // If active -> Force Leave Close (if currently there)
                else if (data && data.isActive === true && pathname === '/close') {
                    console.warn("[TableGuard] API: Table active -> Redirect /");
                    router.push('/');
                }
            } catch (e) {
                // Silent error in prod
                if (process.env.NODE_ENV !== 'production') console.error("Guard API error:", e);
            }
        };

        checkStatus();
    }, [pathname, router]);

    // 2. Socket: PERSISTENT connection for real-time events
    // Runs ONCE on mount, does not disconnect on navigation
    useEffect(() => {
        // Fix: Use dynamic URL detection (handles localhost vs 192.168.x.x for Mobile PWA)
        const socketUrl = getDynamicUrl();
        console.log("[TableGuard] Connecting socket to:", socketUrl);

        const socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 20000
        });
        socketRef.current = socket;

        // Event: Table Deactivated
        socket.on('table_deactivated', (data) => {
            const rawTable = localStorage.getItem('customer_table');
            if (!rawTable) return;
            try {
                const table = JSON.parse(rawTable);
                if (table && table.id === data.tableId) {
                    // Check current location directly from window to avoid closure staleness
                    if (window.location.pathname !== '/close') {
                        console.warn("[TableGuard] Socket: Table deactivated! -> /close");
                        router.push('/close');
                    }
                }
            } catch (e) { console.error(e); }
        });

        // Event: Table Activated
        socket.on('table_activated', (data) => {
            const rawTable = localStorage.getItem('customer_table');
            if (!rawTable) return;
            try {
                const table = JSON.parse(rawTable);
                if (table && table.id === data.tableId) {
                    // Check current location directly
                    if (window.location.pathname === '/close') {
                        console.warn("[TableGuard] Socket: Table re-activated! -> /");
                        router.push('/');
                    }
                }
            } catch (e) { console.error(e); }
        });

        return () => {
            socket.off('table_deactivated');
            socket.off('table_activated');
            socket.disconnect();
            socketRef.current = null;
        };
    }, []); // Empty dependency = Persistent Connection

    return <>{children}</>;
}
