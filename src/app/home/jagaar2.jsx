'use client';

import Script from 'next/script';
import { useRef } from 'react';

export default function ARPage() {
  const modelViewerRef = useRef(null);

  const handleARClick = (e) => {
    e.preventDefault();
    if (modelViewerRef.current) {
      // Fungsi internal model-viewer untuk buka kamera AR
      modelViewerRef.current.activateAR();
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: '#0000FF', // Background Biru (Testing)
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 1. LOAD SCRIPT DENGAN ATRIBUT KEAMANAN */}
      <Script
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
        type="module"
        crossOrigin="anonymous" 
        strategy="afterInteractive"
      />

      {/* 2. LAYER MODEL 3D */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <model-viewer
          ref={modelViewerRef}
          src="/assets/extra_chocolate_marshmallow_cupcake.glb"
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          auto-rotate
          reveal="auto" // Langsung load agar tombol AR siap
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
            LOAD MODEL...
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
        padding: '30px'
      }}>
        {/* Tombol Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              pointerEvents: 'auto',
              width: '50px',
              height: '50px',
              backgroundColor: 'white',
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              transform: 'translateZ(10px)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tombol Aktifkan Kamera AR */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <button
            onClick={handleARClick}
            style={{
              pointerEvents: 'auto',
              width: '300px',
              height: '60px',
              backgroundColor: '#F0C419',
              color: 'black',
              borderRadius: '15px',
              border: 'none',
              fontSize: '18px',
              fontWeight: 'bold',
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              cursor: 'pointer',
              transform: 'translateZ(10px)' // WAJIB: Biar di atas GPU 3D
            }}
          >
            BUKA KAMERA AR
          </button>
        </div>
      </div>
    </div>
  );
}