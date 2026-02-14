'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { getDynamicUrl } from '../../services/api';
import io from 'socket.io-client';

export default function QrisPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

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

    // 1. Initial Load & Socket Setup
    useEffect(() => {
        // Parse Params
        let idParam, amtParam;
        try {
            const raw = searchParams.get('state');
            if (raw) {
                const parsed = JSON.parse(decodeURIComponent(raw));
                setOrderState(parsed);
                idParam = parsed.id || parsed.transactionCode;
                amtParam = parsed.subtotal || parsed.totalAmount;
            }
            // Fallback params
            if (!idParam) idParam = searchParams.get('orderId');
            if (idParam) setOrderId(idParam);
            if (amtParam) setAmount(amtParam);

        } catch (e) {
            console.error("Parse Error", e);
        }

        // Timer
        const interval = setInterval(() => {
            setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        // Socket.IO Listener for Webhook Updates
        const socket = io(getDynamicUrl());
        socket.on('connect', () => {
            console.log("Socket connected for payment updates");
            if (idParam) socket.emit('join_room', idParam); // Optional if using rooms
        });

        socket.on('order_update', (data) => {
            console.log("Socket Update:", data);
            if (data.transactionCode === idParam && data.status === 'Paid') {
                handleSuccess(idParam);
            }
        });

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [searchParams]);

    // 2. Fetch QR Code Trigger
    useEffect(() => {
        if (!orderId || !amount) return;
        if (qrValue) return; // Already loaded

        const fetchQr = async () => {
            try {
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
                    console.log("Transaction already paid!");
                    handleSuccess(orderId);
                    return;
                }

                // 2. Normal QR Flow
                if (json.success && json.data) {
                    if (json.data.qrString) {
                        setQrValue(json.data.qrString);
                        // Update amount if backend says so (e.g. fees)
                        if (json.data.amount) setAmount(json.data.amount);
                    } else if (json.data.paymentUrl) {
                        setError("QR Code data not available (URL only).");
                        window.location.href = json.data.paymentUrl; // Auto redirect fallback
                    }
                } else {
                    throw new Error(json.message || "Gagal memuat QR");
                }
            } catch (err) {
                console.error("QR Fetch Error:", err);
                setError("Gagal memuat QR Code. Silakan coba lagi.");
            } finally {
                setLoadingQr(false);
            }
        };

        fetchQr();
    }, [orderId, amount]);

    // 3. Polling Backup (Just in case Webhook/Socket is delayed)
    useEffect(() => {
        if (!orderId || isPaid || !amount) return;

        const poll = setInterval(async () => {
            try {
                const API_URL = getDynamicUrl();
                const res = await fetch(`${API_URL}/api/payment/check-status/${orderId}?amount=${amount}`);
                const json = await res.json();

                if (json.status === 'Paid') {
                    handleSuccess(orderId);
                }
            } catch (e) {
                // Ignore polling errors
            }
        }, 5000); // Check every 5s

        return () => clearInterval(poll);
    }, [orderId, isPaid, amount]);

    const handleSuccess = (id) => {
        if (isPaid) return;
        setIsPaid(true);
        // Delay slightly for UX
        setTimeout(() => {
            // Re-construct state
            const finalState = {
                ...(orderState || {}),
                status: 'paid',
                id: id,
                method: 'QRIS'
            };
            const param = encodeURIComponent(JSON.stringify(finalState));
            router.push(`/order?state=${param}`);
        }, 1000);
    };

    const formatTime = (sec) => {
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="app">
            <style jsx global>{`
                :root {
                    --bg-main: #2C3E50;
                    --card-bg: #FFFFFF;
                    --text-main: #1F2937;
                    --text-sub: #64748B;
                    --accent-red: #DC2626;
                    --accent-red-soft: #FEF2F2;
                    --border-soft: #E2E8F0;
                }
                * { margin:0; padding:0; box-sizing:border-box; font-family:'Inter',sans-serif; }
                body { background:#111827; }
                .app { width:100%; max-width:414px; margin:0 auto; min-height:100vh; background:var(--bg-main); padding-top:80px; padding-bottom:24px; position:relative; }
                
                .header { position:absolute; top:20px; left:0; right:0; text-align:center; color:#FFF; font-size:18px; font-weight:600; display:flex; align-items:center; justify-content:center; }
                .btn-back { position:absolute; left:20px; background:none; border:none; cursor:pointer; display:flex; padding:5px; }
                
                .card { width:90%; margin:0 auto; background:var(--card-bg); border-radius:24px; padding:32px 24px; box-shadow:0 10px 30px rgba(0,0,0,0.2); text-align:center; position:relative; }
                
                .timer-pill { display:inline-block; background:var(--accent-red-soft); color:var(--accent-red); padding:8px 16px; border-radius:20px; font-weight:700; font-size:14px; margin-bottom:24px; }
                
                .amount-val { font-size:40px; font-weight:800; color:var(--bg-main); line-height:1; }
                .amount-lbl { font-size:14px; color:var(--text-sub); margin-top:8px; margin-bottom:24px; }
                
                .qr-box { 
                    width:240px; height:240px; margin:0 auto 24px; 
                    background:#FFF; border:4px solid #F1F5F9; border-radius:16px;
                    display:flex; align-items:center; justify-content:center; overflow:hidden;
                }
                
                .decor-circle { width:30px; height:30px; background:var(--bg-main); border-radius:50%; position:absolute; top:35%; }
                .decor-left { left:-15px; }
                .decor-right { right:-15px; }

                .spinner { width:40px; height:40px; border:4px solid #E2E8F0; border-top-color:#3B82F6; border-radius:50%; animation:spin 1s linear infinite; }
                @keyframes spin { to { transform:rotate(360deg); } }

                .wallets { display:flex; justify-content:center; gap:10px; margin-top:20px; opacity:0.6; }
                .wallet-icon { width:30px; height:30px; background:#EEE; border-radius:6px; }
            `}</style>

            <div className="header">
                <button className="btn-back" onClick={() => router.back()}>
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

                <img src="/assets/Qris_Logo.svg" alt="QRIS" style={{ height: '32px', marginBottom: '16px' }} />

                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
                    Scan QR ini dengan GoPay, OVO, Dana, ShopeePay atau Mobile Banking Anda.
                </p>

                <div className="wallets">
                    {/* Placeholder icons can go here */}
                    <div className="wallet-icon"></div>
                    <div className="wallet-icon"></div>
                    <div className="wallet-icon"></div>
                </div>
            </div>

            {isPaid && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 99,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#FFF'
                }}>
                    <div style={{ fontSize: '50px', marginBottom: '20px' }}>✅</div>
                    <h2>Pembayaran Berhasil!</h2>
                    <p>Mengalihkan...</p>
                </div>
            )}
        </div>
    );
}
