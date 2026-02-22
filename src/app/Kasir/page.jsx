'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { io } from 'socket.io-client';
import { getDynamicUrl } from '../../services/api';

function KasirContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [amount, setAmount] = useState(0);
    const [orderCode, setOrderCode] = useState('-');
    const [tableNumber, setTableNumber] = useState('-');
    const [customerName, setCustomerName] = useState('-');

    // Removed qrUrl state

    // Security: Removed unused getOrderStateParams (Dead Code)

    useEffect(() => {
        // --- SECURITY: ROUTE GUARD ---
        const guardKasir = () => {
            const p_id = searchParams.get('orderId') || searchParams.get('id') || searchParams.get('transactionCode');
            const s_raw = sessionStorage.getItem('kasir_state') || searchParams.get('state'); // Check both

            if (!p_id && !s_raw) {
                router.replace('/home');
                return false;
            }
            return true;
        };
        if (!guardKasir()) return;

        // Socket.IO Logic
        // We need to connect to the BACKEND URL, not PWA URL.
        // Assuming backend is at port 3000 based on previous context 
        // Ideally use env var, but hardcoding for now as per project style
        const socket = io(getDynamicUrl(), {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        socket.on('connect', () => {
            if (process.env.NODE_ENV !== 'production') console.log("Connected to socket for payment updates");
        });

        const handleSocketUpdate = (data) => {
            if (process.env.NODE_ENV !== 'production') console.log("Socket Update Received:", data);

            // Robust ID Matching
            const incomingId = String(data.transactionCode);
            const currentId = String(orderCode);

            // Check if this update belongs to us
            if (incomingId === currentId && currentId !== '-') {

                // Broad Status Check: specific specifically for Cashier App flow
                const isPaid =
                    data.paymentStatus === 'Paid' ||
                    data.status === 'Paid' ||
                    data.status === 'Completed' ||
                    data.status === 'Processing'; // Sometimes cashier moves straight to processing

                if (isPaid) {
                    if (process.env.NODE_ENV !== 'production') console.log("Payment Confirmed via Socket. Redirecting...");

                    // Direct Redirect - Trusting the Socket Event for Speed
                    // We still verify in background if needed, but for "detik itu juga" feel, we push first or verify fast.
                    // Let's keep verification for security but make it robust.

                    verifyAndHandleSuccess(incomingId, data);
                }
            }
        };

        socket.on('order_status_updated', handleSocketUpdate); // Cashier App Trigger
        socket.on('order_update', handleSocketUpdate);        // Webhook/System Trigger

        // Helper to verify and push
        const verifyAndHandleSuccess = async (code, data) => {
            try {
                // Optional: Double check with API if we want to be 100% sure, 
                // but if we trust the socket, we can just save state and redirect.
                // For "Instant" feel, we can optimistically redirect.
                // But let's do a quick fetch to get full items if 'data' is incomplete.

                // If data has items, use them directly:
                if (data.items && data.items.length > 0) {
                    saveStateAndRedirect(data);
                } else {
                    // Fetch full data if missing
                    const res = await fetch(`${getDynamicUrl()}/api/payment/check-status/${code}`);
                    const json = await res.json();
                    if (json.status === 'Paid' || json.status === 'Completed' || json.status === 'Processing') {
                        saveStateAndRedirect(json.data || json); // Adjust based on API structure
                    }
                }
            } catch (e) {
                console.error("Verification error", e);
            }
        };

        const saveStateAndRedirect = (finalData) => {
            sessionStorage.setItem('waiting_state', JSON.stringify({
                items: finalData.items || [],
                status: 'paid',
                transactionCode: finalData.transactionCode
            }));

            // Save to History
            try {
                const rawHistory = localStorage.getItem('order_history');
                let currentHistory = rawHistory ? JSON.parse(rawHistory) : [];
                if (Array.isArray(currentHistory)) {
                    if (!currentHistory.includes(finalData.transactionCode)) {
                        currentHistory.push(finalData.transactionCode);
                        if (currentHistory.length > 50) currentHistory.shift();
                        localStorage.setItem('order_history', JSON.stringify(currentHistory));
                    }
                }
            } catch (e) { }

            router.push('/waiting');
        };

        // Also listen for connect_error
        socket.on('connect_error', (err) => {
            if (process.env.NODE_ENV !== 'production') console.log("Socket connection error:", err);
        });

        return () => {
            socket.disconnect();
        };
    }, [orderCode, router]); // Re-run if orderCode changes (which happens once at start)

    useEffect(() => {
        try {
            // Security: Read from sessionStorage instead of URL
            const raw = sessionStorage.getItem('kasir_state') || searchParams.get('state'); // Fallback for now, but migrating

            if (raw) {
                const decoded = raw.startsWith('%') ? decodeURIComponent(raw) : raw;
                const parsed = JSON.parse(decoded);
                // parsed example: { id: 123, subtotal: 156500, tableId: 12, tableName: "Meja 12", customerName: "Ahmad", transactionCode: "TRX-..." }

                // Security: Validate Amount
                const rawAmt = Number(parsed.subtotal);
                const safeAmt = (rawAmt > 0 && rawAmt <= 99999999) ? rawAmt : 0;

                // Security: Sanitize Transaction Code
                // RELAXED SANITIZATION: Allow basic punctuation often used in IDs (., @, :, +)
                const safeCode = parsed.transactionCode ? String(parsed.transactionCode).substring(0, 100).replace(/[^a-zA-Z0-9\-_@.:+]/g, '') : '-';

                // Security: Sanitize Strings
                const safeTable = parsed.tableName ? String(parsed.tableName).substring(0, 30).replace(/[<>&"']/g, '') : '-';
                const safeName = parsed.customerName ? String(parsed.customerName).substring(0, 30).replace(/[<>&"']/g, '') : '';

                // Batch updates or wrap in timeout to fix "setState in effect" warning
                setTimeout(() => {
                    if (safeAmt) setAmount(safeAmt);
                    if (safeCode) setOrderCode(safeCode);
                    if (safeTable) setTableNumber(safeTable);

                    if (safeName) {
                        setCustomerName(safeName);
                    } else {
                        const storedName = localStorage.getItem('customerName');
                        // Security: Sanitize localStorage read too
                        if (storedName) setCustomerName(String(storedName).substring(0, 30).replace(/[<>&"']/g, ''));
                    }
                }, 0);

                // Clean up session if it came from there
                if (sessionStorage.getItem('kasir_state')) {
                    // sessionStorage.removeItem('kasir_state'); // REMOVED: Keep state for refresh/strict-mode
                }
            }
        } catch (e) {
            if (process.env.NODE_ENV !== 'production') console.error("Error parsing state:", e);
        }
    }, [searchParams]);

    const copyCode = () => {
        if (!orderCode || orderCode === '-') return;

        // Fallback function for HTTP / WebView
        const fallbackCopy = (text) => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed"; // prevent scrolling to bottom
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                alert('Kode pesanan disalin: ' + text);
            } catch (err) {
                if (process.env.NODE_ENV !== 'production') console.error('Fallback copy failed', err);
                alert('Kode: ' + text);
            }
            document.body.removeChild(textArea);
        };

        if (navigator.clipboard) {
            navigator.clipboard.writeText(orderCode).then(() => {
                alert('Kode pesanan disalin: ' + orderCode);
            }).catch(() => fallbackCopy(orderCode));
        } else {
            fallbackCopy(orderCode);
        }
    };

    return (
        <div className="kasir-shell">
            <div className="kasir-card-shell">
                <div className="kasir-main-card">
                    <div className="kasir-decoration-left"></div>
                    <div className="kasir-decoration-right"></div>

                    <div className="status-pill-wrap">
                        <div className="status-pill">
                            <div className="status-text">Menunggu Pembayaran</div>
                        </div>
                    </div>

                    <div className="amount-block">
                        <div className="amount-value">Rp {amount.toLocaleString('id-ID')}</div>
                        <div className="amount-label">Total Pembayaran</div>
                    </div>

                    <div className="divider"></div>

                    <div className="qr-wrapper">
                        <div className="qr-card">
                            <div className="qr-inner" style={{ padding: '16px' }}>
                                <QRCode
                                    value={orderCode !== '-' ? orderCode : 'Loading...'}
                                    size={256}
                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    viewBox={`0 0 256 256`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="order-code-row">
                        <span className="order-code-text">{orderCode}</span>
                        <button className="copy-btn" onClick={copyCode} title="Salin kode">
                            <img src="/assets/Salin_Icon.svg" alt="Salin" />
                        </button>
                    </div>

                    <div className="divider"></div>

                    <div className="meta-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', textAlign: 'center' }}>
                        <div className="meta-inner" style={{ justifyContent: 'center' }}>
                            <span className="meta-icon-table">
                                <img src="/assets/Kursi_Icon.svg" alt="Meja" />
                            </span>
                            <span>{tableNumber}</span>
                        </div>
                        <div style={{ fontSize: 15, color: '#475569' }}>
                            Atas Nama <span className="meta-strong" style={{ color: '#1E293B', fontWeight: 700 }}>{customerName}</span>
                        </div>
                    </div>
                </div>

                <div className="bottom-info">
                    <div className="info-card dark">
                        <div className="info-row-flex">
                            <div className="info-icon">
                                <img src="/assets/Information_Icon.svg" alt="Info Kasir" />
                            </div>
                            <div className="info-text-wrap">
                                Tunjukkan kode ini kepada kasir<br />untuk diproses.
                            </div>
                        </div>
                    </div>
                    <div className="info-card yellow" style={{ background: '#EFF6FF', outlineColor: '#BFDBFE' }}>
                        <div className="info-row-flex">
                            <div className="info-icon">
                                <img src="/assets/Information_Icon.svg" alt="Info Pembayaran" />
                            </div>
                            <div className="info-text-wrap soft" style={{ color: '#1E40AF' }}>
                                Pesanan dapat dibayar<br />setelah pesanan diantar.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function KasirPage() {
    const router = useRouter();

    return (
        <>
            <style jsx global>{`
        :root {
            --bg-main: #2C3E50;
            --card-bg: #FFFFFF;
            --text-main: #1F2937;
            --text-sub: #64748B;
            --border-soft: #E2E8F0;
            --yellow: #FBBF24;
            --yellow-soft: #FCD34D;
            --info-blue: #93C5FD;
            --info-yellow-bg: rgba(245,158,11,0.20);
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
        .kasir-header {
            position:absolute;
            top:16px;
            left:0;
            right:0;
            display:flex;
            align-items:center;
            justify-content:center; /* judul benar-benar di tengah */
            pointer-events:none;    /* header tidak menangkap klik, kecuali back */
        }

        .btn-back {
            position:absolute;
            left:21px;
            width:36px;
            height:36px;
            border-radius:999px;
            border:none;
            background:transparent;
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

        /* SHELL & CARD */
        .kasir-shell {
            width:100%;
            display:flex;
            justify-content:center;
            margin-top:8px;
        }

        .kasir-card-shell {
            width:327px;
            position:relative;
        }

        .kasir-main-card {
            width:295px;
            margin:0 auto;
            background:var(--card-bg);
            border-radius:24px;
            box-shadow:0 25px 50px rgba(0,0,0,0.25);
            padding:40px 32px 30px;
            position:relative;
        }

        .kasir-decoration-left,
        .kasir-decoration-right {
            width:32px;
            height:32px;
            border-radius:50px;
            background:var(--bg-main);
            position:absolute;
            top:304px;
        }

        .kasir-decoration-left { left:-16px; }
        .kasir-decoration-right { right:-16px; }

        /* STATUS PILL */
        .status-pill-wrap {
            display:flex;
            justify-content:center;
            margin-bottom:24px;
        }

        .status-pill {
            background:var(--yellow);
            border-radius:9999px;
            padding:8px 24px;
        }

        .status-text {
            color:#2C3E50;
            font-size:14px;
            font-weight:600;
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

        /* QR CARD */
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
            border-radius:12px;
            background:#ffffff;
            position:relative;
            overflow:hidden;
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

        /* ORDER CODE + ICON SALIN */
        .order-code-row {
            margin-top:8px;
            margin-bottom:16px;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
        }
        .order-code-text {
            font-family:'JetBrains Mono','Courier New',monospace;
            font-size:18px; /* Lebih kecil agar muat */
            letter-spacing:1.1px;
            color:#1E293B;
            white-space:nowrap;
        }
        .copy-btn {
            width:48px;              /* Diperbesar */
            height:48px;
            border-radius:999px;
            border:none;
            background:transparent;
            display:flex;
            align-items:center;
            justify-content:center;
            cursor:pointer;
            padding:0;
            flex-shrink:0;
        }
        .copy-btn img {
            width:28px;             /* Icon diperbesar */
            height:28px;
            object-fit:contain;
            display:block;
        }

        /* INFO MEJA & NAMA */
        .meta-row {
            margin-top:10px;
            padding-top:8px;
        }
        .meta-inner {
            display:flex;
            flex-wrap:wrap;
            align-items:center;
            gap:6px;
            font-size:14px;
            color:#475569;
        }
        /* ikon meja diperbesar sedikit */
        .meta-icon-table {
            width:18px;    /* naik dari 16 -> 18 agar lebih proporsional */
            height:18px;
            flex-shrink:0;
            display:flex;
            align-items:center;
            justify-content:center;
        }
        .meta-icon-table img {
            width:100%;
            height:100%;
            object-fit:contain;
            display:block;
        }
        .meta-separator {
            color:#94A3B8;
        }
        .meta-strong {
            font-weight:600;
        }

        /* BOTTOM INFO CARDS */
        .bottom-info {
            margin-top:24px;
        }
        .info-card {
            width:295px;
            margin:0 auto 12px;
            border-radius:16px;
            padding:16px;
        }
        .info-card.dark {
            background:rgba(255,255,255,0.10);
        }
        .info-card.yellow {
            background:var(--info-yellow-bg);
            outline:1px solid rgba(251,191,36,0.30);
            outline-offset:-1px;
        }
        /* ikon info juga pakai img */
        .info-icon {
            width:20px;
            height:20px;
            border-radius:4px;
            margin-right:12px;
            flex-shrink:0;
            background:transparent;
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
        }
        .info-icon img {
            width:100%;
            height:100%;
            object-fit:contain;
            display:block;
        }
        .info-text-wrap {
            color:#FFFFFF;
            font-size:14px;
            line-height:1.5;
        }
        .info-text-wrap.soft {
            color:#FEF3C7;
        }
        .info-row-flex {
            display:flex;
            align-items:flex-start;
        }
      `}</style>
            <div className="app">
                <header className="kasir-header">
                    <button className="btn-back" onClick={() => router.push('/waiting')}>
                        <img src="/assets/Back.svg" alt="Kembali" />
                    </button>
                    <div className="header-title-wrap">
                        <div className="header-title">Pembayaran Kasir</div>
                    </div>
                </header>

                <Suspense fallback={<div>Loading...</div>}>
                    <KasirContent />
                </Suspense>
            </div>
        </>
    );
}
