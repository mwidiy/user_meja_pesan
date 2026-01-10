'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QrisPage() {
    const router = useRouter();
    const [amount, setAmount] = useState(8000);
    const [remaining, setRemaining] = useState(152);
    const [orderState, setOrderState] = useState(null);
    const [qrisUrl, setQrisUrl] = useState(null);

    const [orderId, setOrderId] = useState(null);
    const [isPaid, setIsPaid] = useState(false);

    useEffect(() => {
        // Fetch Store QRIS
        import('../../services/api').then(mod => {
            mod.getStore().then(res => {
                if (res && res.success && res.data && res.data.qrisImage) {
                    setQrisUrl(mod.getImageUrl(res.data.qrisImage));
                }
            });
        });

        // Read props from URL
        try {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('state');
            const idParam = params.get('orderId'); // Read orderId from URL

            if (idParam) setOrderId(idParam);

            if (raw) {
                const parsed = JSON.parse(decodeURIComponent(raw));
                setOrderState(parsed);
                if (parsed.subtotal) setAmount(parsed.subtotal);
            }
        } catch (e) { }

        const interval = setInterval(() => {
            setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // POLLING CHECK STATUS
    useEffect(() => {
        if (!orderId) return;

        const checkStatus = async () => {
            try {
                // Gunakan URL API dari environment atau relatif
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const res = await fetch(`${API_URL}/api/orders/${orderId}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        const order = json.data;
                        // Cek status pembayaran
                        if (order.paymentStatus === 'Paid') {
                            setIsPaid(true);
                            handleAutoRedirect(order);
                        }
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        };

        const pollInterval = setInterval(checkStatus, 3000); // Cek setiap 3 detik
        return () => clearInterval(pollInterval);
    }, [orderId]);

    const handleAutoRedirect = (order) => {
        // Prepare state for next page
        // We can merge order info from backend or use existing orderState
        const finalState = {
            ...orderState,
            status: 'paid', // Force valid status
            id: order.transactionCode || orderId // Use real transaction code if available
        };
        const stateParam = encodeURIComponent(JSON.stringify(finalState));
        router.push(`/order?state=${stateParam}`);
    };

    const formatTime = (sec) => {
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleNext = () => {
        // Manual override (Optional)
        // User finished payment (simulated), go to Order page
        if (orderState) {
            const stateParam = encodeURIComponent(JSON.stringify(orderState));
            router.push(`/order?state=${stateParam}`);
        } else {
            router.push('/order');
        }
    };

    return (
        <>
            <style jsx global>{`
        :root {
            --bg-main: #2C3E50;
            --card-bg: #FFFFFF;
            --text-main: #1F2937;
            --text-sub: #64748B;
            --accent-red: #DC2626;
            --accent-red-soft: #FEF2F2;
            --border-soft: #E2E8F0;
            --yellow: #FACC15;
        }
        * {
            margin:0;
            padding:0;
            box-sizing:border-box;
            font-family:'Inter','Poppins',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        }
        body {
            min-height:100vh;
            background:#111827;
            display:flex;
            justify-content:center;
            align-items:flex-start;
        }
        .app {
            width:100%;
            max-width:414px;
            min-height:100vh;
            background:var(--bg-main);
            color:#fff;
            position:relative;
            padding-top:80px;
            padding-bottom:24px;
            overflow:hidden;
        }

        /* HEADER */
        .qris-header {
            position:absolute;
            top:16px;
            left:0;
            right:0;
            display:flex;
            align-items:center;
            justify-content:center; /* judul benar-benar di tengah */
            pointer-events:none;   /* supaya klik default tidak mengganggu; tombol back override */
        }
        .btn-back {
            position:absolute;
            left:21px;
            width:36px;
            height:36px;
            border-radius:999px;
            border:none;
            background:transparent; /* tidak ada kotak/bayangan */
            display:flex;
            align-items:center;
            justify-content:center;
            cursor:pointer;
            pointer-events:auto;
            padding:0;
        }
        .btn-back img {
            width:22px;
            height:22px;
            object-fit:contain;
            display:block;
        }
        .header-title-wrap {
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            pointer-events:none;
        }
        .header-title {
            font-size:18px;
            font-weight:600;
            color:#FFFFFF;
        }

        /* CONTAINER */
        .qris-shell {
            width:100%;
            display:flex;
            justify-content:center;
            margin-top:8px;
        }
        .qris-card-shell {
            width:327px;
            height:auto;
            position:relative;
        }

        .qris-card {
            width:295px;
            margin:0 auto;
            background:var(--card-bg);
            border-radius:24px;
            box-shadow:0 25px 50px rgba(0,0,0,0.25);
            padding:40px 32px 24px;
            position:relative;
        }

        /* Dekor bulatan kiri/kanan */
        .qris-decoration-left,
        .qris-decoration-right {
            width:32px;
            height:32px;
            border-radius:50px;
            background:var(--bg-main);
            position:absolute;
            top:304px;
        }
        .qris-decoration-left {
            left:-16px;
        }
        .qris-decoration-right {
            right:-16px;
        }

        /* TIMER PILL */
        .timer-pill {
            width:100%;
            display:flex;
            justify-content:center;
            margin-bottom:24px;
        }
        .timer-pill-inner {
            background:var(--accent-red-soft);
            border-radius:9999px;
            padding:10px 24px;
        }
        .timer-text {
            color:var(--accent-red);
            font-size:14px;
            font-weight:700;
            letter-spacing:0.35px;
            text-align:center;
        }

        /* AMOUNT */
        .amount-block {
            text-align:center;
            margin-bottom:18px;
        }
        .amount-value {
            font-size:48px;
            font-weight:900;
            color:var(--bg-main);
            line-height:1.1;
        }
        .amount-label {
            margin-top:6px;
            font-size:14px;
            font-weight:500;
            color:var(--text-sub);
        }

        .divider {
            width:100%;
            border-top:2px solid var(--border-soft);
            margin:12px 0 18px;
        }

        /* QR CONTAINER */
        .qr-wrapper {
            display:flex;
            justify-content:center;
            margin-bottom:24px;
        }
        .qr-card {
            width:240px;
            height:240px;
            border-radius:16px;
            background:#ffffff;
            outline:4px solid #F1F5F9;
            outline-offset:-4px;
            display:flex;
            align-items:center;
            justify-content:center;
        }
        .qr-inner {
            width:200px;
            height:200px;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
            position:relative;
            display:flex;
            align-items:center;
            justify-content:center;
        }
        .qr-inner img {
            width:100%;
            height:100%;
            object-fit:contain;
            display:block;
        }

        /* LOGO QRIS / PAYMENT */
        .qris-logo-wrap {
            display:flex;
            justify-content:center;
            margin-bottom:20px;
        }
        .qris-logo {
            width:126px;
            height:48px;
            object-fit:contain;
            display:block;
        }

        /* E-WALLET LOGOS */
        .wallet-row {
            display:flex;
            justify-content:center;
            gap:8px;
            margin-bottom:10px;
        }
        .wallet-box {
            width:40px;
            height:40px;
            border-radius:8px;
            background:#E5E7EB;
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
        }
        .wallet-box img {
            max-width:100%;
            max-height:100%;
            object-fit:contain;
            display:block;
        }

        .instruction-text {
            margin-top:10px;
            font-size:14px;
            color:#4B5563;
            text-align:center;
            line-height:1.6;
        }

        /* REFRESH */
        .refresh-row {
            margin-top:24px;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:8px;
            cursor:pointer;
        }
        /* perbaiki container icon agar tidak terlihat kotak putih */
        .refresh-icon {
            width:18px;
            height:18px;
            flex-shrink:0;
            display:flex;
            align-items:center;
            justify-content:center;
            background:transparent;     /* pastikan transparan */
            border:none;                /* tidak ada border */
            padding:0;                  /* tidak ada padding */
            border-radius:999px;        /* icon terasa bulat / soft */
            overflow:hidden;            /* potong tepian putih dari SVG kalau ada */
        }
        .refresh-icon img {
            width:100%;
            height:100%;
            object-fit:contain;
            display:block;
            background:transparent;     /* kalau UA memberi bg, paksa transparan */
        }
        .refresh-text {
            font-size:14px;
            font-weight:500;
            color:#FFFFFF;
        }

        /* NEXT BUTTON SMALL */
        .next-flow-btn {
            margin-top: 32px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            margin-left: auto;
            margin-right: auto;
            transition: background 0.2s;
        }
        .next-flow-btn:hover {
            background: rgba(255,255,255,0.2);
        }
    `}</style>
            <div className="app">
                <header className="qris-header">
                    <button className="btn-back" onClick={() => router.back()}>
                        <img src="/assets/Back.svg" alt="Kembali" />
                    </button>
                    <div className="header-title-wrap">
                        <div className="header-title">Pembayaran Qris</div>
                    </div>
                </header>

                <div className="qris-shell">
                    <div className="qris-card-shell">
                        <div className="qris-card">
                            <div className="qris-decoration-left"></div>
                            <div className="qris-decoration-right"></div>

                            <div className="timer-pill">
                                <div className="timer-pill-inner">
                                    <div className="timer-text">
                                        {remaining > 0 ? `Selesaikan dalam ${formatTime(remaining)}` : 'Waktu pembayaran habis'}
                                    </div>
                                </div>
                            </div>

                            <div className="amount-block">
                                <div className="amount-value">Rp {amount.toLocaleString('id-ID')}</div>
                                <div className="amount-label">Total Pembayaran</div>
                            </div>

                            <div className="divider"></div>

                            <div className="qr-wrapper">
                                <div className="qr-card">
                                    <div className="qr-inner">
                                        <img src={qrisUrl || "/assets/QR_Code.svg"} alt="QRIS"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/assets/QR_Code.svg';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="qris-logo-wrap">
                                <img src="/assets/Qris_Logo.svg" alt="QRIS" className="qris-logo" />
                            </div>

                            <div className="divider"></div>

                            <div className="wallet-row">
                                <div className="wallet-box"><img src="/assets/Icon_Q1.svg" alt="Dana" /></div>
                                <div className="wallet-box"><img src="/assets/Icon_Q2.svg" alt="GoPay" /></div>
                                <div className="wallet-box"><img src="/assets/Icon_Q3.svg" alt="OVO" /></div>
                                <div className="wallet-box"><img src="/assets/Icon_Q4.svg" alt="LinkAja" /></div>
                            </div>

                            <p className="instruction-text">
                                Scan QR ini dengan aplikasi E‑Wallet atau Mobile Banking Anda.
                            </p>
                        </div>

                        <div className="refresh-row" onClick={() => { setRemaining(152); alert("QR Refreshed (Demo)"); }}>
                            <span className="refresh-icon">
                                <img src="/assets/Refresh_1.svg" alt="Refresh" />
                            </span>
                            <span className="refresh-text">Refresh QR Code</span>
                        </div>

                        <button className="next-flow-btn" onClick={handleNext}>
                            Lanjut <span style={{ fontSize: '12px' }}>➜</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
