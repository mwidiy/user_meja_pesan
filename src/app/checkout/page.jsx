'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder, getImageUrl, getProducts } from '../../services/api';

export default function CheckoutPage() {
    const router = useRouter();
    const [notesOpen, setNotesOpen] = useState(false);
    const [checkoutState, setCheckoutState] = useState({ items: [], subtotal: 0 });
    const [orderType, setOrderTypeState] = useState('dinein');
    const [location, setLocation] = useState('');
    const locationInputRef = useRef(null);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [locationDraft, setLocationDraft] = useState('');
    const [notes, setNotes] = useState('');
    const [notesDraft, setNotesDraft] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- SMART UPSELL STATE ---
    const [allProducts, setAllProducts] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [upsellTitle, setUpsellTitle] = useState('Teman Makan Enak');
    const [upsellEmoji, setUpsellEmoji] = useState('🍟');

    // Haptic Feedback
    const vibrate = (ms = 10) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(ms);
        }
    };

    // Load state & Fetch Products
    useEffect(() => {
        // --- SECURITY: ROUTE GUARD ---
        const guardCheckout = () => {
            try {
                // Check if we have valid checkout state
                const raw = sessionStorage.getItem('checkout_state');
                if (!raw) {
                    if (process.env.NODE_ENV !== 'production') console.warn("Access Denied: No checkout state");
                    router.replace('/home'); // Use replace to prevent back-button loops
                    return false;
                }
                const parsed = JSON.parse(raw);
                if (!parsed.items || parsed.items.length === 0) {
                    if (process.env.NODE_ENV !== 'production') console.warn("Access Denied: Empty cart");
                    router.replace('/home');
                    return false;
                }
                return true;
            } catch (e) {
                router.replace('/home');
                return false;
            }
        };

        if (!guardCheckout()) return;

        try {
            // Security: Read from sessionStorage instead of URL to prevent manipulation
            const raw = sessionStorage.getItem('checkout_state');
            if (raw) {
                const parsed = JSON.parse(raw);
                // Security: Validate & sanitize items
                const items = (Array.isArray(parsed.items) ? parsed.items : [])
                    .filter(it => it.id && typeof it.price === 'number' && it.price >= 0)
                    .map(it => ({
                        ...it,
                        qty: Math.min(Math.max(parseInt(it.qty) || 0, 0), 99),
                        price: Math.max(0, Number(it.price) || 0),
                        name: String(it.name || 'Item').substring(0, 50).replace(/[<>&"']/g, ''),
                    }));

                const subtotal = parsed.subtotal ?? items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);
                setCheckoutState({ items, subtotal });
                if (parsed.orderType) setOrderTypeState(parsed.orderType);
                if (parsed.location) setLocation(parsed.location);

                // Clean up after reading
                // sessionStorage.removeItem('checkout_state'); // REMOVED: Keep state for refresh/strict-mode
            }
        } catch (e) { }
        try {
            const saved = localStorage.getItem('checkout_location_v1');
            // Security: Sanitize location from storage
            if (saved && !location) {
                const safeLocation = String(saved).substring(0, 100).replace(/[<>{}()[\]\\;`$]/g, '');
                setLocation(safeLocation);
            }
        } catch (e) { }

        const fetchRecommendations = async () => {
            let storeId = null;
            try {
                const storedTable = localStorage.getItem('customer_table');
                if (storedTable) {
                    const parsed = JSON.parse(storedTable);
                    // Security: Validate structure
                    if (parsed && typeof parsed === 'object' && parsed.location?.storeId) {
                        storeId = parseInt(parsed.location.storeId) || null;
                    }
                }
            } catch (e) { }

            try {
                const rawData = await getProducts(storeId);
                if (Array.isArray(rawData)) {
                    setAllProducts(rawData);
                } else if (rawData && Array.isArray(rawData.data)) {
                    setAllProducts(rawData.data);
                } else if (rawData && Array.isArray(rawData.products)) {
                    setAllProducts(rawData.products);
                } else {
                    setAllProducts([]);
                }
            } catch (err) {
                setAllProducts([]);
            }
        };
        fetchRecommendations();
    }, []);

    // --- SMART RECOMMENDATION ENGINE ---
    useEffect(() => {
        if (!allProducts || !Array.isArray(allProducts) || allProducts.length === 0) return;

        let foodCount = 0;
        let drinkCount = 0;
        const cartIds = new Set(checkoutState.items.map(i => i.id));

        checkoutState.items.forEach(item => {
            const name = (item.name || '').toLowerCase();
            const cat = (item.category || '').toLowerCase();
            const isFood = cat.includes('makan') || cat.includes('dish') || name.includes('nasi') || name.includes('mie') || name.includes('ayam');
            const isDrink = cat.includes('minum') || cat.includes('drink') || name.includes('es ') || name.includes('teh') || name.includes('kopi');
            if (isFood) foodCount += item.qty;
            if (isDrink) drinkCount += item.qty;
        });

        let targetStrategy = 'random';
        let title = 'Mungkin Kamu Suka';
        let emoji = '🤩';

        if (foodCount > 0 && drinkCount === 0) {
            targetStrategy = 'drink';
            title = 'Seret Bos? Minum Dulu!';
            emoji = '🥤';
        } else if (drinkCount > 0 && foodCount === 0) {
            targetStrategy = 'food';
            title = 'Laper? Sekalian Makan!';
            emoji = '🍛';
        } else if (foodCount > 0 && drinkCount > 0) {
            targetStrategy = 'snack';
            title = 'Tambah Cemilan Asik?';
            emoji = '🍟';
        }

        let candidates = allProducts.filter(p => !cartIds.has(p.id) && (p.isActive !== false));
        let filtered = [];

        const isMatch = (p, type) => {
            const name = (p.name || '').toLowerCase();
            const cat = (p.category || '').toLowerCase();
            if (type === 'drink') return cat.includes('minum') || cat.includes('drink') || name.includes('es ') || name.includes('teh') || name.includes('kopi') || name.includes('ice');
            if (type === 'food') return cat.includes('makan') || cat.includes('food') || name.includes('nasi') || name.includes('mie') || name.includes('ayam') || name.includes('soto');
            if (type === 'snack') return cat.includes('snack') || cat.includes('cemil') || name.includes('kentang') || name.includes('roti') || name.includes('pisang') || name.includes('dimsum');
            return false;
        };

        if (targetStrategy !== 'random') filtered = candidates.filter(p => isMatch(p, targetStrategy));
        if (filtered.length === 0) {
            filtered = candidates;
            title = 'Teman Makan Enak';
            emoji = '🔥';
        }


        const finalRecommendations = filtered
            .sort((a, b) => {
                const hasImgA = !!(a.image || a.imgFile);
                const hasImgB = !!(b.image || b.imgFile);
                if (hasImgA && !hasImgB) return -1;
                if (!hasImgA && hasImgB) return 1;
                return 0.5 - Math.random();
            })
            .slice(0, 5);

        setRecommendations(finalRecommendations);
        setUpsellTitle(title);
        setUpsellEmoji(emoji);

    }, [checkoutState.items, allProducts]);

    const recalcSubtotal = (items) => items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);

    const changeQty = (index, delta) => {
        vibrate(10);
        setCheckoutState(prev => {
            const items = [...prev.items];
            const it = items[index];
            if (!it) return prev;
            const next = (it.qty || 0) + delta;
            if (next <= 0) items.splice(index, 1);
            else items[index] = { ...it, qty: Math.min(next, 99) }; // Cap at 99
            return { items, subtotal: recalcSubtotal(items) };
        });
    };

    const addAddon = (item) => {
        vibrate(15);
        setCheckoutState(prev => {
            const items = [...prev.items];
            const existing = items.find(i => i.id === item.id);
            if (existing) {
                existing.qty = Math.min((existing.qty || 0) + 1, 99); // Cap at 99
            } else {
                items.push({
                    id: item.id,
                    name: String(item.name || 'Item').substring(0, 50).replace(/[<>&"']/g, ''),
                    price: Math.max(0, Number(item.price) || 0),
                    qty: 1,
                    image: item.image || item.imgFile,
                    category: String(item.category || '').substring(0, 30)
                });
            }
            return { items, subtotal: recalcSubtotal(items) };
        });
    };

    const setOrderType = (type) => {
        vibrate(10);
        setOrderTypeState(type);
        setCheckoutState(prev => ({ ...prev, orderType: type }));
        if (type === 'delivery') setTimeout(() => locationInputRef.current?.focus(), 80);
    };

    const openLocationModal = () => { setLocationDraft(location || ''); setLocationModalOpen(true); vibrate(); };
    const saveLocationFromModal = () => {
        setLocation(locationDraft);
        setCheckoutState(prev => ({ ...prev, location: locationDraft }));
        try { localStorage.setItem('checkout_location_v1', locationDraft); } catch (e) { }
        setLocationModalOpen(false); vibrate();
    };
    const openNotesModal = () => { setNotesDraft(notes || ''); setNotesOpen(true); vibrate(); };
    const saveNotes = () => {
        setNotes(notesDraft);
        setNotesOpen(false); vibrate();
    };

    const handleOrderNow = () => {
        vibrate(20);
        if (!checkoutState.items || checkoutState.items.length === 0) {
            alert('Belum ada pesanan.');
            return;
        }
        if (orderType === 'delivery' && (!location || !location.trim())) {
            alert('Mohon masukkan lokasi antar.');
            openLocationModal();
            return;
        }

        let storeId = null;
        try {
            const storedTable = localStorage.getItem('customer_table');
            if (storedTable) {
                const parsed = JSON.parse(storedTable);
                if (parsed && typeof parsed === 'object' && parsed.location?.storeId) {
                    storeId = parseInt(parsed.location.storeId) || null;
                }
            }
        } catch (e) { }

        const stateData = {
            items: checkoutState.items,
            subtotal: checkoutState.subtotal,
            orderType: orderType,
            location: orderType === 'delivery' ? location : null,
            notes: notes,
            storeId: storeId
        };
        // Security: Use sessionStorage instead of URL for state transfer
        try { sessionStorage.setItem('payment_state', JSON.stringify(stateData)); } catch (e) { }
        router.push('/payment');
    };

    const formatRupiah = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');
    const finalTotal = checkoutState.subtotal;

    return (
        <>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
                
                :root {
                    --primary: #FACC15; /* Yellow Original */
                    --primary-dark: #EAB308;
                    --primary-soft: #FEFCE8;
                    --text-main: #111827;
                    --text-sec: #6B7280;
                    --bg-page: #FAFAFA;
                    --card-bg: #FFFFFF;
                    --accent-red: #EF4444;
                    --shadow-soft: 0 2px 10px rgba(0,0,0,0.03);
                    --shadow-float: 0 8px 24px rgba(0,0,0,0.06);
                }
                * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
                body { margin: 0; font-family: 'Outfit', sans-serif; background: var(--bg-page); color: var(--text-main); }
                
                /* FIXED: COMPACT CENTERED CONTAINER WITH MARGINS */
                .checkout-container { 
                    width: 100%;
                    max-width: 480px; 
                    margin: 0 auto; /* Force Center */
                    min-height: 100vh; 
                    padding: 24px 24px; /* Increased side padding for "margin" effect */
                    padding-bottom: 120px; /* Space for float bar */
                    box-sizing: border-box;
                    background: var(--bg-page);
                }
                
                /* --- Header (Compact) --- */
                .page-header { 
                    display: flex; align-items: center; margin-bottom: 24px; 
                    position: sticky; top: 0; z-index: 40; padding: 12px 0; 
                    background: rgba(250,250,250,0.9); backdrop-filter: blur(8px); 
                    margin-left: -4px; margin-right: -4px; /* Slight overflow for header play */
                }
                .btn-icon { 
                    width: 40px; height: 40px; 
                    border-radius: 12px; border: 1px solid rgba(0,0,0,0.05); 
                    background: white; display: flex; align-items: center; justify-content: center; 
                    cursor: pointer; box-shadow: var(--shadow-soft); color: var(--text-main); 
                }
                .btn-icon:active { transform: scale(0.92); }
                .page-title { flex: 1; text-align: center; font-size: 1.05rem; font-weight: 700; }

                /* --- Order Type (Compact) --- */
                .segment-control { 
                    background: #F3F4F6; padding: 4px; border-radius: 16px; 
                    display: grid; grid-template-columns: 1fr 1fr 1fr; 
                    position: relative; margin-bottom: 24px; 
                }
                .segment-btn { 
                    border: none; background: transparent; padding: 10px; 
                    font-weight: 600; font-size: 0.8rem; 
                    color: var(--text-sec); cursor: pointer; position: relative; z-index: 2; 
                    display: flex; flex-direction: column; align-items: center; gap: 4px; 
                    border-radius: 12px; 
                }
                .segment-btn.active { color: var(--text-main); }
                .segment-indicator { 
                    position: absolute; top: 4px; bottom: 4px; background: white; 
                    border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); 
                    transition: left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); z-index: 1; 
                    width: calc(33.33% - 5.33px); 
                }
                .pos-0 { left: 4px; } 
                .pos-1 { left: calc(33.33% + 1.33px); } 
                .pos-2 { left: calc(66.66% - 1.33px); }

                /* --- Receipt Card (Compact) --- */
                .receipt-card { 
                    background: white; border-radius: 20px; padding: 20px; 
                    box-shadow: var(--shadow-soft); margin-bottom: 24px;
                }
                .receipt-header { 
                    display: flex; justify-content: space-between; align-items: center; 
                    margin-bottom: 16px; border-bottom: 1px dashed #F3F4F6; padding-bottom: 12px; 
                }
                .receipt-brand { font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; }
                .receipt-date { font-size: 0.75rem; color: var(--text-sec); }

                /* List Item (Compact) */
                .menu-item { display: flex; gap: 14px; margin-bottom: 16px; align-items: center; }
                .menu-thumb { 
                    width: 52px; height: 52px; 
                    border-radius: 14px; object-fit: cover; background: #eee; 
                }
                .menu-details { flex: 1; min-width: 0; }
                .menu-name { 
                    font-weight: 700; font-size: 0.9rem; line-height: 1.2; 
                    margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
                }
                .menu-price { font-weight: 500; font-size: 0.85rem; color: var(--text-sec); }
                
                /* Qty Control (Compact) */
                .qty-control { 
                    display: flex; align-items: center; background: #F9FAFB; 
                    border-radius: 8px; padding: 2px; border: 1px solid #E5E7EB; 
                    height: 32px;
                }
                .qty-btn { 
                    width: 28px; height: 28px; 
                    display: flex; align-items: center; justify-content: center; border: none; 
                    background: white; border-radius: 6px; box-shadow: 0 1px 1px rgba(0,0,0,0.05); 
                    cursor: pointer; font-size: 0.9rem; font-weight: 700;
                }
                .qty-display { width: 24px; text-align: center; font-size: 0.85rem; font-weight: 600; }

                /* Receipt Summary */
                .bill-row { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px; color: var(--text-sec); }
                .bill-total { 
                    display: flex; justify-content: space-between; margin-top: 14px; padding-top: 14px; 
                    border-top: 1px dashed #F3F4F6; 
                }
                .total-label { font-weight: 700; font-size: 1rem; }
                .total-value { font-weight: 800; font-size: 1.1rem; color: var(--text-main); }

                /* --- Actions (Compact Grid) --- */
                .action-row { 
                    display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; 
                }
                .action-chip { 
                    background: white; border: 1px solid #E5E7EB; border-radius: 16px; 
                    padding: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; 
                    transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .action-chip:active { transform: scale(0.98); background: #F9FAFB; }
                .chip-icon { color: #F59E0B; font-size: 1.2rem; }
                .chip-text { display: flex; flex-direction: column; overflow: hidden; }
                .chip-label { font-size: 0.7rem; color: var(--text-sec); font-weight: 600; text-transform: uppercase; }
                .chip-val { font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

                /* --- Upsell (Compact Horizontal) --- */
                .upsell-section { margin-bottom: 24px; }
                .section-title { font-weight: 700; font-size: 1rem; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
                .upsell-scroll { 
                    display: flex; overflow-x: auto; gap: 12px; padding-bottom: 8px; padding-left: 2px;
                    scroll-snap-type: x mandatory; -ms-overflow-style: none; scrollbar-width: none; 
                }
                .upsell-scroll::-webkit-scrollbar { display: none; }
                .upsell-card { 
                    min-width: 130px; max-width: 130px; 
                    scroll-snap-align: start; background: white; border-radius: 16px; 
                    padding: 10px; box-shadow: var(--shadow-soft); display: flex; flex-direction: column; 
                    gap: 8px; border: 1px solid rgba(0,0,0,0.02); 
                }
                .upsell-img { width: 100%; height: 90px; border-radius: 12px; object-fit: cover; background: #f0f0f0; }
                .upsell-name { font-weight: 600; font-size: 0.8rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .upsell-price { font-size: 0.75rem; color: var(--text-sec); font-weight: 500; }
                .btnAdd { 
                    width: 100%; background: var(--primary-soft); color: #B45309; font-weight: 700; 
                    border: none; padding: 8px; border-radius: 10px; cursor: pointer; font-size: 0.8rem; 
                }

                /* --- Bottom Float Bar (Centered) --- */
                .float-bar { 
                    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); 
                    width: calc(100% - 48px); /* Match padding of container (24px * 2) */
                    max-width: 432px; /* 480px - 48px padding */
                    background: #111827; border-radius: 20px; padding: 8px 8px 8px 24px; 
                    display: flex; align-items: center; justify-content: space-between;
                    box-shadow: 0 8px 24px rgba(17, 24, 39, 0.3); z-index: 100;
                }
                .bar-info { display: flex; flex-direction: column; }
                .bar-label { font-size: 0.7rem; color: rgba(255,255,255,0.6); font-weight: 600; }
                .bar-total { font-size: 1.05rem; color: white; font-weight: 700; }
                .bar-btn { 
                    background: var(--primary); color: #111827; border: none; padding: 12px 24px; 
                    border-radius: 16px; font-weight: 700; font-size: 0.95rem; cursor: pointer; 
                }

                /* Empty State */
                .empty-block { text-align: center; padding: 40px 20px; opacity: 0.6; }
                .empty-icon { font-size: 3rem; margin-bottom: 12px; display: block; }

                /* Modals */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
                .modal-content { background: white; width: 100%; max-width: 480px; border-radius: 24px 24px 0 0; padding: 28px 24px; }
                .modal-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 16px; }
                .modal-input { width: 100%; padding: 14px; border-radius: 14px; border: 2px solid #F3F4F6; font-family: inherit; font-size: 0.95rem; outline: none; background: #F9FAFB; }
                .modal-btn { width: 100%; padding: 16px; margin-top: 20px; background: var(--text-main); color: white; border: none; border-radius: 16px; font-weight: 700; font-size: 1rem; }
            `}</style>

            <div className="checkout-container">
                {/* 1. Header */}
                <header className="page-header">
                    <button className="btn-icon" onClick={() => router.push('/home')}>
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="page-title">Checkout</div>
                    <div style={{ width: 40 }}></div>
                </header>

                {/* 2. Segmented Order Type */}
                <div className="segment-control">
                    <div className={`segment-indicator pos-${orderType === 'dinein' ? '0' : orderType === 'takeaway' ? '1' : '2'}`}></div>
                    <button className={`segment-btn ${orderType === 'dinein' ? 'active' : ''}`} onClick={() => setOrderType('dinein')}>
                        <span style={{ fontSize: '1.2rem' }}>🍽️</span> Makan Sini
                    </button>
                    <button className={`segment-btn ${orderType === 'takeaway' ? 'active' : ''}`} onClick={() => setOrderType('takeaway')}>
                        <span style={{ fontSize: '1.2rem' }}>🥡</span> Bungkus
                    </button>
                    <button className={`segment-btn ${orderType === 'delivery' ? 'active' : ''}`} onClick={() => setOrderType('delivery')}>
                        <span style={{ fontSize: '1.2rem' }}>🛵</span> Antar
                    </button>
                </div>

                {/* 3. Receipt Card */}
                <div className="receipt-card">
                    <div className="receipt-header">
                        <div className="receipt-brand">
                            <span style={{ fontSize: '1.1rem' }}>🧾</span> Dapur QuackXel
                        </div>
                        <div className="receipt-date">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                    </div>

                    {checkoutState.items.length > 0 ? (
                        checkoutState.items.map((item, idx) => (
                            <div className="menu-item" key={idx}>
                                <img
                                    src={getImageUrl(item.image || item.imgFile)}
                                    className="menu-thumb"
                                    alt={item.name}
                                    onError={(e) => { e.currentTarget.src = '/assets/logo.png'; }}
                                />
                                <div className="menu-details">
                                    <div className="menu-name">{item.name}</div>
                                    <div className="menu-price">{formatRupiah(item.price)}</div>
                                </div>
                                <div className="qty-control">
                                    <button className="qty-btn" onClick={() => changeQty(idx, -1)}>−</button>
                                    <div className="qty-display">{item.qty}</div>
                                    <button className="qty-btn" onClick={() => changeQty(idx, 1)}>+</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-block">
                            <span className="empty-icon">🍽️</span>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Belum ada pesanan</div>
                        </div>
                    )}

                    {checkoutState.items.length > 0 && (
                        <div>
                            <div className="bill-total">
                                <span className="total-label">Total</span>
                                <span className="total-value">{formatRupiah(finalTotal)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Action Chips */}
                <div className="action-row">
                    {orderType === 'delivery' && (
                        <div className="action-chip" onClick={openLocationModal}>
                            <div className="chip-icon">📍</div>
                            <div className="chip-text">
                                <span className="chip-label">Alamat Antar</span>
                                <span className="chip-val">{location || 'Isi Alamat'}</span>
                            </div>
                        </div>
                    )}
                    <div className="action-chip" style={orderType !== 'delivery' ? { gridColumn: 'span 2' } : {}} onClick={openNotesModal}>
                        <div className="chip-icon">📝</div>
                        <div className="chip-text">
                            <span className="chip-label">Catatan</span>
                            <span className="chip-val">{notes || 'Tulis Catatan'}</span>
                        </div>
                    </div>
                </div>

                {/* 5. Smart Impulse Buy */}
                {recommendations.length > 0 && (
                    <div className="upsell-section">
                        <div className="section-title">
                            <span>{upsellEmoji}</span> {upsellTitle}
                        </div>
                        <div className="upsell-scroll">
                            {recommendations.map(m => (
                                <div className="upsell-card" key={m.id}>
                                    <img
                                        src={getImageUrl(m.image)}
                                        className="upsell-img"
                                        alt={m.name}
                                        onError={(e) => { e.currentTarget.src = '/assets/logo.png'; }}
                                    />
                                    <div className="upsell-name">{m.name}</div>
                                    <div className="upsell-price">{formatRupiah(m.price)}</div>
                                    <button className="btnAdd" onClick={() => addAddon(m)}>
                                        Tambah +
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 6. Modals */}
                {locationModalOpen && (
                    <div className="modal-overlay" onClick={() => setLocationModalOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-title">Antar Kemana?</div>
                            <textarea
                                className="modal-input"
                                rows={2}
                                autoFocus
                                maxLength={100}
                                value={locationDraft}
                                onChange={(e) => {
                                    // Security: Strict Alphanumeric + Basic Punctuation
                                    const safe = e.target.value.replace(/[^a-zA-Z0-9 .,!?()\-]/g, '').substring(0, 100);
                                    setLocationDraft(safe);
                                }}
                                placeholder="Jalan, Nomor Rumah, Patokan..."
                            />
                            <button className="modal-btn" onClick={saveLocationFromModal}>Simpan Lokasi</button>
                        </div>
                    </div>
                )}

                {notesOpen && (
                    <div className="modal-overlay" onClick={() => setNotesOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-title">Pesan Khusus</div>
                            <textarea
                                className="modal-input"
                                rows={2}
                                autoFocus
                                maxLength={100}
                                value={notesDraft}
                                onChange={(e) => {
                                    // Security: Strict Alphanumeric + Basic Punctuation
                                    const safe = e.target.value.replace(/[^a-zA-Z0-9 .,!?()\-]/g, '').substring(0, 100);
                                    setNotesDraft(safe);
                                }}
                                placeholder="Jangan pedas, kurang gula..."
                            />
                            <button className="modal-btn" onClick={saveNotes}>Simpan Catatan</button>
                        </div>
                    </div>
                )}

                {/* 7. Floating Action Bar */}
                <div className="float-bar">
                    <div className="bar-info">
                        <span className="bar-label">Total Tagihan</span>
                        <span className="bar-total">{formatRupiah(checkoutState.subtotal)}</span>
                    </div>
                    <button className="bar-btn" onClick={handleOrderNow} disabled={isSubmitting}>
                        <span>Pesan Sekarang</span>
                    </button>
                </div>

            </div>
        </>
    );
}
