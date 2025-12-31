'use client';

import Script from 'next/script';
import { useRef } from 'react';

export default function ARViewer({ onClose, modelSrc = '/assets/kompres.glb' }) {
    const modelViewerRef = useRef(null);

    const handleARClick = (e) => {
        e.preventDefault();
        if (modelViewerRef.current) {
            if (modelViewerRef.current.canActivateAR) {
                modelViewerRef.current.activateAR();
            } else {
                console.log("AR not supported or not ready");
                // Fallback: try forcing it anyway, sometimes the property is laggy
                modelViewerRef.current.activateAR();
            }
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'black',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column'
        }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* 1. LOAD SCRIPT DENGAN ATRIBUT KEAMANAN */}
            <Script
                src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
                type="module"
                crossOrigin="anonymous"
                strategy="lazyOnload"
            />

            {/* 2. LAYER MODEL 3D */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <model-viewer
                    ref={modelViewerRef}
                    src={modelSrc || "/assets/kompres.glb"}
                    ios-src="" // Di iOS wajib isi file .usdz jika ingin AR native
                    ar
                    /* PENTING: scene-viewer ditaruh depan agar di Android dia memprioritaskan Native Google App (lebih stabil dibanding WebXR di PWA) */
                    ar-modes="scene-viewer webxr quick-look"
                    camera-controls
                    auto-rotate
                    disable-pan
                    disable-zoom
                    touch-action="none"
                    shadow-intensity="1"
                    loading="eager" // Load secepat mungkin
                    style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                >
                    {/* Poster Loading */}
                    <div slot="poster" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        color: 'white'
                    }}>
                        <div className="flex flex-col items-center animate-pulse">
                            <span className="text-xl font-bold">Memuat Model 3D...</span>
                        </div>
                    </div>
                </model-viewer>
            </div>

            {/* 3. LAYER UI (HANYA TOMBOL) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 999,
                pointerEvents: 'none', // Klik bisa tembus ke model
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px',
                paddingTop: '32px'
            }}>
                {/* Tombol Close */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', pointerEvents: 'auto' }}>
                    <button
                        onClick={onClose}
                        className="group active:scale-95 transition-transform"
                        aria-label="Close"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <img
                            src="/assets/btn_close.png"
                            alt="Close"
                            style={{ width: '48px', height: '48px', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextSibling.style.display = 'flex';
                            }}
                        />
                        {/* Fallback SVG */}
                        <div style={{ display: 'none', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                    </button>
                </div>

                {/* Tombol Aktifkan Kamera AR */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', pointerEvents: 'auto' }}>
                    <button
                        onClick={handleARClick}
                        className="active:scale-95 transition-transform bg-[#F0C419] text-[#111827]"
                        style={{
                            width: '100%',
                            maxWidth: '335px',
                            height: '56px',
                            borderRadius: '16px',
                            border: 'none',
                            fontSize: '16px',
                            fontWeight: '700',
                            fontFamily: 'Inter, sans-serif',
                            boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: 'translateZ(10px)' // WAJIB: Biar di atas GPU 3D
                        }}
                    >
                        Tampilkan AR
                    </button>
                </div>
            </div>
        </div>
    );
}
