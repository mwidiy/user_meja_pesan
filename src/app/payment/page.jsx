'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

// Skeleton Component moved outside to prevent re-creation on render
const SkeletonLine = ({ width = "100%", height = "20px" }) => (
    <div style={{ width, height, background: 'linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', borderRadius: '6px', animation: 'shimmer 1.5s infinite' }} />
);

export default function PaymentPage() {
    const router = useRouter();
    const [orderState, setOrderState] = useState({ items: [], subtotal: 0, orderType: 'dinein', location: '', notes: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('qris');
    const [showSummary, setShowSummary] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const isSubmittingRef = useRef(false); // Security: Synchronous ref for lock


    useEffect(() => {
        // --- SECURITY: ROUTE GUARD ---
        try {
            const raw = sessionStorage.getItem('payment_state');
            if (!raw) {
                router.replace('/home'); // Guard: No Access without state
                return;
            }
        } catch (e) { router.replace('/home'); return; }

        // Simulate "Network" loading for skeleton effect
        const timer = setTimeout(() => setIsLoading(false), 800);

        try {
            // Security: Read from sessionStorage instead of URL
            const raw = sessionStorage.getItem('payment_state');
            if (raw) {
                const parsed = JSON.parse(raw);
                // Security: Validate items & sanitize strings
                const items = (Array.isArray(parsed.items) ? parsed.items : [])
                    .filter(it => it.id && typeof it.price === 'number' && it.price >= 0)
                    .map(it => ({
                        ...it,
                        qty: Math.min(Math.max(parseInt(it.qty) || 0, 0), 99),
                        price: Math.max(0, Number(it.price) || 0),
                        name: String(it.name || 'Item').substring(0, 50).replace(/[<>&"']/g, ''),
                    }));

                const subtotal = parsed.subtotal ?? items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);

                // Extract extra fields with sanitization
                const orderType = parsed.orderType || 'dinein';
                const location = String(parsed.location || '').substring(0, 100).replace(/[<>]/g, '');
                const notes = String(parsed.notes || '').substring(0, 100).replace(/[<>{}]/g, ''); // Stricter sanitization

                // Security: Whitelist orderType
                const VALID_ORDER_TYPES = ['dinein', 'takeaway', 'delivery'];
                const safeOrderType = VALID_ORDER_TYPES.includes(orderType) ? orderType : 'dinein';

                // Security: Client-side recalculation of subtotal (never trust passed subtotal)
                const safeSubtotal = items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);

                // Fix: Wrap state update in setTimeout to avoid "setState during render" warning/error
                setTimeout(() => {
                    setOrderState({ items, subtotal: safeSubtotal, orderType: safeOrderType, location, notes });
                }, 0);

                // Clean up
                // sessionStorage.removeItem('payment_state'); // REMOVED: Keep state for refresh/strict-mode
            }
        } catch (e) {
            if (process.env.NODE_ENV !== 'production') console.error("State parsing error", e);
        }
        return () => clearTimeout(timer);
    }, []);

    const formatRupiah = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');

    const handlePay = async () => {
        if (isSubmittingRef.current) return;

        // Security: Guard against empty cart
        if (!orderState.items || orderState.items.length === 0) {
            alert("Keranjang kosong. Silakan pilih menu terlebih dahulu.");
            router.push('/home'); // Redirect to home
            return;
        }

        // Security: Whitelist payment method
        const VALID_METHODS = ['qris', 'cash'];
        if (!VALID_METHODS.includes(selectedMethod)) {
            alert("Metode pembayaran tidak valid.");
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const storedName = localStorage.getItem('customerName');
            const storedTable = localStorage.getItem('customer_table');

            // Security: Sanitize customerName (Max 20 chars, no special chars)
            const finalName = (storedName && storedName.trim())
                ? String(storedName).substring(0, 20).replace(/[<>{}\[\]\\;`$'"]/g, '').trim() || "Pelanggan Tanpa Nama"
                : "Pelanggan Tanpa Nama";

            let finalTableId = null;
            let finalStoreId = orderState.storeId || null;

            if (storedTable) {
                try {
                    const parsedTable = JSON.parse(storedTable);
                    // Security: Validate IDs are positive integers
                    if (parsedTable?.id) finalTableId = Math.max(0, parseInt(parsedTable.id, 10)) || null;
                    if (!finalStoreId && parsedTable?.location?.storeId) {
                        finalStoreId = Math.max(0, parseInt(parsedTable.location.storeId, 10)) || null;
                    }
                } catch (e) { /* ignore */ }
            }

            const payload = {
                customerName: finalName,
                tableId: finalTableId,
                storeId: finalStoreId,
                items: orderState.items.map(item => ({
                    productId: item.id,
                    quantity: item.qty,
                    price: item.price
                })),
                totalAmount: orderState.subtotal,
                paymentMethod: selectedMethod,
                paymentStatus: 'Unpaid',
                orderType: orderState.orderType,
                note: orderState.notes,
                deliveryAddress: orderState.orderType === 'delivery' ? orderState.location : null
            };

            const response = await createOrder(payload);

            const finalState = {
                ...orderState,
                method: selectedMethod,
                transactionCode: response.data.transactionCode,
                orderId: response.data.id
            };

            // Security: Use sessionStorage instead of URL
            try { sessionStorage.setItem('post_payment_state', JSON.stringify(finalState)); } catch (e) { }

            const orderIdParam = response.data?.id ? `?orderId=${response.data.id}` : '';

            if (selectedMethod === 'qris') {
                router.push(`/Qris${orderIdParam}`);
            } else {
                router.push(`/order${orderIdParam}`);
            }

        } catch (error) {
            if (process.env.NODE_ENV !== 'production') console.error("Payment submission failed", error);

            // --- SECURITY FIX: PRIORITY 1 (ANTI BYPASS QR) ---
            // If the backend rejects the order (e.g., fake storeId/tableId injected via DevTools), 
            // we immediately destroy their session and kick them to the landing page.
            alert(`Pesanan ditolak oleh server: ${error.message || 'Gagal memproses pesanan'}\nSesi Anda akan direset.`);
            try {
                localStorage.removeItem('customer_table');
                sessionStorage.removeItem('payment_state');
                sessionStorage.removeItem('checkout_state');
            } catch (e) { }

            router.replace('/');

            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    const handleBack = () => {
        // Security: Use sessionStorage to pass state back
        if (orderState.items.length) {
            try { sessionStorage.setItem('checkout_state', JSON.stringify(orderState)); } catch (e) { }
        }
        router.push('/checkout');
    };

    const subtotal = orderState.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0) || orderState.subtotal || 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="payment-container"
        >
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
                
                :root {
                    --bg-page: #F3F4F6;
                    --card-bg: #FFFFFF;
                    --text-main: #1F2937;
                    --text-sec: #6B7280;
                    --primary: #FACC15;
                    --primary-dark: #EAB308;
                    --accent: #3B82F6;
                    --success: #10B981;
                    --danger: #EF4444;
                }

                * { box-sizing: border-box; font-family: 'Poppins', sans-serif; -webkit-tap-highlight-color: transparent; }
                body { margin: 0; background: var(--bg-page); color: var(--text-main); overflow-x: hidden; }

                @keyframes shimmer { 
                    0% { background-position: 200% 0; } 
                    100% { background-position: -200% 0; } 
                }

                .payment-container {
                    max-width: 480px;
                    margin: 0 auto;
                    min-height: 100vh;
                    background: var(--bg-page);
                    padding-bottom: 120px;
                    position: relative;
                }

                /* Glass Header */
                .header {
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center; /* Center content */
                    position: sticky;
                    top: 0;
                    z-index: 40;
                    background: rgba(243, 244, 246, 0.8);
                    backdrop-filter: blur(12px);
                }
                .back-btn {
                    position: absolute;
                    left: 20px;
                    width: 44px;
                    height: 44px;
                    border-radius: 14px;
                    border: 1px solid rgba(0,0,0,0.05);
                    background: #FFFFFF;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.03); /* Match checkout shadow */
                    color: var(--text-main);
                    z-index: 20;
                }
                .header-title {
                    font-size: 1.25rem; font-weight: 700; 
                    color: var(--text-main);
                    text-align: center;
                    margin: 0;
                }

                /* Methods Section */
                .section-title {
                    padding: 0 24px; margin: 24px 0 16px;
                    font-size: 1.1rem; font-weight: 700; color: var(--text-main);
                }
                .methods-list { padding: 0 20px; display: flex; flex-direction: column; gap: 16px; }
                
                .method-card {
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 20px;
                    display: flex; align-items: center; gap: 16px;
                    position: relative; overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
                    border: 2px solid transparent;
                    cursor: pointer;
                }
                
                .method-icon-wrap {
                    width: 60px; height: 60px; border-radius: 18px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                    background: #F9FAFB;
                }
                .method-icon-wrap img { width: 32px; height: 32px; object-fit: contain; }
                
                .label-badge {
                    display: inline-block; padding: 4px 10px; border-radius: 20px;
                    background: #FEF9C3; color: #854D0E; font-size: 0.75rem; font-weight: 600;
                    margin-bottom: 6px;
                }

                .radio-outer {
                    width: 24px; height: 24px; border-radius: 50%;
                    border: 2px solid #E5E7EB;
                    display: flex; align-items: center; justify-content: center;
                    transition: border-color 0.2s;
                }
                .radio-inner {
                    width: 12px; height: 12px; border-radius: 50%;
                    background: var(--primary-dark);
                }

                /* Bottom Action */
                .bottom-action-container {
                    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
                    width: 100%; max-width: 480px;
                    padding: 0 20px 24px;
                    background: linear-gradient(to top, var(--bg-page) 80%, transparent);
                    z-index: 50;
                    pointer-events: none; /* Let clicks pass through gradient area */
                }
                .bottom-card {
                    background: var(--card-bg);
                    border-radius: 28px;
                    padding: 20px;
                    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15);
                    pointer-events: auto;
                    display: flex; flex-direction: column; gap: 16px;
                }
                
                .total-row {
                    display: flex; justify-content: space-between; align-items: center;
                    font-size: 1rem; color: var(--text-sec);
                    cursor: pointer;
                }
                .total-price { font-size: 1.25rem; font-weight: 700; color: var(--text-main); }
                
                .pay-btn {
                    width: 100%; padding: 18px;
                    background: var(--primary);
                    border: none; border-radius: 20px;
                    font-size: 1.1rem; font-weight: 700; color: #1F2937;
                    cursor: pointer;
                    box-shadow: 0 8px 20px rgba(250, 204, 21, 0.25);
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                }
                .pay-btn:disabled { opacity: 0.7; filter: grayscale(0.5); cursor: not-allowed; }

                /* Modal Sheet */
                .modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
                    z-index: 60; display: flex; align-items: flex-end; justify-content: center;
                    backdrop-filter: blur(4px);
                }
                .modal-sheet {
                    background: var(--card-bg); width: 100%; max-width: 480px;
                    border-radius: 32px 32px 0 0; padding: 24px;
                    position: relative;
                }
                .drag-handle {
                    width: 40px; height: 5px; background: #E5E7EB;
                    border-radius: 10px; margin: 0 auto 24px;
                }
                .receipt-item {
                    display: flex; justify-content: space-between;
                    margin-bottom: 12px; font-size: 0.95rem; color: var(--text-sec);
                }
                .receipt-divider { border-top: 1px dashed #E5E7EB; margin: 16px 0; }
                .receipt-total {
                    display: flex; justify-content: space-between;
                    font-size: 1.1rem; font-weight: 700; color: var(--text-main);
                }

            `}</style>



            <header className="header">
                <motion.button
                    whileTap={{ scale: 0.92 }}
                    className="back-btn"
                    onClick={handleBack}
                >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                </motion.button>
                <span className="header-title">Pembayaran</span>
            </header>

            {isLoading ? (
                <div style={{ padding: '20px' }}>
                    <SkeletonLine width="40%" height="24px" />
                    <div style={{ margin: '20px 0' }}>
                        <SkeletonLine height="100px" />
                    </div>
                    <div style={{ margin: '20px 0' }}>
                        <SkeletonLine height="100px" />
                    </div>
                </div>
            ) : (
                <div className="methods-list">
                    <div className="section-title">Metode Pembayaran</div>

                    {/* QRIS Card */}
                    <motion.div
                        className="method-card"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedMethod('qris')}
                        animate={{
                            borderColor: selectedMethod === 'qris' ? '#FACC15' : 'transparent',
                            backgroundColor: selectedMethod === 'qris' ? '#FEFCE8' : '#FFFFFF'
                        }}
                    >
                        <div className="method-icon-wrap" style={{ background: '#EFF6FF' }}>
                            <img src="/assets/Icon_Qris.svg" alt="QRIS" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>QRIS</span>
                                <span className="label-badge">Recommended</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-sec)', marginTop: 4 }}>
                                Scan & Bayar (GoPay, OVO, Dana)
                            </div>
                        </div>
                        <div className="radio-outer" style={{ borderColor: selectedMethod === 'qris' ? '#EAB308' : '#D1D5DB' }}>
                            {selectedMethod === 'qris' && <motion.div layoutId="radio" className="radio-inner" />}
                        </div>
                    </motion.div>

                    {/* Cash Card */}
                    <motion.div
                        className="method-card"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedMethod('cash')}
                        animate={{
                            borderColor: selectedMethod === 'cash' ? '#FACC15' : 'transparent',
                            backgroundColor: selectedMethod === 'cash' ? '#FEFCE8' : '#FFFFFF'
                        }}
                    >
                        <div className="method-icon-wrap" style={{ background: '#FEF2F2' }}>
                            <img src="/assets/Icon_Kasir.svg" alt="Tunai" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Cash</span>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-sec)', marginTop: 4 }}>
                                Bayar tunai setelah pesanan siap
                            </div>
                        </div>
                        <div className="radio-outer" style={{ borderColor: selectedMethod === 'cash' ? '#EAB308' : '#D1D5DB' }}>
                            {selectedMethod === 'cash' && <motion.div layoutId="radio" className="radio-inner" />}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Bottom Floating Action */}
            <div className="bottom-action-container">
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="bottom-card"
                >
                    <div className="total-row" onClick={() => setShowSummary(true)}>
                        <span>Total Pembayaran</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="total-price">{formatRupiah(subtotal)}</span>
                            <span style={{ fontSize: '0.8rem', transform: 'rotate(-90deg)' }}>›</span>
                        </div>
                    </div>

                    <motion.button
                        className="pay-btn"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handlePay}
                        disabled={isSubmitting || isLoading}
                    >
                        {isSubmitting ? (
                            <span>Memproses...</span>
                        ) : (
                            <>
                                <span>Bayar Sekarang</span>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </>
                        )}
                    </motion.button>
                </motion.div>
            </div>

            {/* Receipt Modal */}
            <AnimatePresence>
                {showSummary && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="modal-overlay" onClick={() => setShowSummary(false)}
                        />
                        <motion.div
                            className="modal-sheet"
                            style={{ position: 'fixed', bottom: 0, zIndex: 70, left: '50%', translateX: '-50%' }}
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
                            onDragEnd={(_, info) => { if (info.offset.y > 100) setShowSummary(false); }}
                        >
                            <div className="drag-handle" />
                            <h3 style={{ marginBottom: 20, fontSize: '1.2rem', fontWeight: 700 }}>Rincian Pesanan</h3>

                            <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                                {orderState.items.map((item, idx) => (
                                    <div key={idx} className="receipt-item">
                                        <span style={{ flex: 1 }}>{item.qty}x {item.name}</span>
                                        <span style={{ fontWeight: 600 }}>{formatRupiah(item.price * item.qty)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="receipt-divider" />

                            <div className="receipt-item">
                                <span>Subtotal</span>
                                <span>{formatRupiah(subtotal)}</span>
                            </div>
                            <div className="receipt-item">
                                <span>Pajak & Layanan</span>
                                <span>Rp 0</span>
                            </div>

                            <div className="receipt-divider" style={{ borderTopStyle: 'solid' }} />

                            <div className="receipt-total">
                                <span>Total Tagihan</span>
                                <span style={{ color: 'var(--danger)' }}>{formatRupiah(subtotal)}</span>
                            </div>

                            <button
                                onClick={() => setShowSummary(false)}
                                style={{
                                    width: '100%', padding: '16px', marginTop: 24, borderRadius: '16px',
                                    border: '1px solid #E5E7EB', background: '#F9FAFB', fontWeight: 600,
                                    color: 'var(--text-main)', cursor: 'pointer'
                                }}
                            >
                                Tutup Rincian
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
