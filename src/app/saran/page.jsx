'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function FeedbackPage() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState('bug'); // Default active 'Laporan Bug'
    const [feedbackText, setFeedbackText] = useState('');

    const categories = [
        { id: 'feature', label: '💡 Saran Fitur' },
        { id: 'bug', label: '🐞 Laporan Bug' },
        { id: 'design', label: '🎨 Desain/Tampilan' },
        { id: 'other', label: '❓ Lainnya' },
    ];

    return (
        <div className="page-wrapper">
            <style jsx global>{`
                :root {
                    --bg-page: #F3F4F6;
                    --text-main: #111827;
                    --text-secondary: #6B7280;
                    --border: #E5E7EB;
                    --primary: #FDE047; /* Adjusted Yellow */
                    --text-dark: #1F2937;
                    --text-gray: #4B5563;
                }
                body {
                    margin: 0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: var(--bg-page);
                }
                * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
            `}</style>

            <style jsx>{`
                .page-wrapper {
                    display: flex;
                    flex-direction: column;
                    min-height: 100vh;
                    background: #F3F4F6;
                    max-width: 480px;
                    margin: 0 auto;
                    position: relative;
                }

                /* HEADER (Fixed 60px height) */
                .header-bar {
                    height: 60px;
                    background: white;
                    box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.05); /* Subtle shadow */
                    display: flex;
                    align-items: center;
                    padding: 0 16px;
                    position: sticky;
                    top: 0;
                    z-index: 50;
                }
                .back-btn-area {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    position: absolute; /* Take out of flow to prevent pushing title */
                    left: 16px;
                    z-index: 10;
                }
                .header-title-container {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .header-title {
                    font-size: 18px;
                    font-weight: 700; /* Bold */
                    color: #1F2937; /* Gray 800 */
                }

                .scroll-content {
                    padding: 24px 20px; /* slightly more padding horizontal */
                    padding-bottom: 160px; /* More breathing room at bottom */
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                /* HERO */
                .hero-section {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .hero-title {
                    color: #111827;
                    font-size: 24px;
                    font-weight: 800; /* Extra Bold matching image */
                    line-height: 32px;
                    margin: 0;
                }
                .hero-subtitle {
                    color: #6B7280;
                    font-size: 14px;
                    font-weight: 400;
                    line-height: 20px;
                    margin: 0;
                }

                /* CATEGORIES */
                .section-container {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .section-label {
                    color: #374151; /* Gray 700 */
                    font-size: 14px;
                    font-weight: 700; /* Bolder label */
                    line-height: 20px;
                }
                .chips-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px; /* Gap between items */
                }
                .chip {
                    /* padding handled inline for reliability */
                    border-radius: 9999px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    font-size: 15px;
                    font-weight: 600;
                    line-height: normal;
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                    user-select: none;
                }
                
                /* Active State */
                .chip.active {
                    background-color: #FDE047 !important; /* Force Yellow */
                    color: #1F2937;
                    border: 1px solid #FDE047; 
                    box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.05);
                }
                /* Inactive State */
                .chip.inactive {
                    background-color: #FFFFFF;
                    color: #374151;
                    border: 1px solid #E5E7EB; /* Subtle border */
                    box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.05); /* Subtle shadow */
                }

                /* INPUT CARD */
                .input-card {
                    background: white;
                    border-radius: 24px;
                    padding: 24px; /* More padding */
                    height: 320px; /* Taller card per image */
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1); /* Subtle card shadow */
                }
                .input-label {
                    color: #374151;
                    font-size: 14px;
                    font-weight: 700; /* Bold label inside card */
                }
                .input-field-container {
                    background: #F3F4F6;
                    border-radius: 12px; /* Matching inner radius */
                    flex: 1;
                    padding: 16px;
                }
                .textarea {
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    border: none;
                    resize: none;
                    outline: none;
                    color: #1F2937;
                    font-size: 14px;
                    font-family: 'Inter', sans-serif;
                    line-height: 24px; /* Increased line height for readability */
                }
                .textarea::placeholder {
                    color: #9CA3AF; /* Gray 400 */
                }

                /* ATTACHMENT CARD - styles handled inline */
                /* .attachment-card { ... } removed to avoid conflicts */
                
                .attachment-text {
                    color: #1F2937; /* Darker text */
                    font-size: 15px; /* Match chips size */
                    font-weight: 700; /* Bold */
                }

                /* FOOTER */
                .footer-wrapper {
                    position: fixed;
                    bottom: 0;
                    width: 100%;
                    max-width: 480px;
                    background: white;
                    padding: 16px 20px 24px 20px; /* Safe area padding at bottom */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-top: 1px solid #F3F4F6; /* Optional separator */
                    z-index: 40;
                }
                /* SUBMIT BUTTON - styles handled inline */
                /* .submit-btn { ... } removed to avoid conflicts */
            `}</style>

            {/* HEADER */}
            <div className="header-bar">
                <div className="back-btn-area" onClick={() => router.back()}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" />
                        <path d="M12 19L5 12L12 5" />
                    </svg>
                </div>
                <div className="header-title-container">
                    <span className="header-title">Beri Masukan</span>
                </div>
            </div>

            <div className="scroll-content">
                {/* HERO */}
                <div className="hero-section">
                    <h1 className="hero-title">Punya ide atau keluhan?</h1>
                    <p className="hero-subtitle">Bantu kami membuat 'Meja Pesan' jadi lebih baik!</p>
                </div>

                {/* CATEGORIES */}
                <div className="section-container">
                    <div className="section-label">Apa jenis masukan Anda?</div>
                    <div className="chips-row">
                        {categories.map((cat) => (
                            <motion.div
                                key={cat.id}
                                className={`chip ${selectedCategory === cat.id ? 'active' : 'inactive'}`}
                                onClick={() => setSelectedCategory(cat.id)}
                                whileTap={{ scale: 0.96 }}
                                animate={{
                                    backgroundColor: selectedCategory === cat.id ? '#FDE047' : '#FFFFFF',
                                    borderColor: selectedCategory === cat.id ? '#FDE047' : '#E5E7EB',
                                    color: '#1F2937',
                                    borderRadius: 50,
                                }}
                                style={{
                                    padding: '16px 24px',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                                transition={{ duration: 0.2 }}
                            >
                                {cat.label}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* INPUT */}
                <div className="input-card">
                    <div className="input-label">Tuliskan masukan Anda di sini</div>
                    <div className="input-field-container">
                        <textarea
                            className="textarea"
                            placeholder="Saya punya ide keren agar aplikasi ini bisa..."
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                        />
                    </div>
                </div>

                {/* ATTACHMENT */}
                <motion.div
                    className="attachment-card"
                    whileTap={{ scale: 0.98 }}
                    style={{
                        height: '64px',
                        backgroundColor: 'white',
                        borderRadius: '9999px',
                        border: '1px solid #E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
                        cursor: 'pointer'
                    }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    <span className="attachment-text">Lampirkan Screenshot (Opsional)</span>
                </motion.div>
            </div>

            {/* FOOTER */}
            <div className="footer-wrapper">
                <motion.button
                    className="submit-btn"
                    whileTap={{ scale: 0.98 }}
                    style={{
                        width: '100%',
                        height: '64px', /* Taller to match attachment button */
                        fontSize: '18px',
                        fontWeight: '700',
                        borderRadius: '9999px',
                        border: 'none',
                        backgroundColor: '#FDE047',
                        color: '#1F2937',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                >
                    Kirim Masukan
                </motion.button>
            </div>

        </div>
    );
}
