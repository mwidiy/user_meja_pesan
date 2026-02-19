'use client';

import { motion } from 'framer-motion';

export default function CloseContent() {
    return (
        <>
            <style jsx global>{`
        :root {
          --bg-dark: #2C3E6B;
          --bg-dark-gradient: linear-gradient(180deg, #2C3E6B 0%, #1A2542 100%);
          --card-white: #FFFFFF;
          --text-gold: #F0C419;
          --text-white: #FFFFFF;
          --text-sub: #E2E8F0;
          --badge-zzz: #FDE047;
          --alert-red: #EF4444;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Poppins', sans-serif;
        }

        html, body {
            height: 100%;
            overflow: hidden; /* Lock scroll */
            touch-action: none; /* Disable zoom gestures */
        }

        body {
          background: var(--bg-dark);
          color: var(--text-white);
          height: 100dvh; /* Dynamic Viewport Height */
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .container {
          width: 100%;
          max-width: 480px;
          height: 100dvh;
          background: var(--bg-dark-gradient);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 30px;
          text-align: center;
          position: relative;
        }

        /* CARD ILUSTRASI */
        .illustration-card {
            width: 220px;
            height: 220px;
            background: var(--card-white);
            border-radius: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            margin-bottom: 40px;
        }

        .mascot-img {
            width: 140px;
            height: 140px;
            object-fit: contain;
            /* No animation */
        }

        .zzz-badge {
            position: absolute;
            top: -15px;
            right: -15px;
            width: 70px;
            height: 70px;
            background: var(--badge-zzz);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 800;
            color: #424242;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 4px solid var(--bg-dark); /* Border effect to blend with bg */
            z-index: 10;
        }

        /* TEXT CONTENT */
        .title {
            font-size: 28px;
            font-weight: 700;
            color: var(--text-gold);
            margin-bottom: 16px;
            line-height: 1.3;
        }

        .description {
            font-size: 16px;
            color: var(--text-sub);
            line-height: 1.6;
            max-width: 320px;
            opacity: 0.9;
        }

        /* DECORATION (Optional subtle shapes) */
        .bg-shape {
            position: absolute;
            border-radius: 50%;
            background: rgba(255,255,255,0.03);
            pointer-events: none;
        }
        .shape-1 { width: 300px; height: 300px; top: -100px; left: -100px; }
        .shape-2 { width: 200px; height: 200px; bottom: 50px; right: -50px; }
      `}</style>

            <div className="container">
                {/* Decorative Background Shapes */}
                <div className="bg-shape shape-1" />
                <div className="bg-shape shape-2" />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="illustration-card">
                        {/* Static Image (Removed motion.img animation) */}
                        <img
                            src="/assets/logo.png"
                            alt="Mascot"
                            className="mascot-img"
                        />
                        {/* Zzz Badge still animated for subtle life */}
                        <motion.div
                            className="zzz-badge"
                            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        >
                            Zzz
                        </motion.div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                >
                    <h1 className="title">Kantin Sedang Tutup</h1>
                    <p className="description">
                        Pemesanan sedang dinonaktifkan. Silakan kembali lagi di jam operasional.
                    </p>
                </motion.div>
            </div>
        </>
    );
}
