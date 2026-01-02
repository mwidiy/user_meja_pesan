// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { getTableByQrCode } from '../services/api';

export default function WelcomePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [name, setName] = useState('');

    // --- Logic Check Table ID from URL (Silent) ---
    useEffect(() => {
        const tableId = searchParams.get('tableId');
        if (tableId) {
            const verify = async () => {
                try {
                    const data = await getTableByQrCode(tableId);
                    if (data && data.id) {
                        localStorage.setItem('customer_table', JSON.stringify(data));
                        // Optional: Clean URL without reload
                        const newUrl = new URL(window.location.href);
                        newUrl.searchParams.delete('tableId');
                        window.history.replaceState({}, '', newUrl);
                    }
                } catch (e) {
                    console.error("Silent table check failed", e);
                }
            };
            verify();
        }
    }, [searchParams]);

    const handleStart = () => {
        if (!name.trim()) {
            alert("Silakan isi nama Anda terlebih dahulu!");
            return;
        }
        localStorage.setItem('customerName', name);
        router.push('/home');
    };

    // --- 1. Animasi Drawing (Muncul Awal) ---
    const logoContainerVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.5,
                when: "beforeChildren",
                staggerChildren: 0.15
            }
        }
    };

    const pathDrawingVariants = {
        hidden: { pathLength: 0, fillOpacity: 0, opacity: 0 },
        visible: {
            pathLength: 1,
            fillOpacity: 1,
            opacity: 1,
            transition: {
                pathLength: { duration: 1.5, ease: "easeInOut" },
                fillOpacity: { duration: 0.8, delay: 0.5, ease: "easeOut" },
                opacity: { duration: 0.1 }
            }
        }
    };

    // --- 2. Animasi Glitch (Sangat Jarang & Hanya Warna) ---
    // REVISI: Menghapus skewX dan x. Hanya menyisakan filter untuk color split.
    const glitchAnimation = {
        filter: [
            "drop-shadow(0 0 0 transparent)", // Diam lama (frame 1)
            "drop-shadow(0 0 0 transparent)", // Diam lama (frame 2)
            // Glitch Hit 1: Merah kiri 3px, Cyan kanan 3px. Opasitas 0.6 biar halus.
            "drop-shadow(-3px 0 0 rgba(255,0,0,0.6)) drop-shadow(3px 0 0 rgba(0,255,255,0.6))",
            // Glitch Hit 2: Posisi dibalik.
            "drop-shadow(3px 0 0 rgba(255,0,0,0.6)) drop-shadow(-3px 0 0 rgba(0,255,255,0.6))",
            "drop-shadow(0 0 0 transparent)", // Kembali normal (frame 5)
            "drop-shadow(0 0 0 transparent)"  // Kembali normal (frame 6)
        ]
    };

    const glitchTransition = {
        duration: 12, // Durasi loop 12 detik (sangat jarang)
        ease: "linear", // Perubahan warna patah-patah (robotik)
        // Glitch hanya terjadi di 4% terakhir dari total waktu (detik ke 11.5 - 12)
        // Times array disesuaikan dengan jumlah keyframes di filter (ada 6)
        times: [0, 0.96, 0.97, 0.98, 0.99, 1],
        repeat: Infinity,
        repeatDelay: 0,
        delay: 2.5 // Tunggu drawing selesai
    };

    return (
        <>
            <style jsx global>{`
                /* --- RESET & BASIC SETUP --- */
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Poppins', sans-serif; -webkit-tap-highlight-color: transparent; }
                :root { --accent: #fdd85d; --text-dark: #1a2b48; }
                html, body { height: 100%; }
                body { background-color: #ffffff; color: var(--text-dark); height: 100vh; width: 100%; display: flex; justify-content: center; overflow: hidden; }

                /* --- CONTAINER --- */
                .app-container { width: 100%; max-width: 480px; height: 100%; position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 40px 30px; background: #fff; }

                /* --- DECORATIONS --- */
                .decoration-p-img { position: absolute; top: -50px; left: 20px; width: 300px; height: auto; z-index: 0; pointer-events: none; }
                .decoration-right-img { position: absolute; top: 0; right: 0; width: 150px; height: 150px; object-fit: cover; z-index: 0; }
                .decoration-circle-img { position: absolute; bottom: -50px; left: -50px; width: 200px; height: 200px; object-fit: cover; z-index: 0; }

                /* --- LOGO SECTION --- */
                .logo-section { flex: 1; display: flex; align-items: center; justify-content: center; z-index: 1; margin-top: 40px; }
                
                /* --- CONTENT SECTION --- */
                .content-section { z-index: 1; margin-bottom: 40px; text-align: center; }
                h1 { font-size: 28px; color: #1e3a5f; margin-bottom: 40px; line-height: 1.4; min-height: 80px; }
                .highlight-name { color: var(--accent); font-weight: 700; transition: all 0.3s ease; }

                /* --- INPUT --- */
                .input-group { position: relative; text-align: left; margin: 0 auto; max-width: 100%; }
                .input-group label { position: absolute; top: -10px; left: 20px; background-color: #ffffff; padding: 0 8px; font-size: 14px; color: #555; font-weight: 500; z-index: 2; }
                .input-group input { width: 100%; padding: 18px 20px; border: 2px solid #eef0f2; border-radius: 20px; font-size: 18px; color: #333; outline: none; background: transparent; transition: border-color 0.3s; }
                .input-group input:focus { border-color: var(--accent); }

                /* --- BUTTON --- */
                .footer-section { z-index: 1; padding-bottom: 20px; }
                .btn-primary { width: 100%; padding: 20px; background: linear-gradient(to bottom right, #fee070, #fccf40); border: none; border-radius: 50px; font-size: 18px; font-weight: 700; color: #1e3a5f; cursor: pointer; box-shadow: 0 10px 20px rgba(253, 216, 93, 0.3); transition: transform 0.2s, box-shadow 0.2s; }
                .btn-primary:active { transform: scale(0.98); box-shadow: 0 5px 10px rgba(253, 216, 93, 0.2); }

                @media (max-width: 420px) {
                    .app-container { padding: 28px 18px; }
                    .decoration-p-img { width: 220px; left: 10px; top: -40px; }
                }
            `}</style>

            <motion.div
                className="app-container"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.14, delayChildren: 0.12 } }
                }}
            >
                {/* --- DEKORASI BACKGROUND --- */}
                <motion.img src="/assets/p.svg" alt="P decoration" className="decoration-p-img"
                    animate={{ y: [0, -10, 0] }} transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
                />
                <motion.img src="/assets/dekorasi.svg" alt="right decoration" className="decoration-right-img"
                    animate={{ y: [0, -6, 0] }} transition={{ duration: 4.5, ease: 'easeInOut', repeat: Infinity, delay: 0.6 }}
                />
                <motion.img src="/assets/dekorasi.svg" alt="circle decoration" className="decoration-circle-img"
                    animate={{ rotate: [0, 6, 0], y: [0, -6, 0] }} transition={{ duration: 8, ease: 'easeInOut', repeat: Infinity }}
                />

                {/* --- BAGIAN LOGO --- */}
                <motion.div
                    className="logo-section"
                    // 1. ANIMASI FLOATING (Naik Turun Halus) pada container luar
                    animate={{ y: [0, -10, 0] }}
                    transition={{
                        duration: 4,
                        ease: "easeInOut",
                        repeat: Infinity,
                        delay: 2.5 // Mulai floating setelah drawing selesai
                    }}
                >
                    <motion.svg
                        width="150"
                        height="170"
                        viewBox="0 0 382 436"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        variants={logoContainerVariants} // Animasi Entrance (Drawing)

                        // 2. ANIMASI GLITCH WARNA (Tanpa Goyang) pada SVG langsung
                        animate={glitchAnimation}
                        transition={glitchTransition}
                    >
                        {/* Group 1: Warna Biru Gelap (Base) */}
                        <motion.path
                            variants={pathDrawingVariants}
                            fill="#1C355A"
                            stroke="#1C355A"
                            strokeWidth="3"
                            d="M267.1 402.5 l-23.3 -23.5 -115.6 0 -115.7 0 0 -182 0 -182 122.3 0 122.3 0 -0.1 58.3 -0.1 58.2 34.1 0.5 34.1 0.5 -0.1 94.9 c0 52.3 -0.2 95.1 -0.3 95.3 -0.2 0.1 -19.8 -19.1 -43.5 -42.7 l-43.2 -43.1 0 -67.9 0 -68 -69.5 0.2 -69.6 0.3 0.1 96.5 c0 53 0.4 96.8 0.9 97.3 0.4 0.4 5.7 0.6 11.7 0.5 l10.9 -0.3 0.3 -32.7 0.2 -32.7 40 0.3 40 0.3 2.6 2.4 c1.5 1.3 4.4 4.2 6.6 6.4 2.2 2.2 28.8 28.9 59.1 59.4 l55.1 55.4 22.2 -0.6 22.2 -0.6 0 36.5 0 36.4 -40.2 0 -40.3 0 -23.2 -23.5z"
                        />

                        {/* Group 2: Warna Kuning Emas (Accents) */}
                        <motion.g>
                            <motion.path variants={pathDrawingVariants} fill="#F0DB88" stroke="#F0DB88" strokeWidth="2" d="M370.4 411.5 c0 -8.2 0.2 -11.5 0.3 -7.2 0.2 4.3 0.2 11 0 15 -0.1 4 -0.3 0.5 -0.3 -7.8z" />
                            <motion.path variants={pathDrawingVariants} fill="#F0DB88" stroke="#F0DB88" strokeWidth="2" d="M370.4 369 c0 -9.1 0.2 -12.8 0.3 -8.2 0.2 4.5 0.2 11.9 0 16.5 -0.1 4.5 -0.3 0.8 -0.3 -8.3z" />
                            <motion.path variants={pathDrawingVariants} fill="#F0DB88" stroke="#F0DB88" strokeWidth="2" d="M69.8 378.3 c32.1 -0.2 84.3 -0.2 116 0 31.7 0.1 5.5 0.2 -58.3 0.2 -63.8 0 -89.8 -0.1 -57.7 -0.2z" />
                            <motion.path variants={pathDrawingVariants} fill="#F0DB88" stroke="#F0DB88" strokeWidth="2" d="M98.4 122 c0 -9.1 0.2 -12.8 0.3 -8.2 0.2 4.5 0.2 11.9 0 16.5 -0.1 4.5 -0.3 0.8 -0.3 -8.3z" />
                            <motion.path variants={pathDrawingVariants} fill="#F0DB88" stroke="#F0DB88" strokeWidth="2" d="M277.7 110.3 c-0.3 -0.5 -0.6 -20.6 -0.7 -44.8 -0.1 -24.2 -0.3 -45.3 -0.4 -47 l-0.1 -3 47.3 -0.3 47.2 -0.2 -0.2 47.7 -0.3 47.8 -46.2 0.3 c-25.4 0.1 -46.4 -0.1 -46.6 -0.5z" />
                        </motion.g>
                    </motion.svg>
                </motion.div>

                {/* --- INPUT & TEXT SECTION --- */}
                <motion.div
                    className="content-section"
                    variants={{
                        hidden: { opacity: 0, y: 12 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay: 1 } }
                    }}
                >
                    <div>
                        <h1>
                            Senang bertemu
                            <br />
                            Anda, <span className="highlight-name" id="displayName">{name ? name : '...'}</span> !
                        </h1>

                        <div className="input-group" style={{ maxWidth: 420, margin: '0 auto' }}>
                            <label htmlFor="userName">Nama Anda</label>
                            <input
                                id="userName"
                                type="text"
                                autoComplete="off"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* --- FOOTER BUTTON --- */}
                <motion.div
                    className="footer-section"
                    variants={{
                        hidden: { opacity: 0, y: 8, scale: 0.98 },
                        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 18, mass: 0.35, delay: 1.2 } }
                    }}
                >
                    <div className="footer-section">
                        <button className="btn-primary" onClick={handleStart}>Mulai Memesan</button>
                    </div>
                </motion.div>
            </motion.div>
        </>
    );
}