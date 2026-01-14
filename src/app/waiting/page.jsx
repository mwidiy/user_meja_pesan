'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrderByTransactionCode, getImageUrl, getDynamicUrl, cancelOrder } from '../../services/api';
import { io } from 'socket.io-client';
import QRCode from "react-qr-code";

export default function TrackingPage() {
    const router = useRouter();

    const [orderItems, setOrderItems] = useState([]);
    const [queueNumber, setQueueNumber] = useState('-'); // Waiting for data
    const [ordersAhead, setOrdersAhead] = useState(0); // New State
    const [orderStatus, setOrderStatus] = useState('received'); // received | preparing | ready | cancelled
    const [paymentStatus, setPaymentStatus] = useState('paid'); // paid | unpaid
    const [transactionCode, setTransactionCode] = useState('-'); // Added missing state
    const [customerName, setCustomerName] = useState('-'); // Added for WA message
    const [estimatedTime, setEstimatedTime] = useState('-');
    const [timeLeft, setTimeLeft] = useState(null); // (mm:ss) countdown

    // Cancellation & Refund State
    const [cancellationStatus, setCancellationStatus] = useState(null); // Requested, Approved, Rejected, AutoCancelled
    const [refundStatus, setRefundStatus] = useState(null); // Pending, Refunded
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    // Data Fetcher Helper
    const refreshOrderData = (code) => {
        if (!code || code === '-') return;
        getOrderByTransactionCode(code).then(res => {
            if (res && res.success && res.data) {
                const order = res.data;

                // 0. AUTO-SAVE to History
                try {
                    const currentHistory = JSON.parse(localStorage.getItem('order_history') || '[]');
                    if (order.transactionCode && !currentHistory.includes(order.transactionCode)) {
                        currentHistory.push(order.transactionCode);
                        localStorage.setItem('order_history', JSON.stringify(currentHistory));
                        console.log("✅ Auto-saved order to history:", order.transactionCode);
                    }
                } catch (e) { console.error("History save error:", e); }

                // 1. Sync State
                if (order.items && order.items.length > 0) {
                    const mappedItems = order.items.map(item => ({
                        name: item.product.name,
                        price: item.priceSnapshot,
                        qty: item.quantity,
                        image: item.product.image ? getImageUrl(item.product.image) : '/assets/placeholder.png'
                    }));
                    setOrderItems(mappedItems);
                }
                setPaymentStatus(order.paymentStatus === 'Paid' ? 'paid' : 'unpaid');
                if (order.customerName) setCustomerName(order.customerName);

                // Map Backend Status to Frontend Stepper
                let mappedStatus = 'received';
                if (order.status === 'Processing') mappedStatus = 'preparing';
                else if (order.status === 'Completed' || order.status === 'Ready') mappedStatus = 'ready';
                else if (order.status === 'Cancelled') mappedStatus = 'cancelled';

                setOrderStatus(mappedStatus);
                setCancellationStatus(order.cancellationStatus);
                setRefundStatus(order.refundStatus);
                // Also set the cancellation reason if available (for Admin Rejection display)
                if (order.cancellationReason) {
                    setCancelReason(order.cancellationReason);
                }

                // 3. SMART QUEUE 4.0 LOGIC
                if (order.queuePosition) {
                    setQueueNumber(String(order.queuePosition));
                } else if (order.queueNumber) {
                    setQueueNumber(String(order.queueNumber));
                }

                // Status Text Logic
                if (order.status === 'Pending') {
                    setOrdersAhead(`Antrean ke-${order.queuePosition}`);
                    if (res.data.predictedServiceTime) {
                        setEstimatedTime(`Selesai jam ${res.data.predictedServiceTime}`);
                    }
                } else if (order.status === 'Processing') {
                    setOrdersAhead("Sedang Disiapkan");
                    if (res.data.predictedServiceTime) {
                        setEstimatedTime(`Selesai jam ${res.data.predictedServiceTime}`);
                    }
                } else if (order.status === 'Cancelled') {
                    setOrdersAhead("Pesanan Dibatalkan");
                    setEstimatedTime(null);
                } else {
                    setOrdersAhead("Pesanan Selesai");
                    setEstimatedTime(null);
                }
            }
        }).catch(err => console.error("Error refreshing data:", err));
    };

    useEffect(() => {
        let currentCode = null;

        // 1. Initial Load from URL or LocalStorage
        try {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('state');
            let parsed = null;
            if (raw) parsed = JSON.parse(decodeURIComponent(raw));
            else {
                const saved = localStorage.getItem('order_state_v1');
                if (saved) parsed = JSON.parse(saved);
            }

            if (parsed) {
                if (parsed.items) setOrderItems(parsed.items);
                if (parsed.queueNumber) setQueueNumber(parsed.queueNumber);
                if (parsed.transactionCode) {
                    currentCode = parsed.transactionCode;
                    setTransactionCode(currentCode);
                    refreshOrderData(currentCode);
                }
            } else {
                // Demo Data
                setOrderItems([
                    { name: 'Teh Manis', price: 3000, qty: 1, image: '/assets/placeholder.png' },
                    { name: 'Es Beng Beng', price: 5000, qty: 1, image: '/assets/placeholder.png' }
                ]);
            }
        } catch (e) {
            console.error("Error parsing state:", e);
        }

        // 2. Socket Setup
        const socket = io(getDynamicUrl());

        socket.on('connect', () => {
            console.log('🔌 Connected to socket for updates');
            // Join Store Room for optimized/secured updates
            const storedTable = localStorage.getItem('customer_table');
            if (storedTable) {
                try {
                    const parsed = JSON.parse(storedTable);
                    const sid = parsed.location?.storeId;
                    if (sid) {
                        socket.emit('join_store', sid);
                        console.log(`🔌 Joining Room: store_${sid}`);
                    }
                } catch (e) { }
            }
        });

        // Listen for ANY order update
        socket.on('order_status_updated', (updatedOrder) => {
            console.log('🔔 Order Update Event:', updatedOrder);
            if (currentCode) {
                refreshOrderData(currentCode);
            }
        });

        const pollInterval = setInterval(() => {
            if (currentCode) refreshOrderData(currentCode);
        }, 15000);

        return () => {
            socket.disconnect();
            clearInterval(pollInterval);
        };
    }, []);

    const formatRupiah = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');
    const total = orderItems.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);

    // --- WHATSAPP LOGIC ---
    const handleWhatsAppClick = () => {
        const phoneNumber = "62895808953200"; // Admin Number
        const message = `Halo Kak, saya *${customerName}* dengan Order ID *${transactionCode}*.\n\nStatus pesanan saya sekarang: *${ordersAhead}*. \nMohon informasinya ya, terima kasih! 🙏`;

        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    // --- CANCELLATION HANDLER ---
    const handleCancelSubmit = async () => {
        if (!cancelReason.trim()) return alert("Mohon isi alasan pembatalan");
        setIsCancelling(true);
        try {
            const res = await cancelOrder(transactionCode, cancelReason);
            if (res.success) {
                setShowCancelModal(false);
                refreshOrderData(transactionCode);
                alert(res.message);
            } else {
                alert(res.message);
            }
        } catch (e) {
            alert("Gagal membatalkan pesanan. Coba lagi.");
        }
        setIsCancelling(false);
    };

    return (
        <>
            <style jsx global>{`
:root {
  --bg-page: #F9FAFB;
  --bg-card: #FFFFFF;
  --bg-header: #FFFFFF;
  --text-main: #111827;
  --text-sub: #6B7280;
  --text-dark: #374151;
  --primary-yellow: #F0C419;
  --primary-yellow-soft: #FFFBEB;
  --primary-orange: #F59E0B;
  --primary-green: #22C55E;
  --border-soft: #E5E7EB;
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.10);
  --shadow-footer: 0 -4px 12px rgba(0,0,0,0.08);
  --radius-lg: 24px;
  --radius-md: 16px;
  --radius-pill: 9999px;
}
* { margin:0; padding:0; box-sizing:border-box; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
body { margin:0; min-height:100vh; background:#FFFFFF; display:flex; justify-content:center; align-items:flex-start; }
.frame { width:100%; max-width:414px; min-height:100vh; background:#FFFFFF; overflow:hidden; display:flex; flex-direction:column; }
.body { flex:1; background:var(--bg-page); display:flex; flex-direction:column; }
.header { height:60px; background:var(--bg-header); box-shadow:var(--shadow-xs); display:flex; align-items:center; justify-content:center; position:sticky; top:0; z-index:10; padding:0 20px; }
.header .button { position:absolute; left:20px; cursor:pointer; background:transparent; border:none; padding:0; width:28px; height:28px; display:flex; align-items:center; justify-content:center; }
.header .button img { width:22px; height:22px; object-fit:contain; display:block; }
.header .text-wrapper { font-weight:600; font-size:18px; }
.main { flex:1; display:flex; flex-direction:column; gap:20px; padding:16px 0 24px; }
.div-2 { margin:24px auto 0; width:335px; background:var(--bg-card); border-radius:var(--radius-lg); box-shadow:var(--shadow-md); padding-bottom:24px; display:flex; flex-direction:column; gap:32px; }
.div-wrapper { margin:32px auto 0; width:271px; }
.div-3 { width:208px; height:208px; margin:0 auto; position:relative; }
.group-wrapper { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
.group .img { position:absolute; top:-7px; left:-7px; width:221px; height:221px; }
.div-4 { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; gap:8px; }
.div-5 { margin-top:54px; display:flex; justify-content:center; }
.text-wrapper-2 { font-weight:800; font-size:72px; color:var(--text-main); line-height:1; }
.div-6 { display:flex; justify-content:center; }
.text-wrapper-3 { font-size:14px; font-weight:500; color:var(--text-sub); }
.div-7 { margin:0 auto; width:271px; }
.div-8 { display:flex; gap:8px; align-items:flex-start; }
.div-9,.div-11,.div-15 { display:flex; flex-direction:column; align-items:center; gap:8px; flex:1; }
.i-wrapper,.div-12,.div-16 { width:40px; height:40px; border-radius:var(--radius-pill); display:flex; align-items:center; justify-content:center; }
.i-wrapper { background:var(--primary-green); }
.div-12 { background:var(--primary-yellow); }
.div-16 { background:#E5E7EB; }
.text-wrapper-4,.text-wrapper-5,.text-wrapper-6 { font-size:12px; line-height:16px; text-align:center; }
.text-wrapper-4 { color:#374151; }
.text-wrapper-5 { font-weight:600; color:var(--text-main); }
.text-wrapper-6 { color:#9CA3AF; }
.div-10,.div-14 { width:44px; height:4px; align-self:center; border-radius:999px; }
.div-10 { background:var(--primary-yellow); }
.div-14 { background:#E5E7EB; }
.div-18 { margin:0 auto; width:271px; height:60px; background:var(--primary-yellow-soft); border-radius:16px; display:flex; align-items:center; padding:0 16px; gap:12px; }
.div-20 { margin:0 auto 24px; width:335px; background:var(--bg-card); border-radius:16px; box-shadow:var(--shadow-md); padding-bottom:16px; display:flex; flex-direction:column; }
.h-2 { margin:24px 24px 0; }
.text-wrapper-9 { font-size:16px; font-weight:600; color:var(--text-main); }
.order-list { list-style:none; margin:16px 0 0; padding:0 24px 0; display:flex; flex-direction:column; gap:16px; }
.div-21,.div-25 { width:100%; display:flex; }
.div-22 { display:flex; gap:16px; width:100%; }
.gemini-generated { width:64px; height:64px; border-radius:12px; object-fit:cover; flex-shrink:0; }
.div-23 { flex:1; display:flex; flex-direction:column; gap:4px; }
.div-24,.div-26 { display:flex; justify-content:space-between; align-items:center; }
.text-wrapper-10,.text-wrapper-13,.text-wrapper-11 { font-size:14px; font-weight:600; color:var(--text-main); }
.text-wrapper-12 { font-size:12px; color:var(--text-sub); }
.div-27 { margin:15px 24px 0; padding:12px 13px; background:#FEFCE8; border-radius:12px; border:1px solid #FEF08A; display:flex; align-items:flex-start; gap:8px; }
.text-wrapper-14 { font-size:12px; font-weight:500; color:#374151; }
.p { font-size:12px; color:#4B5563; }
.div-30 { margin:14px 24px 0; padding-top:14px; border-top:1px solid #F3F4F6; }
.div-31 { display:flex; justify-content:space-between; align-items:center; }
.text-wrapper-15 { font-size:14px; font-weight:500; color:#374151; }
.text-wrapper-16 { font-size:16px; font-weight:700; color:var(--text-main); }
.footer { width:100%; max-width:414px; background:var(--bg-card); box-shadow:var(--shadow-footer); padding:16px 20px 16px; }
.div-32 { display:flex; gap:12px; margin-bottom:12px; }
.button-2, .button-3, .button-4 { border-radius:12px; border:2px solid #D1D5DB; display:flex; align-items:center; justify-content:center; gap:8px; padding:0 12px; height:48px; background:transparent; cursor:pointer; }
.button-2 { flex:1; } .button-3 { flex:1.1; }
.button-4 { width:100%; margin-top:8px; background:var(--primary-yellow); border:none; }
.visually-hidden { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border-width:0; }
            `}</style>
            <div className="frame">
                <div className="body">
                    <header className="header">
                        <button className="button" type="button" aria-label="Kembali" onClick={() => router.back()}>
                            <img src="/assets/kembali.svg" alt="Kembali" />
                        </button>
                        <h1 className="text-wrapper">Lacak Pesanan</h1>
                        <button className="top-icon" type="button" aria-label="Chat WA Admin" onClick={handleWhatsAppClick}>
                            <img src="/assets/wa.svg" alt="Chat WA" />
                        </button>
                    </header>

                    {paymentStatus === 'unpaid' && (
                        <div style={{ background: '#FEF3C7', padding: '10px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>Pesanan belum dibayar. Silakan ke kasir.</span>
                        </div>
                    )}

                    <main className="main">
                        <section className="div-2">
                            <h2 className="visually-hidden">Status Pesanan</h2>
                            <div className="div-wrapper">
                                <div className="div-3">
                                    <div className="group-wrapper">
                                        <div className="group">
                                            <img className="img" src="/assets/Ring.svg" alt="" />
                                            <img className="img" src="/assets/Ring.svg" alt="" />
                                        </div>
                                    </div>
                                    <div className="div-4">
                                        <div className="div-5">
                                            {orderStatus === 'ready' ? (
                                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                            ) : orderStatus === 'preparing' ? (
                                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" /><line x1="6" y1="17" x2="18" y2="17" /></svg>
                                            ) : orderStatus === 'cancelled' ? (
                                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                            ) : (
                                                <div className="text-wrapper-2">{queueNumber}</div>
                                            )}
                                        </div>
                                        <div className="div-6">
                                            <div className="text-wrapper-3">
                                                {orderStatus === 'ready' ? "Pesanan Selesai" :
                                                    orderStatus === 'cancelled' ? "Pesanan Dibatalkan" :
                                                        orderStatus === 'preparing' ? "Sedang Dimasak" : "Urutan Antrean"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="div-7">
                                <nav className="div-8">
                                    <div className="div-9">
                                        <div className="i-wrapper" style={{ background: '#22C55E' }}>
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </div>
                                        <div className="text-wrapper-4">Pesanan Diterima</div>
                                    </div>
                                    <div className={orderStatus === 'preparing' || orderStatus === 'ready' ? 'div-10' : 'div-14'} />
                                    <div className="div-11">
                                        <div className={orderStatus === 'preparing' || orderStatus === 'ready' ? 'div-12' : 'div-16'} style={{ background: (orderStatus === 'preparing' || orderStatus === 'ready') ? '#F59E0B' : '#E5E7EB' }}>
                                            <svg className="i-2" width="18" height="20" viewBox="0 0 18 20" fill="none"><path d="M9 2L2 6V10C2 14.5 5 18 9 18C13 18 16 14.5 16 10V6L9 2Z" fill="white" /></svg>
                                        </div>
                                        <div className="text-wrapper-5">Sedang Disiapkan</div>
                                    </div>
                                    <div className={orderStatus === 'ready' ? 'div-10' : 'div-14'} />
                                    <div className="div-15">
                                        <div className={orderStatus === 'ready' ? 'i-wrapper' : 'div-16'} style={{ background: orderStatus === 'ready' ? '#22C55E' : '#E5E7EB' }}>
                                            {orderStatus === 'ready' ? (
                                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            ) : (
                                                <svg className="i-3" width="14" height="20" viewBox="0 0 14 20" fill="none"><path d="M12 8H10V2H4V8H2L7 13L12 8Z" fill="#9CA3AF" /></svg>
                                            )}
                                        </div>
                                        <div className="text-wrapper-6" style={{ fontWeight: orderStatus === 'ready' ? 600 : 400, color: orderStatus === 'ready' ? '#111827' : '#9CA3AF' }}>Pesanan Selesai</div>
                                    </div>
                                </nav>
                            </div>

                            <div className="div-18">
                                <svg className="i-4" width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="#F59E0B" strokeWidth="2" /><path d="M9 5V9L12 12" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" /></svg>
                                <span className="span">Status:</span>
                                <span className="span-2">
                                    <span style={{ display: 'block', color: '#D97706', fontWeight: '800', fontSize: 18 }}>
                                        {ordersAhead || "Menunggu Konfirmasi"}
                                    </span>
                                    {estimatedTime && (
                                        <span style={{ display: 'block', fontSize: 14, color: '#059669', marginTop: 4 }}>🕑 {estimatedTime}</span>
                                    )}
                                </span>
                            </div>
                            {/* Cancellation Reason Display */}
                            {(orderStatus === 'cancelled' && cancellationStatus === 'RejectedByAdmin') && (
                                <div style={{ margin: '12px 24px 0', padding: '12px', background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA' }}>
                                    <p style={{ fontSize: 12, fontWeight: 600, color: '#DC2626' }}>
                                        ⚠️ Pesanan Dibatalkan Kasir
                                    </p>
                                    <p style={{ fontSize: 14, color: '#7F1D1D', marginTop: 4 }}>
                                        {/* Since backend returns reason in cancellationReason field */}
                                        Alasan: {cancelReason || "Tidak ada alasan spesifik"}
                                    </p>
                                </div>
                            )}
                        </section>

                        <section className="div-20">
                            <div className="h-2"><h2 className="text-wrapper-9">Rincian Pesanan</h2></div>
                            <ul className="order-list">
                                {orderItems.length === 0 ? (
                                    <li style={{ padding: '12px 24px', color: '#6B7280' }}>Tidak ada item</li>
                                ) : (
                                    orderItems.map((it, idx) => (
                                        <li className="div-21" key={idx}>
                                            <div className="div-22">
                                                <img className="gemini-generated" src={it.image || '/assets/placeholder.png'} alt={it.name} />
                                                <div className="div-23">
                                                    <div className="div-24">
                                                        <div className="text-wrapper-10">{it.name}</div>
                                                        <div className="text-wrapper-11">{formatRupiah(it.price)}</div>
                                                    </div>
                                                    <div className="text-wrapper-12">{(it.qty || 1)}x</div>
                                                </div>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                            <div className="div-27">
                                <svg className="i-5" width="13" height="20" viewBox="0 0 13 20" fill="none"><path d="M11 2H2C1.45 2 1 2.45 1 3V17C1 17.55 1.45 18 2 18H11C11.55 18 12 17.55 12 17V3C12 2.45 11.55 2 11 2ZM6.5 15.5C5.95 15.5 5.5 15.05 5.5 14.5C5.5 13.95 5.95 13.5 6.5 13.5C7.05 13.5 7.5 13.95 7.5 14.5C7.5 15.05 7.05 15.5 6.5 15.5Z" fill="#F59E0B" /></svg>
                                <div className="div-29">
                                    <div className="text-wrapper-14">Catatan Khusus:</div>
                                    <p className="p">Tambahkan es batu lebih banyak</p>
                                </div>
                            </div>
                            <div className="div-30">
                                <div className="div-31">
                                    <div className="text-wrapper-15">Total Pembayaran</div>
                                    <div className="text-wrapper-16">{formatRupiah(total)}</div>
                                </div>
                                {paymentStatus === 'unpaid' && (
                                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                                        <span style={{ background: '#FEF3C7', color: '#D97706', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>BELUM DIBAYAR</span>
                                    </div>
                                )}
                            </div>

                            {/* REFUND QR SECTION */}
                            {(orderStatus === 'cancelled' && paymentStatus === 'paid') && (
                                <div style={{ margin: '24px 24px 0', padding: '16px', background: '#FEF2F2', borderRadius: 16, border: '1px solid #FECACA', textAlign: 'center' }}>
                                    {refundStatus === 'Refunded' ? (
                                        <>
                                            <div style={{ fontSize: 40 }}>✅</div>
                                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#059669', margin: '8px 0' }}>Dana Telah Dikembalikan</h3>
                                            <p style={{ fontSize: 12, color: '#4B5563' }}>Proses refund berhasil.</p>
                                        </>
                                    ) : (
                                        <>
                                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>Refund Dana</h3>
                                            <div style={{ background: 'white', padding: 10, borderRadius: 8, display: 'inline-block' }}>
                                                <QRCode value={transactionCode} size={120} />
                                            </div>
                                            <p style={{ fontSize: 12, color: '#7F1D1D', marginTop: 12, fontWeight: 500 }}>
                                                Tunjukkan QR ini ke Kasir untuk pengembalian dana sebesar <b>{formatRupiah(total)}</b>
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </section>
                    </main>

                    <footer className="footer">
                        <div className="div-32">
                            <button className="button-2" type="button" onClick={() => router.push('/saran')}>
                                <svg className="i-6" width="14" height="17" viewBox="0 0 14 17" fill="none"><path d="M12 1H2C1.45 1 1 1.45 1 2V12L4 9H12C12.55 9 13 8.55 13 8V2C13 1.45 12.55 1 12 1Z" fill="#374151" /></svg>
                                <span className="text-wrapper-17">Beri Masukan</span>
                            </button>
                            {paymentStatus === 'unpaid' ? (
                                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                                    <button
                                        className="button-3"
                                        type="button"
                                        onClick={() => setShowCancelModal(true)}
                                        style={{ flex: 1, borderColor: '#DC2626', color: '#DC2626', background: 'white' }}
                                    >
                                        <svg className="i-7" width="11" height="17" viewBox="0 0 11 17" fill="none"><path d="M8 3V2C8 1.45 7.55 1 7 1H4C3.45 1 3 1.45 3 2V3H1V4H2V13C2 13.55 2.45 14 3 14H8C8.55 14 9 13.55 9 13V4H10V3H8Z" fill="#DC2626" /></svg>
                                        <span className="text-wrapper-18" style={{ color: '#DC2626' }}>Batal</span>
                                    </button>
                                    <button className="button-3" type="button" style={{ flex: 2, borderColor: '#F59E0B', background: '#FEF3C7' }} onClick={() => {
                                        const stateParam = encodeURIComponent(JSON.stringify({
                                            items: orderItems,
                                            subtotal: total,
                                            transactionCode: transactionCode
                                        }));
                                        router.push(`/Kasir?state=${stateParam}`);
                                    }}>
                                        <span style={{ color: '#B45309', fontWeight: '700', fontSize: 14 }}>Bayar Sekarang</span>
                                    </button>
                                </div>
                            ) : (
                                orderStatus !== 'cancelled' && orderStatus !== 'ready' && (
                                    <button
                                        className="button-3"
                                        type="button"
                                        disabled={cancellationStatus === 'Requested'}
                                        style={{
                                            opacity: cancellationStatus === 'Requested' ? 0.6 : 1,
                                            background: cancellationStatus === 'Requested' ? '#F3F4F6' : 'transparent',
                                            borderColor: cancellationStatus === 'Requested' ? '#D1D5DB' : '#D1D5DB'
                                        }}
                                        onClick={() => setShowCancelModal(true)}
                                    >
                                        <svg className="i-7" width="11" height="17" viewBox="0 0 11 17" fill="none"><path d="M8 3V2C8 1.45 7.55 1 7 1H4C3.45 1 3 1.45 3 2V3H1V4H2V13C2 13.55 2.45 14 3 14H8C8.55 14 9 13.55 9 13V4H10V3H8Z" fill={cancellationStatus === 'Requested' ? '#9CA3AF' : "#DC2626"} /></svg>
                                        <span className="text-wrapper-18" style={{ color: cancellationStatus === 'Requested' ? '#6B7280' : 'inherit' }}>
                                            {cancellationStatus === 'Requested' ? "Menunggu Konfirmasi" : "Batalkan Pesanan"}
                                        </span>
                                    </button>
                                )
                            )}
                        </div>
                        <button className="button-4" type="button" onClick={() => router.push('/home')}>
                            <svg className="i-8" width="14" height="20" viewBox="0 0 14 20" fill="none"><path d="M7 2L2 7H5V12H9V7H12L7 2Z" fill="#111827" /></svg>
                            <span className="text-wrapper-19">Pesan Menu Lain</span>
                        </button>
                    </footer>
                </div>
            </div>

            {/* MODAL */}
            {showCancelModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#111827' }}>Batalkan Pesanan?</h3>
                        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
                            {orderStatus === 'preparing'
                                ? "Pesanan sedang disiapkan. Permintaan pembatalan perlu persetujuan kasir."
                                : "Pesanan akan langsung dibatalkan. Berikan alasan pembatalan."}
                        </p>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: '#374151' }}>Alasan:</label>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Contoh: Salah pesan menu..."
                            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: 8, fontSize: 14, minHeight: 80, marginBottom: 20, color: '#111827' }}
                        />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid #D1D5DB', background: 'white', fontWeight: 600, color: '#374151' }}>Tutup</button>
                            <button
                                onClick={handleCancelSubmit}
                                disabled={isCancelling}
                                style={{ flex: 1, padding: 12, borderRadius: 12, background: '#DC2626', color: 'white', fontWeight: 600, opacity: isCancelling ? 0.7 : 1 }}
                            >
                                {isCancelling ? "..." : "Batalkan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
