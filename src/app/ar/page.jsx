'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ARViewer from '../home/ARViewer';

function ARPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [modelSrc, setModelSrc] = useState(null);

    useEffect(() => {
        const src = searchParams.get('src');
        if (src) {
            setModelSrc(src);
        }
    }, [searchParams]);

    if (!modelSrc) return <div className="w-full h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

    return (
        <ARViewer
            modelSrc={modelSrc}
            onClose={() => {
                // If opened in Android WebView, try to close via interface or back
                console.log("Close requested");
                // Optional: window.history.back() or communicate with Android if bridge exists
                // For now, simple back
                router.back();
            }}
        />
    );
}

export default function ARPage() {
    return (
        <Suspense fallback={<div className="bg-black h-screen w-screen"></div>}>
            <ARPageContent />
        </Suspense>
    );
}
