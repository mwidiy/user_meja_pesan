'use client';

import Script from 'next/script';
import { useEffect, useState, useRef } from 'react';

export default function ARViewer({ onClose, modelSrc = '/assets/kompres.glb', posterSrc = '/assets/Ar_Icon.png' }) {
    // Provide a fallback model if modelSrc is missing or invalid
    const finalModelSrc = modelSrc || '/assets/kompres.glb';
    const finalPosterSrc = posterSrc || '/assets/Ar_Icon.png';
    const modelViewerRef = useRef(null);

    return (
        <div
            className="fixed inset-0 z-[300] bg-black bg-opacity-90 flex flex-col items-center justify-center overscroll-none touch-none"
            onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling if parent has listeners
        >
            {/* Load Model Viewer Script */}
            <Script
                src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
                type="module"
                strategy="lazyOnload"
            />

            {/* Top Bar for Close Button */}
            <div className="absolute top-4 right-4 z-[310]">
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md hover:bg-white/30 transition-all active:scale-95"
                    aria-label="Close AR View"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            {/* Model Viewer Component */}
            <div
                className="w-full h-full max-w-lg mx-auto relative flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <model-viewer
                    ref={modelViewerRef}
                    src={finalModelSrc}
                    ios-src="" // Placeholder for optional USDZ
                    alt="A 3D model of the food"
                    ar
                    ar-modes="webxr scene-viewer quick-look"
                    camera-controls
                    auto-rotate

                    /* UX IMPROVEMENTS: */
                    /* 1. Disable panning to keep object FIXED in center */
                    disable-pan

                    /* 2. Disable zooming to lock the optimized size */
                    disable-zoom

                    /* Critical for Mobile UX: 'none' disables browser scrolling per user request */
                    touch-action="none"

                    /* Interaction settings */
                    shadow-intensity="1"
                    loading="lazy"
                    reveal="interaction"
                    power-preference="high-performance"
                    interaction-prompt="none"

                    /* Camera Settings */
                    /* 150% radius makes it look smaller/contained. Fixed position. */
                    camera-orbit="0deg 75deg 150%"

                    /* Allow infinite rotation (globe style) but LOCK the zoom (radius) */
                    min-camera-orbit="-infinity 0deg 150%"
                    max-camera-orbit="infinity 180deg 150%"

                    interpolation-decay="200"

                    style={{ width: '100%', height: '100%', userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                    {/* Custom Poster Slot */}
                    <div slot="poster" className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 bg-opacity-10 backdrop-blur-sm z-10" style={{ backgroundImage: `url(${finalPosterSrc})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
                        {/* Overlay with semi-transparent dark layer for contrast */}
                        <div className="absolute inset-0 bg-black/40"></div>

                        <div className="relative z-20 flex flex-col items-center gap-4 p-4 text-center">
                            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg animate-pulse">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                    <path d="M12 3L2 9L12 15L22 9L12 3Z" />
                                    <path d="M2 15L12 21L22 15" />
                                    <path d="M2 9V15" />
                                    <path d="M22 9V15" />
                                    <path d="M12 15V21" />
                                </svg>
                            </div>
                            <button
                                type="button"
                                className="px-6 py-2.5 bg-yellow-400 text-gray-900 font-bold rounded-full shadow-lg transform transition active:scale-95 hover:bg-yellow-300 pointer-events-auto"
                                style={{ pointerEvents: 'auto' }}
                            >
                                Aktifkan View 3D
                            </button>
                            <p className="text-white text-sm font-medium opacity-90">
                                Geser untuk putar 360°
                            </p>
                        </div>
                    </div>

                    {/* Custom AR Button */}
                    <button slot="ar-button" style={{
                        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                        backgroundColor: 'white', border: 'none', borderRadius: '40px', padding: '0px 20px',
                        height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)', fontWeight: '600', color: '#333',
                        zIndex: 320
                    }}>
                        👋 Mulai AR (Kamera)
                    </button>

                    {/* Progress Bar (Optional but nice for loading feedback after interaction) */}
                    <div id="lazy-load-poster" slot="progress-bar" style={{ display: 'none' }}>
                        {/* Hide default progress bar or style it here */}
                    </div>

                </model-viewer>
            </div>

            <style jsx>{`
                model-viewer {
                   width: 100%;
                   height: 100%;
                   background-color: transparent;
                   --poster-color: transparent;
                }
                /* Ensure button in poster slot is clickable locally if model-viewer captures events differently */
                [slot="poster"] button {
                    pointer-events: auto;
                }
            `}</style>
        </div>
    );
}
