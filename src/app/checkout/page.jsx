'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder, getImageUrl, getProducts } from '../../services/api'; // Added getProducts

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

    // Haptic Feedback Helper
    const vibrate = (ms = 15) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(ms);
        }
    };

    // Load state & Fetch Products
    useEffect(() => {
        // 1. Load Checkout State
        try {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('state');
            if (raw) {
                const parsed = JSON.parse(decodeURIComponent(raw));
                const items = Array.isArray(parsed.items) ? parsed.items : [];
                const subtotal = parsed.subtotal ?? items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);
                setCheckoutState({ items, subtotal });
                if (parsed.orderType) setOrderTypeState(parsed.orderType);
                if (parsed.location) setLocation(parsed.location);
            }
        } catch (e) { }
        try {
            const saved = localStorage.getItem('checkout_location_v1');
            if (saved && !location) setLocation(saved);
        } catch (e) { }

        // 2. Fetch Real Products for Recommendations
        const fetchRecommendations = async () => {
            let storeId = null;
            try {
                const storedTable = localStorage.getItem('customer_table');
                if (storedTable) {
                    const parsed = JSON.parse(storedTable);
                    if (parsed.location?.storeId) storeId = parsed.location.storeId;
                }
            } catch (e) { }

            // Fetch all products
            try {
                const rawData = await getProducts(storeId);
                // Safety check: Ensure it's an array
                if (Array.isArray(rawData)) {
                    setAllProducts(rawData);
                } else if (rawData && Array.isArray(rawData.data)) {
                    setAllProducts(rawData.data); // Handle { data: [...] } format
                } else if (rawData && Array.isArray(rawData.products)) {
                    setAllProducts(rawData.products); // Handle { products: [...] } format
                } else {
                    console.warn('[Checkout] Products API returned non-array:', rawData);
                    setAllProducts([]);
                }
            } catch (err) {
                console.error('[Checkout] Failed to load products for upsell:', err);
                setAllProducts([]);
            }
        };

        fetchRecommendations();
    }, []);

    // --- SMART RECOMMENDATION ENGINE (ROBUST VERSION) ---
    useEffect(() => {
        // Wait for data & Safety Check
        if (!allProducts || !Array.isArray(allProducts) || allProducts.length === 0) return;

        // 1. Analyze Cart Category Counts
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

        // 2. Determine Strategy
        let targetStrategy = 'random'; // default
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

        // 3. Filter Candidates (Exclude Cart Items & Inactive)
        // Note: We check 'isActive' loosely (if property missing, assume active for safety, or adjust based on DB schema)
        let candidates = allProducts.filter(p => !cartIds.has(p.id) && (p.isActive !== false));

        // 4. Apply Strategy Filtering
        let filtered = [];

        const isMatch = (p, type) => {
            const name = (p.name || '').toLowerCase();
            const cat = (p.category || '').toLowerCase();
            if (type === 'drink') return cat.includes('minum') || cat.includes('drink') || name.includes('es ') || name.includes('teh') || name.includes('kopi') || name.includes('ice');
            if (type === 'food') return cat.includes('makan') || cat.includes('food') || name.includes('nasi') || name.includes('mie') || name.includes('ayam') || name.includes('soto');
            if (type === 'snack') return cat.includes('snack') || cat.includes('cemil') || name.includes('kentang') || name.includes('roti') || name.includes('pisang') || name.includes('dimsum');
            return false;
        };

        if (targetStrategy !== 'random') {
            filtered = candidates.filter(p => isMatch(p, targetStrategy));
        }

        // 5. Ultimate Fallback
        // If strategy returned nothing (or it was random), use ALL candidates
        if (filtered.length === 0) {
            // If we really couldn't find specific matches, just show ANY available candidate
            filtered = candidates;
            title = 'Teman Makan Enak'; // Generic Title
            emoji = '🔥';
        }

        // 6. Refine & Limit (Smart Selection)
        const finalRecommendations = filtered
            .sort((a, b) => {
                // Priority 1: Has Image
                const hasImgA = !!(a.image || a.imgFile);
                const hasImgB = !!(b.image || b.imgFile);
                if (hasImgA && !hasImgB) return -1;
                if (!hasImgA && hasImgB) return 1;

                // Priority 2: Randomize within same tier
                return 0.5 - Math.random();
            })
            .slice(0, 5); // Max 5 items

        setRecommendations(finalRecommendations);
        setUpsellTitle(title);
        setUpsellEmoji(emoji);

    }, [checkoutState.items, allProducts]);


    const recalcSubtotal = (items) => items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);

    const changeQty = (index, delta) => {
        vibrate(10); // Haptic tick
        setCheckoutState(prev => {
            const items = [...prev.items];
            const it = items[index];
            if (!it) return prev;
            const next = (it.qty || 0) + delta;
            if (next <= 0) items.splice(index, 1);
            else items[index] = { ...it, qty: next };
            return { items, subtotal: recalcSubtotal(items) };
        });
    };

    const addAddon = (item) => {
        vibrate(20); // Stronger haptic
        setCheckoutState(prev => {
            const items = [...prev.items];
            const existing = items.find(i => i.id === item.id);
            if (existing) {
                existing.qty = (existing.qty || 0) + 1;
            } else {
                items.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    qty: 1,
                    image: item.image || item.imgFile,
                    category: item.category // Store category for better logic next time
                });
            }
            return { items, subtotal: recalcSubtotal(items) };
        });
    };

    const setOrderType = (type) => {
        vibrate(15);
        setOrderTypeState(type);
        setCheckoutState(prev => ({ ...prev, orderType: type }));
        if (type === 'delivery') setTimeout(() => locationInputRef.current?.focus(), 80);
    };

    // Location & Notes handlers
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
        vibrate(30);
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
                if (parsed.location && parsed.location.storeId) {
                    storeId = parsed.location.storeId;
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
        router.push(`/payment?state=${encodeURIComponent(JSON.stringify(stateData))}`);
    };

    const formatRupiah = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');

    // Tax & Total Calculation (Mockup logic)
    const tax = Math.round(checkoutState.subtotal * 0.1);
    const finalTotal = checkoutState.subtotal;

    return (
        <>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
                
                :root {
                    --primary: #FACC15;
                    --primary-dark: #EAB308;
                    --primary-soft: #FEFCE8;
                    --text-main: #111827;
                    --text-sec: #6B7280;
                    --bg-page: #FAFAFA;
                    --card-bg: #FFFFFF;
                    --accent-red: #EF4444;
                    --shadow-soft: 0 4px 24px rgba(0,0,0,0.03);
                    --shadow-float: 0 12px 32px rgba(0,0,0,0.06);
                }
                * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
                body { margin: 0; font-family: 'Outfit', sans-serif; background: var(--bg-page); color: var(--text-main); }
                
                .checkout-container { max-width: 480px; margin: 0 auto; min-height: 100vh; padding: 24px; padding-bottom: 140px; }
                
                /* --- Header --- */
                .page-header { display: flex; align-items: center; margin-bottom: 28px; position: sticky; top: 0; z-index: 40; padding: 12px 0; background: rgba(250,250,250,0.8); backdrop-filter: blur(8px); transition: all 0.3s; }
                .btn-icon { width: 44px; height: 44px; border-radius: 14px; border: 1px solid rgba(0,0,0,0.05); background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-soft); transition: transform 0.1s; color: var(--text-main); }
                .btn-icon:active { transform: scale(0.92); }
                .page-title { flex: 1; text-align: center; font-size: 1.15rem; font-weight: 700; margin-right: 44px; letter-spacing: -0.02em; }

                /* --- Order Type Segmented Control --- */
                .segment-control { background: #F3F4F6; padding: 5px; border-radius: 18px; display: grid; grid-template-columns: 1fr 1fr 1fr; position: relative; margin-bottom: 32px; }
                .segment-btn { border: none; background: transparent; padding: 10px; font-weight: 600; font-size: 0.85rem; color: var(--text-sec); cursor: pointer; position: relative; z-index: 2; transition: color 0.2s; display: flex; flex-direction: column; align-items: center; gap: 4px; border-radius: 14px; }
                .segment-btn.active { color: var(--text-main); }
                .segment-indicator { position: absolute; top: 5px; bottom: 5px; background: white; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); z-index: 1; width: calc(33.33% - 6.66px); }
                /* Indicator Positions */
                .pos-0 { left: 5px; } 
                .pos-1 { left: calc(33.33% + 1.66px); } 
                .pos-2 { left: calc(66.66% - 1.66px); }

                /* --- Receipt Card --- */
                .receipt-card { 
                    background: white; border-radius: 24px; padding: 20px; box-shadow: var(--shadow-soft); 
                    position: relative; overflow: hidden; margin-bottom: 32px;
                }
                .receipt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px dashed #F3F4F6; padding-bottom: 16px; }
                .receipt-brand { font-weight: 800; font-size: 1rem; color: var(--text-main); display: flex; align-items: center; gap: 8px; }
                .receipt-date { font-size: 0.8rem; color: var(--text-sec); }

                /* List Item */
                .menu-item { display: flex; gap: 14px; margin-bottom: 16px; align-items: center; animation: slideIn 0.3s ease forwards; }
                @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .menu-thumb { width: 64px; height: 64px; border-radius: 16px; object-fit: cover; background: #eee; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                .menu-details { flex: 1; }
                .menu-name { font-weight: 700; font-size: 0.95rem; line-height: 1.25; margin-bottom: 4px; }
                .menu-price { font-weight: 600; font-size: 0.9rem; color: var(--text-sec); }
                
                /* Qty Control Modern */
                .qty-control { display: flex; align-items: center; background: #F9FAFB; border-radius: 12px; padding: 2px; border: 1px solid #E5E7EB; }
                .qty-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: none; background: white; border-radius: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer; color: var(--text-main); font-weight: 700; transition: transform 0.1s; }
                .qty-btn:active { transform: scale(0.9); background: #eee; }
                .qty-display { width: 24px; text-align: center; font-size: 0.9rem; font-weight: 700; }

                /* Receipt Summary */
                .bill-row { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 8px; color: var(--text-sec); }
                .bill-total { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 2px dashed #F3F4F6; }
                .total-label { font-weight: 800; font-size: 1.1rem; }
                .total-value { font-weight: 800; font-size: 1.2rem; color: var(--text-main); letter-spacing: -0.03em; }

                /* --- Upselling (Impulse Buy) --- */
                .upsell-section { margin-bottom: 32px; }
                .section-title { font-weight: 800; font-size: 1.1rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
                .upsell-scroll { display: flex; overflow-x: auto; gap: 12px; padding-bottom: 16px; scroll-snap-type: x mandatory; -ms-overflow-style: none; scrollbar-width: none; }
                .upsell-scroll::-webkit-scrollbar { display: none; }
                .upsell-card { min-width: 140px; scroll-snap-align: start; background: white; border-radius: 20px; padding: 10px; box-shadow: var(--shadow-soft); display: flex; flex-direction: column; gap: 8px; border: 1px solid rgba(0,0,0,0.02); transition: transform 0.2s; }
                .upsell-card:active { transform: scale(0.98); }
                .upsell-img { width: 100%; height: 100px; border-radius: 16px; object-fit: cover; background: #f0f0f0; }
                .upsell-name { font-weight: 700; font-size: 0.9rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .upsell-price { font-size: 0.85rem; color: var(--text-sec); font-weight: 600; }
                .btnAdd { width: 100%; background: var(--primary-soft); color: #B45309; font-weight: 700; border: none; padding: 8px; border-radius: 12px; cursor: pointer; font-size: 0.85rem; transition: background 0.2s; }
                .btnAdd:active { background: var(--primary); color: black; }

                /* --- Notes & Location --- */
                .action-row { display: flex; gap: 12px; margin-bottom: 24px; overflow-x: auto; padding-right: 4px; }
                .action-chip { 
                    flex: 1; min-width: 140px; background: white; border: 1px solid #E5E7EB; border-radius: 16px; 
                    padding: 12px 16px; display: flex; align-items: center; gap: 10px; cursor: pointer; 
                    transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.02);
                }
                .action-chip:active { transform: scale(0.98); background: #F9FAFB; }
                .chip-icon { color: #F59E0B; }
                .chip-text { display: flex; flex-direction: column; }
                .chip-label { font-size: 0.75rem; color: var(--text-sec); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
                .chip-val { font-size: 0.9rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; }

                /* --- Bottom Float Bar --- */
                .float-bar { 
                    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); width: calc(100% - 40px); max-width: 440px;
                    background: #111827; border-radius: 24px; padding: 8px 8px 8px 24px; display: flex; align-items: center; justify-content: space-between;
                    box-shadow: 0 12px 40px rgba(17, 24, 39, 0.4); z-index: 100; animation: slideUpBar 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                }
                @keyframes slideUpBar { from { transform: translate(-50%, 100%); } to { transform: translate(-50%, 0); } }
                .bar-info { display: flex; flex-direction: column; }
                .bar-label { font-size: 0.75rem; color: rgba(255,255,255,0.6); font-weight: 600; }
                .bar-total { font-size: 1.1rem; color: white; font-weight: 800; }
                .bar-btn { 
                    background: var(--primary); color: #111827; border: none; padding: 14px 24px; 
                    border-radius: 18px; font-weight: 800; font-size: 1rem; cursor: pointer; 
                    box-shadow: 0 4px 12px rgba(250, 204, 21, 0.3); transition: transform 0.2s;
                    display: flex; align-items: center; gap: 8px;
                }
                .bar-btn:active { transform: scale(0.95); }

                /* Empty State */
                .empty-block { text-align: center; padding: 60px 20px; opacity: 0.6; }
                .empty-icon { font-size: 4rem; margin-bottom: 16px; display: block; animation: bounce 2s infinite; }
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

                /* Modals common */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
                .modal-content { background: white; width: 100%; max-width: 480px; border-radius: 32px 32px 0 0; padding: 32px 24px; animation: slideUpModal 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
                @keyframes slideUpModal { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .modal-title { font-size: 1.3rem; font-weight: 800; margin-bottom: 16px; }
                .modal-input { width: 100%; padding: 16px; border-radius: 16px; border: 2px solid #F3F4F6; font-family: inherit; font-size: 1rem; outline: none; transition: border 0.2s; background: #F9FAFB; }
                .modal-input:focus { border-color: var(--primary); background: white; }
                .modal-btn { width: 100%; padding: 16px; margin-top: 20px; background: var(--text-main); color: white; border: none; border-radius: 16px; font-weight: 700; font-size: 1rem; cursor: pointer; }
            `}</style>

            <div className="checkout-container">
                {/* 1. Header with Glass effect */}
                <header className="page-header">
                    <button className="btn-icon" onClick={() => router.back()}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="page-title">Pembayaran</div>
                    <div style={{ width: 44 }}></div>
                </header>

                {/* 2. Segmented Order Type */}
                <div className="segment-control">
                    <div className={`segment-indicator pos-${orderType === 'dinein' ? '0' : orderType === 'takeaway' ? '1' : '2'}`}></div>
                    <button className={`segment-btn ${orderType === 'dinein' ? 'active' : ''}`} onClick={() => setOrderType('dinein')}>
                        <span>🍽️</span> Makan Sini
                    </button>
                    <button className={`segment-btn ${orderType === 'takeaway' ? 'active' : ''}`} onClick={() => setOrderType('takeaway')}>
                        <span>🥡</span> Bungkus
                    </button>
                    <button className={`segment-btn ${orderType === 'delivery' ? 'active' : ''}`} onClick={() => setOrderType('delivery')}>
                        <span>🛵</span> Antar
                    </button>
                </div>

                {/* 3. Receipt Card (The Bill) */}
                <div className="receipt-card">
                    <div className="receipt-header">
                        <div className="receipt-brand">
                            <span style={{ fontSize: '1.2rem' }}>🧾</span> Dapur QuackXel
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
                            <div style={{ fontWeight: 600 }}>Belum ada pesanan</div>
                        </div>
                    )}

                    {/* Bill Summary */}
                    {checkoutState.items.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <div className="bill-row">
                                <span>Subtotal</span>
                                <span>{formatRupiah(checkoutState.subtotal)}</span>
                            </div>
                            <div className="bill-row">
                                <span>Pajak & Layanan</span>
                                <span>Termasuk</span>
                            </div>
                            <div className="bill-total">
                                <span className="total-label">Total</span>
                                <span className="total-value">{formatRupiah(finalTotal)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Action Chips (Address & Notes) */}
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
                    <div className="action-chip" onClick={openNotesModal}>
                        <div className="chip-icon">📝</div>
                        <div className="chip-text">
                            <span className="chip-label">Catatan</span>
                            <span className="chip-val">{notes || 'Tulis Catatan'}</span>
                        </div>
                    </div>
                </div>

                {/* 5. Smart Impulse Buy (Recommendations from API) */}
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
                                        Mau ini +
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
                                rows={3}
                                autoFocus
                                value={locationDraft}
                                onChange={(e) => setLocationDraft(e.target.value)}
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
                                rows={3}
                                autoFocus
                                value={notesDraft}
                                onChange={(e) => setNotesDraft(e.target.value)}
                                placeholder="Jangan pedas, kurang gula..."
                            />
                            <button className="modal-btn" onClick={saveNotes}>Simpan Catatan</button>
                        </div>
                    </div>
                )}

                {/* 7. Floating Action Bar (Like delivery apps) */}
                <div className="float-bar">
                    <div className="bar-info">
                        <span className="bar-label">Total Tagihan</span>
                        <span className="bar-total">{formatRupiah(checkoutState.subtotal)}</span>
                    </div>
                    <button className="bar-btn" onClick={handleOrderNow} disabled={isSubmitting}>
                        <span>Pesan</span>
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                </div>

            </div>
        </>
    );
}
