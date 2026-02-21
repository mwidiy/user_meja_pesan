'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import emailjs from '@emailjs/browser';

export default function FeedbackPage() {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const [selectedCategory, setSelectedCategory] = useState('bug'); // Default active 'Laporan Bug'
    const [feedbackText, setFeedbackText] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [notification, setNotification] = useState(null);

    // Security: Rate Limiting
    const [lastSubmitTime, setLastSubmitTime] = useState(0);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset notification
        setNotification(null);

        // 1. Validate File Size (Max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setNotification({
                type: 'error',
                message: 'Ukuran file terlalu besar (Maksimal 5MB)'
            });
            // Clear input
            e.target.value = '';
            return;
        }

        // 2. Validate File Type (PNG, JPG, JPEG)
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        // Security: Validate extension as well
        const validExtensions = ['.png', '.jpg', '.jpeg'];
        const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';

        if (!validTypes.includes(file.type) || !validExtensions.includes(ext)) {
            setNotification({
                type: 'error',
                message: 'Hanya format PNG, JPG, dan JPEG yang diperbolehkan'
            });
            // Clear input
            e.target.value = '';
            return;
        }

        // Valid File
        setAttachment(file);
        setNotification({
            type: 'success',
            message: 'Screenshot berhasil dilampirkan!'
        });

        // Auto-hide success notif
        setTimeout(() => setNotification(null), 3000);
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories = [
        { id: 'feature', label: '💡 Saran Fitur' },
        { id: 'bug', label: '🐞 Laporan Bug' },
        { id: 'design', label: '🎨 Desain/Tampilan' },
        { id: 'other', label: '❓ Lainnya' },
    ];

    const sendFeedback = async () => {
        // Security: Rate Limit (30s cooldown)
        const now = Date.now();
        if (now - lastSubmitTime < 30000) {
            setNotification({ type: 'error', message: 'Mohon tunggu 30 detik sebelum mengirim lagi.' });
            return;
        }

        if (!feedbackText.trim()) {
            setNotification({ type: 'error', message: 'Mohon isi masukan Anda terlebih dahulu.' });
            return;
        }

        setIsSubmitting(true);
        setNotification(null);

        try {


            // Get category label for the email header
            const categoryLabel = categories.find(c => c.id === selectedCategory)?.label || 'SARAN';
            // Format: "SARAN" (uppercase, removed emoji for cleaner email subject/header if needed, but sticking to user request)
            // User requested: "SARAN" then content. Let's map ids to upper case keywords.
            const prefixMap = {
                'feature': 'SARAN',
                'bug': 'LAPORAN BUG',
                'design': 'DESAIN',
                'other': 'LAINNYA'
            };
            const prefix = prefixMap[selectedCategory] || 'SARAN';

            let imageUrl = '';

            // 1. Upload to Cloudinary if attachment exists
            if (attachment) {
                try {
                    const formData = new FormData();
                    formData.append('file', attachment);
                    // Security: Use Env Var
                    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_PRESET);
                    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD;

                    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`Upload Gambar Gagal: ${errorData.error?.message || response.statusText}`);
                    }

                    const data = await response.json();
                    imageUrl = data.secure_url;

                } catch (uploadError) {
                    if (process.env.NODE_ENV !== 'production') console.error('Cloudinary Upload Error:', uploadError);
                    setNotification({ type: 'error', message: 'Gagal mengupload gambar. Coba lagi atau kirim tanpa gambar.' });
                    setIsSubmitting(false);
                    return; // Stop execution if upload fails
                }
            }

            // 2. Prepare Message Content
            // Security: Sanitize localStorage data
            const rawName = localStorage.getItem('customerName') || 'Tanpa Nama';
            const userName = String(rawName).substring(0, 30).replace(/[<>&"']/g, '');

            let messageContent = `Nama: ${userName}\n`;
            messageContent += `Jenis: ${prefix}\n\n`;
            // Security: Sanitize feedback text (although EmailJS handles text, good to be safe)
            const safeFeedback = String(feedbackText).substring(0, 1000).replace(/[<>&"']/g, '');
            messageContent += `Pesan:\n${safeFeedback}`;

            if (imageUrl) {
                messageContent += `\n\nUrl Gambar:\n${imageUrl}`;
            }

            const templateParams = {
                message: messageContent,
                to_name: "Developer",
                from_name: userName, // Use actual name here too
                reply_to: "no-reply@widi.com"
            };

            // 3. Send Email
            await emailjs.send(
                process.env.NEXT_PUBLIC_EMAILJS_SERVICE,
                process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE,
                templateParams,
                process.env.NEXT_PUBLIC_EMAILJS_KEY
            );

            setNotification({ type: 'success', message: 'Saran telah dikirimkan ke developer' });
            setFeedbackText('');
            setAttachment(null);
            setLastSubmitTime(Date.now()); // Update cooldown
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (error) {
            if (process.env.NODE_ENV !== 'production') console.error('EmailJS Error:', error);

            setNotification({ type: 'error', message: 'Gagal mengirim saran. Silakan coba lagi.' });
        } finally {
            setIsSubmitting(false);
            // Hide notification after 3s
            setTimeout(() => setNotification(null), 3000);
        }
    };

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

            {/* ... styles ... */}
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
                {/* Security: Prevent open redirect by going to waiting page instead of back() */}
                <div className="back-btn-area" onClick={() => router.push('/waiting')}>
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
                    <p className="hero-subtitle">Bantu kami membuat &apos;Meja Pesan&apos; jadi lebih baik!</p>
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
                            maxLength={500} // SECURITY: Max Length diketatkan ke 500
                            onChange={(e) => {
                                // SECURITY: Mencegah Karakter Aneh
                                const val = e.target.value.replace(/[^a-zA-Z0-9 .,!?\-]/g, '');
                                setFeedbackText(val);
                            }}
                        />
                    </div>
                </div>

                {/* NOTIFICATION TOAST */}
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'fixed',
                            top: '80px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: notification.type === 'error' ? '#FEF2F2' : '#F0FDF4',
                            border: `1px solid ${notification.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
                            color: notification.type === 'error' ? '#991B1B' : '#166534',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            zIndex: 100,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '90%',
                            maxWidth: '400px',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        <span>{notification.type === 'error' ? '⚠️' : '✅'}</span>
                        {notification.message}
                    </motion.div>
                )}

                {/* ATTACHMENT */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".png, .jpg, .jpeg"
                    style={{ display: 'none' }}
                />

                <motion.div
                    className="attachment-card"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        height: '64px',
                        backgroundColor: attachment ? '#F0FDF4' : 'white',
                        borderRadius: '9999px',
                        border: attachment ? '1px solid #BBF7D0' : '1px solid #E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
                        cursor: 'pointer'
                    }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={attachment ? "#166534" : "#1F2937"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        {attachment ? (
                            <path d="M20 6L9 17l-5-5" />
                        ) : (
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        )}
                    </svg>
                    <span className="attachment-text" style={{ color: attachment ? '#166534' : '#1F2937' }}>
                        {attachment ? (attachment.name.length > 30 ? attachment.name.substring(0, 30) + '...' : attachment.name).replace(/[<>&"']/g, '') : 'Lampirkan Screenshot (Opsional)'}
                    </span>
                    {attachment && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                setAttachment(null);
                                // Reset input value to allow selecting same file again
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            style={{
                                marginLeft: 'auto',
                                marginRight: '16px',
                                padding: '4px',
                                color: '#991B1B'
                            }}
                        >
                            ✕
                        </div>
                    )}
                </motion.div>
            </div>

            {/* FOOTER */}
            <div className="footer-wrapper">
                <motion.button
                    className="submit-btn"
                    whileTap={{ scale: 0.98 }}
                    onClick={sendFeedback}
                    disabled={isSubmitting}
                    style={{
                        width: '100%',
                        height: '64px', /* Taller to match attachment button */
                        fontSize: '18px',
                        fontWeight: '700',
                        borderRadius: '9999px',
                        border: 'none',
                        backgroundColor: isSubmitting ? '#E5E7EB' : '#FDE047',
                        color: isSubmitting ? '#9CA3AF' : '#1F2937',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                >
                    {isSubmitting ? 'Mengirim...' : 'Kirim Masukan'}
                </motion.button>
            </div>

        </div>
    );
}
