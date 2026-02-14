'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getOrderByTransactionCode, getImageUrl, getDynamicUrl, cancelOrder } from '../../services/api';
import { io } from 'socket.io-client';
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from 'framer-motion';

export default function TrackingPage() {
    const router = useRouter();

    const [orderItems, setOrderItems] = useState([]);
    const [queueNumber, setQueueNumber] = useState('-');
    const [ordersAhead, setOrdersAhead] = useState(0);
    const [orderStatus, setOrderStatus] = useState('received'); // received | preparing | ready | cancelled
    const [paymentStatus, setPaymentStatus] = useState('paid');
    const [transactionCode, setTransactionCode] = useState('-');
    const [customerName, setCustomerName] = useState('-');
    const [estimatedTime, setEstimatedTime] = useState('-');

    // Cancellation & Refund State
    const [cancellationStatus, setCancellationStatus] = useState(null);
    const [refundStatus, setRefundStatus] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [selectedReason, setSelectedReason] = useState(null); // NEW STATE
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
                    }
                } catch (e) { console.error("History save error:", e); }

                // 1. Sync State
                if (order.items && order.items.length > 0) {
                    const mappedItems = order.items.map(item => ({
                        name: item.product.name,
                        price: item.priceSnapshot,
                        qty: item.quantity,
                        image: item.product.image ? getImageUrl(item.product.image) : ''
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
                        setEstimatedTime(`Estimasi selesai jam ${res.data.predictedServiceTime}`);
                    }
                } else if (order.status === 'Processing') {
                    setOrdersAhead("Sedang Disiapkan");
                    if (res.data.predictedServiceTime) {
                        setEstimatedTime(`Estimasi selesai jam ${res.data.predictedServiceTime}`);
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
                }
            }

            // --- FALLBACK: DIRECT PARAMETER ---
            if (!currentCode) {
                const directId = params.get('orderId') || params.get('id') || params.get('transactionCode');
                if (directId) currentCode = directId;
            }

            if (currentCode) {
                setTransactionCode(currentCode);
                refreshOrderData(currentCode);
            } else {
                // Only set dummy if NO code found
                if (!parsed) {
                    setOrderItems([
                        { name: 'Ice Coffee Palm Sugar', price: 18000, qty: 1, image: '' },
                        { name: 'Croissant Butter', price: 25000, qty: 2, image: '' }
                    ]);
                }
            }
        } catch (e) {
            console.error("Error parsing state:", e);
        }

        // 2. Socket Setup
        const socket = io(getDynamicUrl());

        socket.on('connect', () => {
            console.log('🔌 Connected to socket for updates');
            const storedTable = localStorage.getItem('customer_table');
            if (storedTable) {
                try {
                    const parsed = JSON.parse(storedTable);
                    const sid = parsed.location?.storeId;
                    if (sid) {
                        socket.emit('join_store', sid);
                    }
                } catch (e) { }
            }
        });

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
        const finalReason = selectedReason ? selectedReason : cancelReason;

        if (!finalReason || !finalReason.trim()) return alert("Mohon pilih atau isi alasan pembatalan");

        setIsCancelling(true);
        try {
            const res = await cancelOrder(transactionCode, finalReason);
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

    const cancelOptions = [
        {
            id: 'too_long', label: 'Menunggu terlalu lama', icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                </svg>
            )
        },
        {
            id: 'change_menu', label: 'Ingin mengganti menu', icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>
                </svg>
            )
        },
        {
            id: 'change_payment', label: 'Ingin ganti metode bayar', icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
            )
        }
    ];

    return (
        <div className="page-container">
            <style jsx global>{`
                :root {
                    --bg-page: #F3F4F6;
                    --bg-card: #FFFFFF;
                    --primary: #F59E0B;
                    --primary-hover: #D97706;
                    --text-main: #111827;
                    --text-secondary: #6B7280;
                    --border: #E5E7EB;
                    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    --radius: 20px;
                }
                body {
                    background: var(--bg-page);
                    margin: 0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    -webkit-font-smoothing: antialiased;
                }
                button { cursor: pointer; border: none; outline: none; font-family: inherit; -webkit-tap-highlight-color: transparent; }
            `}</style>
            <style jsx>{`
                .page-container {
                    width: 100%;
                    max-width: 480px; /* Standard mobile width */
                    margin: 0 auto;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background: var(--bg-page);
                    padding-bottom: 24px;
                }
                
                .header-bar {
                    background: var(--bg-card);
                    padding: 20px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    position: sticky;
                    top: 0;
                    z-index: 50;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }
                .back-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: #f9fafb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                .back-btn:active { background: #e5e7eb; }
                .title { font-weight: 700; font-size: 18px; color: var(--text-main); }
                
                .main-content {
                    flex: 1;
                    padding: 24px;
                    padding-top: 40px; /* EXTRA TOP SPACE to separate from Header */
                    padding-bottom: 40px; /* EXTRA BOTTOM SPACE to separate from Footer */
                    display: flex;
                    flex-direction: column;
                    gap: 32px; /* INCREASED GAP to 32px for more breathing room */
                }

                /* CARD STYLES */
                .card {
                    background: var(--bg-card);
                    border-radius: var(--radius);
                    padding: 32px 24px;
                    box-shadow: var(--shadow-md);
                }

                /* STATUS SECTION (UPSCALED) */
                .status-header {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    margin-bottom: 32px;
                }
                
                /*-- GRADIENT RING FOR QUEUE NUMBER (BIGGER) --*/
                .gradient-ring-container {
                    position: relative;
                    width: 160px;
                    height: 160px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 24px;
                }
                .gradient-ring-bg {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    background: conic-gradient(from 0deg, #F59E0B, #FFEDD5, #F59E0B);
                }
                .status-icon-inner {
                    position: absolute;
                    inset: 10px; /* Thickness determined by offset */
                    border-radius: 50%;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: inset 0 4px 6px rgba(0,0,0,0.05);
                }
                
                .status-label {
                    font-size: 24px;
                    font-weight: 800;
                    color: var(--text-main);
                    margin-bottom: 8px;
                    letter-spacing: -0.5px;
                }
                .status-desc {
                    font-size: 16px;
                    color: var(--text-secondary);
                    line-height: 1.5;
                }
                
                /* PROGRESS BAR (UPSCALED) */
                .progress-wrapper {
                    margin-top: 32px;
                }
                .steps-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    position: relative;
                    z-index: 2;
                }
                .step-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    opacity: 0.5;
                    transition: opacity 0.3s;
                }
                .step-item.active { opacity: 1; }
                
                .step-icon {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #F3F4F6;
                    border-radius: 50%;
                    color: #6B7280;
                    margin-bottom: 4px;
                    transition: all 0.3s;
                }
                .step-item.active .step-icon {
                    background: #FEF3C7;
                    color: #D97706;
                    box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2);
                }
                .step-item.completed .step-icon {
                    background: #D1FAE5;
                    color: #059669;
                }

                .step-label {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--text-main);
                }

                .progress-bar-container {
                    height: 8px;
                    background: #E5E7EB;
                    border-radius: 4px;
                    position: relative;
                    margin: 0 12%; 
                    overflow: hidden;
                }
                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899, #F59E0B); /* RGB GEMINI GRADIENT */
                    border-radius: 4px;
                    position: absolute;
                    top: 0;
                    left: 0;
                    box-shadow: 0 0 12px rgba(139, 92, 246, 0.6); /* GLOW EFFECT */
                }

                /* ORDER DETAILS (UPSCALED) */
                .section-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--text-main);
                    margin-bottom: 20px;
                }
                .item-row {
                    display: flex;
                    gap: 16px;
                    padding: 16px 0;
                    border-bottom: 1px solid #F3F4F6;
                }
                .item-row:last-child { border-bottom: none; }
                .item-img {
                    width: 64px;
                    height: 64px;
                    border-radius: 12px;
                    background: #f3f4f6;
                    object-fit: cover;
                }
                .item-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
                .item-name { font-size: 16px; font-weight: 600; color: var(--text-main); margin-bottom: 6px; }
                .item-meta { font-size: 14px; color: var(--text-secondary); display: flex; justify-content: space-between; }
                
                /* FOOTER (UPSCALED) */
                .footer {
                    background: var(--bg-card);
                    padding: 24px;
                    border-top: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    position: sticky;
                    bottom: 0;
                    box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
                }
                .footer-row {
                    display: flex;
                    gap: 16px;
                }
                .btn {
                    height: 56px;
                    border-radius: 16px;
                    font-weight: 700;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.1s;
                }
                .btn:active { transform: scale(0.98); }
                .btn-primary { background: var(--text-main); color: white; width: 100%; box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
                .btn-secondary { background: white; border: 1px solid var(--border); color: var(--text-secondary); font-weight: 600; }
                .btn-danger-ghost { background: transparent; color: #DC2626; font-size: 14px; margin-top: 8px; align-self: center; text-decoration: underline; font-weight: 500; }
                .btn-danger { background: #FEF2F2; color: #DC2626; border: 1px solid #FEE2E2; }
                .btn-red-gradient {
                    background: linear-gradient(90deg, #F87171, #EF4444);
                    color: white;
                    box-shadow: 0 4px 6px rgba(239, 68, 68, 0.4);
                }

                /* MODAL */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.7);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px; /* Safer padding */
                    backdrop-filter: blur(5px);
                }
                .modal-content {
                    background: #FFFFFF !important;
                    position: relative;
                    padding: 32px 24px;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 360px; /* Slightly smaller for mobile card look */
                    max-height: 85vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }

                .cancel-option-card {
                    display: flex;
                    align-items: center;
                    padding: 16px;
                    border: 1.5px solid #E5E7EB;
                    border-radius: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: #FFFFFF;
                    margin-bottom: 12px;
                }
                
                .cancel-option-card.active {
                    border-color: #FCD34D;
                    background: #FFFBEB;
                }
                
                .cancel-icon-bg {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 16px;
                    background: #F3F4F6;
                    color: #4B5563;
                }
                
                .cancel-option-card.active .cancel-icon-bg {
                    background: #FDE68A;
                    color: #B45309;
                }

                .radio-circle {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    border: 2px solid #D1D5DB;
                    margin-left: auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .cancel-option-card.active .radio-circle {
                    border-color: #F59E0B;
                    background: #F59E0B;
                }

                .radio-check {
                    color: white;
                }
                
                .cancel-textarea {
                    width: 100%;
                    box-sizing: border-box; /* Fix width overflow */
                    padding: 16px;
                    border-radius: 16px;
                    border: 1.5px solid #E5E7EB;
                    font-family: inherit;
                    font-size: 14px;
                    resize: none;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .cancel-textarea:focus { border-color: #F59E0B; }
            `}</style>

            {/* HEADER */}
            <div className="header-bar">
                <button className="back-btn" onClick={() => router.back()}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div className="title">Lacak Pesanan</div>
                <button className="back-btn" onClick={handleWhatsAppClick} style={{ color: '#25D366' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                </button>
            </div>

            <motion.div
                style={{
                    flex: 1,
                    padding: '40px 24px', // Explicit Padding
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '32px' // Explicit Gap
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* STATUS CARD */}
                <div className="card" style={{ marginBottom: 32 }}>
                    <div className="status-header">
                        <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 24px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                            {/* Animated RGB Gradient Background - Layer 1 (Blur/Glow) */}
                            <motion.div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    background: 'conic-gradient(from 0deg, #FF0080, #7928CA, #FF0080)',
                                    filter: 'blur(20px)',
                                    opacity: 0.5,
                                    zIndex: 0,
                                }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            />

                            {/* Animated RGB Gradient Background - Layer 2 (Sharp Ring) */}
                            <motion.div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    background: 'conic-gradient(from 0deg, #FF0080, #7928CA, #FF0080)',
                                    zIndex: 1,
                                }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            />

                            {/* Inner White Circle (To create the ring effect) */}
                            <div style={{
                                position: 'absolute',
                                top: 6, // 6px thickness
                                left: 6,
                                right: 6,
                                bottom: 6,
                                background: 'white',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 2,
                                boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                    {orderStatus === 'ready' ? (
                                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" style={{ display: 'block' }}><polyline points="20 6 9 17 4 12" /></svg>
                                    ) : orderStatus === 'cancelled' ? (
                                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" style={{ display: 'block' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    ) : orderStatus === 'preparing' ? (
                                        <motion.svg
                                            width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" style={{ display: 'block' }}
                                            animate={{ scale: [1, 1.15, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" /><line x1="6" y1="17" x2="18" y2="17" />
                                        </motion.svg>
                                    ) : (
                                        <span style={{ fontSize: 72, fontWeight: 800, color: '#111827', letterSpacing: '-2px', lineHeight: 1, display: 'block', marginTop: -4 }}>{queueNumber}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <h2 className="status-label">
                            {orderStatus === 'ready' ? "Pesanan Siap!" :
                                orderStatus === 'preparing' ? "Sedang Disiapkan" :
                                    orderStatus === 'cancelled' ? "Pesanan Dibatalkan" :
                                        "Pesanan Diterima"}
                        </h2>

                        {estimatedTime && orderStatus !== 'cancelled' && orderStatus !== 'ready' && (
                            <div style={{ marginTop: 12, padding: '8px 20px', background: '#F3F4F6', borderRadius: 99, fontSize: 15, fontWeight: 600, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                {estimatedTime}
                            </div>
                        )}
                    </div>

                    {/* PROGRESS BAR (UPSCALED) */}
                    {orderStatus !== 'cancelled' && (
                        <div className="progress-wrapper">
                            <div className="steps-row">
                                {/* Step 1 */}
                                <div className={`step-item ${['received', 'preparing', 'ready'].includes(orderStatus) ? 'active' : ''} ${['preparing', 'ready'].includes(orderStatus) ? 'completed' : ''}`}>
                                    <div
                                        className="step-icon"
                                    >
                                        <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            animate={orderStatus === 'received' ? { scale: [1, 1.2, 1] } : {}}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                        ><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></motion.svg>
                                    </div>
                                    <span className="step-label">Diterima</span>
                                </div>
                                {/* Step 2 */}
                                <div className={`step-item ${['preparing', 'ready'].includes(orderStatus) ? 'active' : ''} ${orderStatus === 'ready' ? 'completed' : ''}`}>
                                    <div
                                        className="step-icon"
                                    >
                                        <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            animate={orderStatus === 'preparing' ? { scale: [1, 1.2, 1] } : {}}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                        ><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" /><line x1="6" y1="17" x2="18" y2="17" /></motion.svg>
                                    </div>
                                    <span className="step-label">Disiapkan</span>
                                </div>
                                {/* Step 3 */}
                                <div className={`step-item ${orderStatus === 'ready' ? 'active' : ''} ${orderStatus === 'ready' ? 'completed' : ''}`}>
                                    <div className="step-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                    <span className="step-label">Siap Saji</span>
                                </div>
                            </div>

                            <div className="progress-bar-container">
                                <motion.div
                                    style={{
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899, #F59E0B, #3B82F6)', // REPEATED FOR FLOW
                                        backgroundSize: '200% 100%', // DOUBLE SIZE FOR FLOW ANIMATION
                                        borderRadius: 4,
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        boxShadow: '0 0 12px rgba(139, 92, 246, 0.6)', // GLOW EFFECT
                                        zIndex: 10
                                    }}
                                    initial={{ width: '0%', backgroundPosition: '0% 50%' }}
                                    animate={{
                                        width: orderStatus === 'received' ? '15%' :
                                            orderStatus === 'preparing' ? '50%' : '100%',
                                        backgroundPosition: ['0% 50%', '100% 50%'] // FLOWING ANIMATION
                                    }}
                                    transition={{
                                        width: { duration: 0.8 },
                                        backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* DETAILS CARD (UPSCALED) */}
                <div className="card">
                    <h3 className="section-title">Rincian Order</h3>
                    <div>
                        {orderItems.map((item, idx) => (
                            <div className="item-row" key={idx}>
                                <img src={item.image || '/assets/placeholder.png'} className="item-img" alt={item.name} />
                                <div className="item-info">
                                    <div className="item-name">{item.name}</div>
                                    <div className="item-meta">
                                        <span>{item.qty}x</span>
                                        <span style={{ fontWeight: 600, color: '#111827' }}>{formatRupiah(item.price)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 24, borderTop: '1px dashed #E5E7EB' }}>
                        <span style={{ fontSize: 16, color: '#6B7280' }}>Total Pembayaran</span>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{formatRupiah(total)}</div>
                            {paymentStatus === 'unpaid' && (
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '4px 10px', borderRadius: 6, display: 'inline-block', marginTop: 4 }}>Belum Dibayar</span>
                            )}
                        </div>
                    </div>

                    {/* QR REFUND */}
                    {(orderStatus === 'cancelled' && paymentStatus === 'paid') && (
                        <div style={{ marginTop: 24, textAlign: 'center', padding: 20, background: '#FEF2F2', borderRadius: 16, border: '1px solid #FEE2E2' }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', marginBottom: 16 }}>Refund Dana</div>
                            <div style={{ background: 'white', padding: 12, display: 'inline-block', borderRadius: 12 }}>
                                <QRCode value={transactionCode} size={140} />
                            </div>
                            <p style={{ fontSize: 14, color: '#991B1B', marginTop: 12 }}>Tunjukkan ke kasir untuk refund</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* FOOTER ACTIONS (UPSCALED) */}
            <div className="footer">
                {paymentStatus === 'unpaid' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* UNPAID: 4 BUTTONS LAYOUT */}
                        <div className="footer-row">
                            <button className="btn btn-secondary" onClick={() => router.push('/saran')} style={{ flex: 1 }}>
                                <span style={{ marginRight: 8, fontSize: 18 }}>💬</span> Saran
                            </button>
                            <button className="btn btn-secondary" style={{ flex: 1, borderColor: '#F59E0B', color: '#B45309' }} onClick={() => router.push('/home')}>
                                Pesan Lagi +
                            </button>
                        </div>
                        <div className="footer-row">
                            <button className="btn btn-secondary" onClick={() => setShowCancelModal(true)} style={{ color: '#DC2626', borderColor: '#FECACA', flex: 1 }}>Batal</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                                const stateParam = encodeURIComponent(JSON.stringify({ items: orderItems, subtotal: total, transactionCode: transactionCode }));
                                router.push(`/Kasir?state=${stateParam}`);
                            }}>Bayar Sekarang</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="footer-row">
                            <button className="btn btn-secondary" onClick={() => router.push('/saran')} style={{ flex: 1 }}>
                                <span style={{ marginRight: 8, fontSize: 18 }}>💬</span> Saran
                            </button>
                            <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => router.push('/home')}>
                                Pesan Lagi +
                            </button>
                        </div>

                        {orderStatus !== 'cancelled' && orderStatus !== 'ready' && cancellationStatus !== 'RejectedByAdmin' && (
                            <button
                                className="btn-danger-ghost"
                                disabled={cancellationStatus === 'Requested'}
                                style={{ opacity: cancellationStatus === 'Requested' ? 0.5 : 1 }}
                                onClick={() => setShowCancelModal(true)}
                            >
                                {cancellationStatus === 'Requested' ? "Menunggu Konfirmasi..." : "Ingin membatalkan pesanan?"}
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* MASTER UI/UX CANCEL MODAL */}
            <AnimatePresence>
                {showCancelModal && (
                    <div className="modal-overlay" style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        backdropFilter: 'blur(5px)'
                    }}>
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{
                                backgroundColor: '#FFFFFF',
                                position: 'relative',
                                padding: '24px',
                                borderRadius: '24px',
                                width: '100%',
                                maxWidth: '340px',
                                maxHeight: '80vh',
                                overflowY: 'auto',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                color: '#1F2937' // Force text color inheritance
                            }}
                        >
                            <button
                                onClick={() => setShowCancelModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: 16,
                                    right: 16,
                                    background: '#F3F4F6',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 36,
                                    height: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#4B5563',
                                    cursor: 'pointer',
                                    zIndex: 10
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>

                            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1F2937', textAlign: 'center', letterSpacing: '-0.5px', marginTop: 12 }}>
                                Kenapa membatalkan pesanan?
                            </h3>
                            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 24, textAlign: 'center', lineHeight: 1.5 }}>
                                Masukanmu membantu kami menjadi lebih baik.
                            </p>

                            <div style={{ marginBottom: 24 }}>
                                {cancelOptions.map(option => (
                                    <div
                                        key={option.id}
                                        className={`cancel-option-card ${selectedReason === option.label ? 'active' : ''}`}
                                        onClick={() => setSelectedReason(option.label)}
                                    >
                                        <div className="cancel-icon-bg">
                                            {option.icon}
                                        </div>
                                        <span style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{option.label}</span>
                                        <div className="radio-circle">
                                            {selectedReason === option.label && (
                                                <svg className="radio-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                                    Alasan Lainnya (Opsional)
                                </label>
                                <textarea
                                    className="cancel-textarea"
                                    placeholder="Tulis alasanmu..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    className="btn btn-secondary"
                                    style={{ flex: 1, height: 50, borderRadius: 14, background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#6B7280' }}
                                    onClick={() => setShowCancelModal(false)}
                                >
                                    Batal
                                </button>
                                <button
                                    className="btn btn-red-gradient"
                                    style={{ flex: 2, height: 50, borderRadius: 14, fontWeight: 700, fontSize: 16 }}
                                    onClick={handleCancelSubmit}
                                >
                                    {isCancelling ? "Mengirim..." : "Kirim & Batalkan"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
