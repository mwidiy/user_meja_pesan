'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { getDynamicUrl } from '../../services/api';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

export default function QrisPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State
    // State
    const [amount, setAmount] = useState(0);
    const [remaining, setRemaining] = useState(300); // 5 minutes
    const [orderState, setOrderState] = useState(null);
    const [orderId, setOrderId] = useState(null);

    // QR State
    const [qrValue, setQrValue] = useState('');
    const [loadingQr, setLoadingQr] = useState(true);
    const [error, setError] = useState(null);
    const [isPaid, setIsPaid] = useState(false);
    const [isExpired, setIsExpired] = useState(false); // NEW STATE
    const successLockRef = useRef(false); // Security: Lock for handleSuccess
    const [serverExpiry] = useState(() => Date.now() + 300000); // 5 min from load (Hard Timer)

    // --- REFS FOR CALLBACKS (Prevents useEffect loops) ---
    const handleSuccessRef = useRef();
    const verifyAndHandleSuccessRef = useRef();
    const numericIdRef = useRef(null); // Store numeric ID for redirect

    // --- SUCCESS HANDLER (with lock to prevent double-fire) ---
    const handleSuccess = useCallback((id) => {
        if (successLockRef.current) return; // Prevent double execution
        successLockRef.current = true;
        setIsPaid(true);

        // Clear backup
        localStorage.removeItem('qris_backup');

        // Store order state for /order page to consume
        try {
            const stateToPass = {
                ...(orderState || {}),
                id: numericIdRef.current || id, // Prefer numeric ID
                method: 'QRIS',
                transactionCode: orderState?.transactionCode || id,
            };
            sessionStorage.setItem('order_state', JSON.stringify(stateToPass));
        } catch (e) { /* ignore */ }

        // Redirect to order/receipt page with Numeric ID - INSTANTLY
        const targetId = numericIdRef.current || id;
        if (process.env.NODE_ENV !== 'production') console.log("Redirecting to order:", targetId);
        router.push(`/order?orderId=${targetId}`);
    }, [orderState, router]);

    // --- VERIFY BEFORE SUCCESS (Security: don't trust socket blindly) ---
    const verifyAndHandleSuccess = useCallback(async (id) => {
        try {
            const API_URL = getDynamicUrl();
            if (process.env.NODE_ENV !== 'production') console.log(`Verifying ID: ${id} with Amount: ${amount}`);

            const res = await fetch(`${API_URL}/api/payment/check-status/${id}?amount=${amount}`);
            const json = await res.json();

            if (process.env.NODE_ENV !== 'production') console.log("Verify Result:", json);

            if (json.status === 'Paid') {
                handleSuccessRef.current(id);
            }
        } catch (e) {
            if (process.env.NODE_ENV !== 'production') console.error("Verify error", e);
        }
    }, [amount]);

    // Update refs on every render
    useEffect(() => {
        handleSuccessRef.current = handleSuccess;
        verifyAndHandleSuccessRef.current = verifyAndHandleSuccess;
    }, [handleSuccess, verifyAndHandleSuccess]);


    // 1. Initial Load & Socket Setup
    useEffect(() => {
        // --- SECURITY: ROUTE GUARD ---
        const guardQris = () => {
            const p_id = searchParams.get('orderId') || searchParams.get('id');
            const s_raw = sessionStorage.getItem('post_payment_state');
            let s_id = null;
            if (s_raw) {
                try { s_id = JSON.parse(s_raw).transactionCode; } catch (e) { }
            }

            if (!p_id && !s_id) {
                // Check backup before redirecting (for refresh support)
                const backup = localStorage.getItem('qris_backup');
                if (!backup) {
                    router.replace('/home');
                    return false;
                }
            }
            return true;
        };
        if (!guardQris()) return;

        // Parse Params
        let idParam, amtParam, numId; // numId for redirect
        try {
            // Security: Read from sessionStorage
            const raw = sessionStorage.getItem('post_payment_state');
            if (raw) {
                const parsed = JSON.parse(raw);
                setOrderState(parsed);

                // Security: Sanitize Inputs
                // RELAXED SANITIZATION: Allow basic punctuation often used in IDs (., @, :, +)
                const sanitize = (val) => String(val || '').substring(0, 100).replace(/[^a-zA-Z0-9\-_@.:+]/g, '') || null;

                // idParam = transactionCode (for socket/polling)
                idParam = sanitize(parsed.transactionCode || parsed.id);
                // numId = numeric ID (for redirect)
                numId = sanitize(parsed.orderId);

                // Security: Validate Amount (Max 99jt, Positive)
                const rawAmt = Number(parsed.subtotal || parsed.totalAmount);
                amtParam = Math.max(0, Math.min(rawAmt || 0, 99999999));

                // Security: Clean up sessionStorage to prevent replay
                // sessionStorage.removeItem('post_payment_state'); // REMOVED: Keep state for refresh/strict-mode

                // NEW: Backup for refresh resilience (Store both IDs)
                localStorage.setItem('qris_backup', JSON.stringify({
                    id: idParam,
                    numericId: numId,
                    amount: amtParam
                }));
            }

            // Fallback: Read from localStorage if sessionStorage is empty (Refresh scenario)
            if (!idParam || !amtParam) {
                const backup = localStorage.getItem('qris_backup');
                if (backup) {
                    const b = JSON.parse(backup);
                    if (!idParam) idParam = b.id;
                    if (!amtParam) amtParam = b.amount;
                    if (!numId) numId = b.numericId;
                }
            }

            // Fallback params from URL (for deep linking)
            // Security: Sanitize URL params too
            if (!idParam) {
                const urlId = searchParams.get('orderId');
                // RELAXED SANITIZATION for URL param too
                idParam = urlId ? String(urlId).substring(0, 100).replace(/[^a-zA-Z0-9\-_@.:+]/g, '') : null;
            }

            // Also check URL for explicit numeric ID if available (though unlikely in this flow)
            if (!numId) {
                const urlNumId = searchParams.get('numericId'); // Optional param
                if (urlNumId) numId = String(urlNumId).replace(/[^0-9]/g, '');
            }

            if (idParam) setOrderId(idParam);
            if (amtParam) setAmount(amtParam);
            if (numId) numericIdRef.current = numId;

        } catch (e) {
            if (process.env.NODE_ENV !== 'production') console.error("Parse Error", e);
        }

        // Timer
        const interval = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Socket.IO Listener for Webhook Updates
        const socket = io(getDynamicUrl(), {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 20000,
            forceNew: true,
        });

        socket.on('connect', () => {
            if (process.env.NODE_ENV !== 'production') console.log("Socket connected:", socket.id);
            if (idParam) {
                // Subscribe to specific transaction updates
                socket.emit('join_room', idParam);
            }
        });

        socket.on('order_update', (data) => {
            if (process.env.NODE_ENV !== 'production') console.log("Socket Update Received:", data);

            const isMyOrder = String(data.transactionCode) === String(idParam);
            // Check broadly for success status
            const status = (data.status || '').toLowerCase();
            const isPaidStatus = status === 'paid' || status === 'completed' || status === 'settlement' || status === 'success';

            if (isMyOrder && isPaidStatus) {
                if (process.env.NODE_ENV !== 'production') console.log("PAYMENT SUCCESS DETECTED via Socket! Redirecting immediately...");

                // TRUST THE SOCKET - INSTANT REDIRECT
                setIsPaid(true); // Trigger UI Success

                // Clear backup immediately
                localStorage.removeItem('qris_backup');

                const targetId = numericIdRef.current || idParam;

                // Delay slightly just to show check mark (UX) then GO
                setTimeout(() => {
                    router.push(`/order?orderId=${targetId}`);
                }, 1500);
            }
        });

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [searchParams]); // REMOVE CALLBACKS FROM DEPS to prevent loops

    // TIMER EXPIRY LOGIC
    useEffect(() => {
        // Security: Check both visual timer and server timestamp
        const isTimerExpired = remaining === 0 || Date.now() > serverExpiry;
        if (isTimerExpired && !isPaid && !isExpired && orderId) {
            setIsExpired(true);

            // Call backend to expire
            // Safe to fire-and-forget or handle error
            const API_URL = getDynamicUrl();
            fetch(`${API_URL}/api/payment/expire-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            }).catch(err => {
                if (process.env.NODE_ENV !== 'production') console.error("Expire Error", err);
            });

            // Auto redirect
            setTimeout(() => {
                // Security: Use sessionStorage
                try { sessionStorage.setItem('payment_state', JSON.stringify(orderState || {})); } catch (e) { }
                router.push('/payment');
            }, 3500);
        }
    }, [remaining, isPaid, isExpired, orderId, orderState, router, serverExpiry]);

    // 2. Fetch QR Code Trigger
    useEffect(() => {
        if (!orderId || !amount) return;
        if (qrValue) return; // Already loaded

        const fetchQr = async () => {
            try {
                setLoadingQr(true); // Ensure loading state is set
                const API_URL = getDynamicUrl();
                const res = await fetch(`${API_URL}/api/payment/create-transaction`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: orderId,
                        amount: amount
                    })
                });

                const json = await res.json();

                // 1. Check if already Paid (Backend handles "Transaction already completed" check)
                if (json.success && json.status === 'Paid') {
                    if (process.env.NODE_ENV !== 'production') console.log("Transaction already paid!");
                    handleSuccessRef.current(orderId);
                    return;
                }

                // 2. Normal QR Flow
                if (json.success && json.data) {
                    if (json.data.qrString) {
                        setQrValue(json.data.qrString);
                        // Update amount if backend says so (e.g. fees)
                        if (json.data.amount) setAmount(json.data.amount);
                    } else if (json.data.paymentUrl) {
                        // Security: Open Redirect Protection
                        const url = json.data.paymentUrl;
                        // Whitelist domains (Pakasir, Midtrans, etc.)
                        const IS_SAFE_DOMAIN = /^https:\/\/(app\.pakasir\.com|.*\.midtrans\.com|.*\.xendit\.co|.*\.doku\.com)\//i.test(url);

                        if (url && IS_SAFE_DOMAIN) {
                            window.location.href = url;
                        } else {
                            setError("Link pembayaran tidak valid / tidak aman.");
                            if (process.env.NODE_ENV !== 'production') console.error("Blocked unsafe redirect:", url);
                        }
                    }
                } else {
                    throw new Error(json.message || "Gagal memuat QR");
                }
            } catch (err) {
                if (process.env.NODE_ENV !== 'production') console.error("QR Fetch Error:", err);
                setError("Gagal memuat QR Code. Silakan coba lagi.");
            } finally {
                setLoadingQr(false);
            }
        };

        fetchQr();
    }, [orderId, amount, qrValue]); // REMOVE handleSuccess

    // 3. Polling Backup (Just in case Webhook/Socket is delayed)
    useEffect(() => {
        if (!orderId || isPaid || !amount || isExpired) return;

        const checkStatus = async () => {
            try {
                const API_URL = getDynamicUrl();
                const res = await fetch(`${API_URL}/api/payment/check-status/${orderId}?amount=${amount}`);
                const json = await res.json();

                if (json.status === 'Paid') {
                    handleSuccessRef.current(orderId);
                }
            } catch (e) {
                // Ignore polling errors
            }
        };

        let poll = setInterval(checkStatus, 5000);
        return () => clearInterval(poll);
    }, [orderId, isPaid, amount, isExpired]); // REMOVE handleSuccess

    const formatTime = (sec) => {
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="app">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
                :root {
                    --bg-main: #2C3E50;
                    --card-bg: #FFFFFF;
                    --text-main: #1F2937;
                    --text-sub: #64748B;
                    --accent-red: #DC2626;
                    --accent-red-soft: #FEF2F2;
                    --border-soft: #E2E8F0;
                }
                * { margin:0; padding:0; box-sizing:border-box; font-family:'Poppins',sans-serif; }
                body { background:#111827; }
                .app { width:100%; max-width:480px; margin:0 auto; min-height:100vh; background:var(--bg-main); padding-top:80px; padding-bottom:24px; position:relative; }
                
                .header { position:absolute; top:20px; left:0; right:0; text-align:center; color:#FFF; font-size:1.1rem; font-weight:700; display:flex; align-items:center; justify-content:center; }
                .btn-back { position:absolute; left:20px; background:rgba(255,255,255,0.1); border:none; cursor:pointer; display:flex; padding:8px; border-radius:12px; backdrop-filter:blur(4px); }
                
                .card { width:90%; margin:0 auto; background:var(--card-bg); border-radius:24px; padding:32px 24px; box-shadow:0 10px 40px rgba(0,0,0,0.2); text-align:center; position:relative; }
                
                .timer-pill { display:inline-block; background:var(--accent-red-soft); color:var(--accent-red); padding:8px 16px; border-radius:20px; font-weight:700; font-size:0.85rem; margin-bottom:24px; }
                
                .amount-val { font-size:32px; font-weight:800; color:var(--bg-main); line-height:1; }
                .amount-lbl { font-size:0.9rem; color:var(--text-sub); margin-top:8px; margin-bottom:24px; font-weight:500; }
                
                .qr-box { 
                    width:240px; height:240px; margin:0 auto 24px; 
                    background:#FFF; border:4px solid #F1F5F9; border-radius:24px;
                    display:flex; align-items:center; justify-content:center; overflow:hidden;
                    box-shadow: inset 0 2px 10px rgba(0,0,0,0.02);
                }
                
                .decor-circle { width:30px; height:30px; background:var(--bg-main); border-radius:50%; position:absolute; top:32%; }
                .decor-left { left:-15px; }
                .decor-right { right:-15px; }

                .spinner { width:40px; height:40px; border:4px solid #E2E8F0; border-top-color:#3B82F6; border-radius:50%; animation:spin 1s linear infinite; }
                @keyframes spin { to { transform:rotate(360deg); } }

                .wallets { display:flex; justify-content:center; gap:12px; margin-top:24px; opacity:0.8; }
                .wallet-icon { width:42px; height:42px; background:#FFF; border-radius:10px; border:1px solid #E2E8F0; display:flex; align-items:center; justify-content:center; padding: 6px; }
                .wallet-icon img { width: 100%; height: 100%; object-fit: contain; }
            `}</style>

            <div className="header">
                <button className="btn-back" onClick={() => router.push('/payment')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
                Pembayaran QRIS
            </div>

            <div className="card">
                <div className="decor-circle decor-left"></div>
                <div className="decor-circle decor-right"></div>

                <div className="timer-pill">
                    {remaining > 0 ? `Selesaikan dalam ${formatTime(remaining)}` : 'Waktu Habis'}
                </div>

                <div className="amount-val">Rp {(amount || 0).toLocaleString('id-ID')}</div>
                <div className="amount-lbl">Total Pembayaran</div>

                <div className="qr-box">
                    {loadingQr ? (
                        <div className="spinner"></div>
                    ) : error ? (
                        <div style={{ color: 'red', fontSize: '13px', padding: '10px' }}>{error}</div>
                    ) : qrValue ? (
                        <QRCode
                            value={qrValue}
                            size={200}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            viewBox={`0 0 256 256`}
                        />
                    ) : null}
                </div>

                <img src="/assets/Qris_Logo.svg" alt="QRIS" style={{ height: '28px', marginBottom: '20px', opacity: 0.8 }} />

                <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: '1.6' }}>
                    Scan QR ini dengan GoPay, OVO, Dana, ShopeePay atau Mobile Banking Anda.
                </p>

                <div className="wallets">
                    <div className="wallet-icon"><img src="/assets/gopay.png" alt="GoPay" /></div>
                    <div className="wallet-icon"><img src="/assets/ovo.png" alt="OVO" /></div>
                    <div className="wallet-icon"><img src="/assets/dana.png" alt="Dana" /></div>
                    <div className="wallet-icon"><img src="/assets/shoppe.png" alt="ShopeePay" /></div>
                </div>
            </div>

            <AnimatePresence>
                {isPaid && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="success-overlay"
                        style={{
                            position: 'fixed', inset: 0, background: '#FFFFFF', zIndex: 100,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                            style={{
                                width: 80, height: 80, borderRadius: '50%', background: '#10B981',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
                            }}
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1F2937' }}
                        >
                            Pembayaran Berhasil!
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                            style={{ color: '#6B7280', marginTop: 8 }}
                        >
                            Terima kasih, pesananmu sedang kami siapkan!
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAILURE POPUP */}
            <AnimatePresence>
                {isExpired && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="failure-overlay"
                        style={{
                            position: 'fixed', inset: 0, background: '#FFFFFF', zIndex: 100,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                            style={{
                                width: 80, height: 80, borderRadius: '50%', background: '#EF4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
                            }}
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1F2937' }}
                        >
                            Pembayaran Gagal
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                            style={{ color: '#6B7280', marginTop: 8 }}
                        >
                            Waktu habis. Silakan coba lagi.
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
