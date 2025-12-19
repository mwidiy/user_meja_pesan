'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { productsData } from '../home/productsData';

export default function CheckoutPage() {
    const router = useRouter();
    const [notesOpen, setNotesOpen] = useState(false);
    const [checkoutState, setCheckoutState] = useState({ items: [], subtotal: 0 });
    const [orderType, setOrderTypeState] = useState('dinein');
    const [location, setLocation] = useState('');
    const locationInputRef = useRef(null);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [locationDraft, setLocationDraft] = useState('');

    // load incoming state, and also restore saved location from localStorage if present
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('state');
            if (!raw) return;
            const parsed = JSON.parse(decodeURIComponent(raw));
            const items = Array.isArray(parsed.items) ? parsed.items : [];
            const subtotal = parsed.subtotal ?? items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);
            setCheckoutState({ items, subtotal });
            // initialize orderType & location from incoming state if present
            if (parsed.orderType) setOrderTypeState(parsed.orderType);
            if (parsed.location) setLocation(parsed.location);
        } catch (e) {
            // ignore parse errors
        }
        // hydrate saved location (persistent across sessions)
        try {
            const saved = localStorage.getItem('checkout_location_v1');
            if (saved && !location) setLocation(saved);
        } catch (e) { }
    }, []);

    // helper to recalc subtotal
    const recalcSubtotal = (items) => items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);

    // change qty by index in list
    const changeQty = (index, delta) => {
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

    // remove item by index
    const removeItem = (index) => {
        setCheckoutState(prev => {
            const items = [...prev.items];
            if (index >= 0 && index < items.length) items.splice(index, 1);
            return { items, subtotal: recalcSubtotal(items) };
        });
    };

    // add addon by product id (merge if exists)
    const addAddon = (id) => {
        const menu = productsData.find(p => p.id === id);
        if (!menu) return;
        setCheckoutState(prev => {
            const items = [...prev.items];
            const existing = items.find(i => i.id === id);
            if (existing) {
                existing.qty = (existing.qty || 0) + 1;
            } else {
                items.push({ id: menu.id, name: menu.name, price: menu.price, qty: 1, imgFile: menu.imgFile });
            }
            return { items, subtotal: recalcSubtotal(items) };
        });
    };

    // order type selection (functional)
    const orderTypeIcons = { dinein: 'garpu', takeaway: 'bungkus', delivery: 'motor' };
    const setOrderType = (type) => {
        // set order type but keep location persisted (user may switch back)
        setOrderTypeState(type);
        setCheckoutState(prev => ({ ...prev, orderType: type }));
        if (type === 'delivery') {
            // fokus input setelah DOM render singkat
            setTimeout(() => locationInputRef.current?.focus(), 80);
        }
    };

    // update location input (visible only for delivery)
    const onChangeLocation = (e) => {
        const val = e.target.value;
        setLocation(val);
        setCheckoutState(prev => ({ ...prev, location: val }));
        try { localStorage.setItem('checkout_location_v1', val); } catch (e) { }
    };

    // open location modal (populate draft)
    const openLocationModal = () => {
        setLocationDraft(location || '');
        setLocationModalOpen(true);
    };
    const closeLocationModal = () => setLocationModalOpen(false);
    const saveLocationFromModal = () => {
        setLocation(locationDraft);
        setCheckoutState(prev => ({ ...prev, location: locationDraft }));
        try { localStorage.setItem('checkout_location_v1', locationDraft); } catch (e) { }
        setLocationModalOpen(false);
    };
    const clearLocationFromModal = () => {
        setLocationDraft('');
        setLocation('');
        setCheckoutState(prev => ({ ...prev, location: '' }));
        try { localStorage.removeItem('checkout_location_v1'); } catch (e) { }
        setLocationModalOpen(false);
    };

    // order now -> redirect to payment with state
    const handleOrderNow = () => {
        if (!checkoutState.items || checkoutState.items.length === 0) {
            alert('Belum ada pesanan.');
            return;
        }
        // jika delivery, pastikan lokasi terisi
        if (orderType === 'delivery' && (!location || !location.trim())) {
            alert('Mohon masukkan lokasi antar terlebih dahulu.');
            setTimeout(() => locationInputRef.current?.focus(), 60);
            return;
        }
        // attach orderType and location to outgoing state
        const toSend = { ...checkoutState, orderType, location };
        const stateParam = encodeURIComponent(JSON.stringify(toSend));
        window.location.href = `/payment?state=${stateParam}`;
    };

    const formatRupiah = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');

    return (
        <>
            <style jsx global>{`
		:root {
			--primary-yellow: #FACC15;
			--primary-yellow-soft: #FEF3C7;
			--text-dark: #111827;
			--text-gray: #6B7280;
			--red-price: #EF4444;
			--card-bg: #FFFFFF;
			--page-bg: #F3F4F6;
		}
		* { margin:0; padding:0; box-sizing:border-box; font-family:'Poppins',sans-serif; }
		body { background: var(--page-bg); min-height: 100vh; }

		.page { max-width: 414px; margin: 0 auto; padding: 16px 16px 120px; }

		.header { display:flex; align-items:center; justify-content:center; position:relative; margin-bottom:16px; }
		.back-btn { position:absolute; left:0; width:40px; height:40px; border-radius:999px; border:none; background:#7c7a7a; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 18px rgba(15,23,42,0.08); cursor:pointer; }
		.header-title { font-size:1.3rem; font-weight:700; color:var(--text-dark); }

		.order-card { background:var(--card-bg); border-radius:24px; padding:14px 16px; display:flex; gap:14px; align-items:center; box-shadow:0 10px 25px rgba(15,23,42,0.06); margin-bottom:12px; }
		.order-thumb { width:70px; height:70px; border-radius:16px; overflow:hidden; background:#E5E7EB; flex-shrink:0; }
		.order-thumb img { width:100%; height:100%; object-fit:cover; }
		.order-main { flex:1; display:flex; flex-direction:column; justify-content:center; }
		.order-name { font-weight:600; font-size:1rem; margin-bottom:4px; color:var(--text-dark); }
		.order-price { font-weight:700; font-size:0.95rem; color:var(--red-price); }
		.order-actions { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
		.qty-inline { display:flex; align-items:center; gap:8px; font-weight:600; color:var(--text-dark); }
		.qty-inline button { border:none; background:transparent; font-size:1.4rem; cursor:pointer; color:var(--text-dark); }
		.trash-btn { border:none; background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0 4px 0 0; }
		.trash-icon { width:22px; height:22px; }

		.section-title { margin:18px 4px 10px; font-weight:700; color:var(--text-dark); display:flex; align-items:center; gap:8px; font-size:1.05rem; }
		.section-title span.icon { display:inline-flex; align-items:center; justify-content:center; }
		.section-title svg.icon-cutlery { width:22px; height:22px; fill:#FACC15; }

		.addon-list { display:flex; gap:12px; overflow-x:auto; padding:4px 2px 6px; }
		.addon-card { min-width:150px; background:#fff; border-radius:18px; box-shadow:0 8px 20px rgba(15,23,42,0.06); padding:10px; display:flex; flex-direction:column; }
		.addon-thumb { width:100%; height:80px; border-radius:14px; overflow:hidden; background:#E5E7EB; margin-bottom:8px; }
		.addon-thumb img { width:100%; height:100%; object-fit:cover; }
		.addon-name { font-weight:600; font-size:0.9rem; color:var(--text-dark); margin-bottom:2px; }
		.addon-price { font-weight:700; font-size:0.9rem; color:var(--red-price); margin-bottom:6px; }
		.addon-footer { display:flex; align-items:center; justify-content:space-between; }
		.addon-label { font-size:0.8rem; color:var(--text-gray); }
		.addon-add-btn { align-self:flex-end; width:30px; height:30px; border-radius:999px; border:none; background:var(--primary-yellow); display:flex; align-items:center; justify-content:center; font-size:1.3rem; cursor:pointer; box-shadow:0 8px 16px rgba(250,204,21,0.5); }

		.notes-card { background:var(--primary-yellow-soft); border-radius:20px; padding:12px 14px; margin:14px 0 18px; cursor:pointer; display:flex; flex-direction:column; gap:4px; }
		.notes-label-row { display:flex; align-items:center; justify-content:space-between; }
		.notes-label { font-weight:600; font-size:0.95rem; color:var(--text-dark); }
		.notes-edit-hint { font-size:0.85rem; color:#F59E0B; }
		.notes-preview { font-size:0.9rem; color:var(--text-gray); max-height:3.2em; overflow:hidden; }
		.notes-empty { color:#9CA3AF; }
		.notes-input-hidden { display:none; }

		.summary-card { background:#fff; border-radius:24px; padding:14px 16px; box-shadow:0 12px 26px rgba(15,23,42,0.08); margin-bottom:0; }
		.summary-title { font-weight:700; font-size:1rem; color:var(--text-dark); margin-bottom:8px; }
		.summary-row { display:flex; justify-content:space-between; align-items:center; margin:2px 0; font-size:0.95rem; color:var(--text-gray); }
		.summary-row.total { margin-top:8px; font-weight:700; font-size:1.02rem; color:var(--text-dark); }
		.summary-row.total .value { color:var(--red-price); }

		.bottom-fixed { position:fixed; left:50%; transform:translateX(-50%); bottom:0; width:100%; max-width:414px; padding:10px 16px 18px; background:linear-gradient(to top, rgba(243,244,246,1), rgba(243,244,246,0.9), rgba(243,244,246,0)); box-sizing:border-box; z-index:20; }
		.bottom-fixed-inner { display:flex; flex-direction:column; gap:10px; }
		.primary-btn { width:100%; border:none; border-radius:999px; padding:14px 16px; background:var(--primary-yellow); color:var(--text-dark); font-weight:700; font-size:1rem; cursor:pointer; box-shadow:0 14px 26px rgba(250,204,21,0.55); }

		.notes-modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,0.45); display:none; align-items:flex-end; justify-content:center; z-index:30; }
		.notes-modal-backdrop.show { display:flex; }
		.notes-modal { width:100%; max-width:414px; background:#FFFFFF; border-top-left-radius:24px; border-top-right-radius:24px; padding:16px 18px 18px; box-shadow:0 -12px 30px rgba(15,23,42,0.35); }
		.notes-modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
		.notes-modal-title { font-weight:700; font-size:1rem; color:var(--text-dark); }
		.notes-modal-close { border:none; background:transparent; font-size:1.4rem; cursor:pointer; }
		.notes-textarea { width:100%; min-height:90px; border-radius:14px; border:1px solid #E5E7EB; padding:10px 12px; font-size:0.95rem; outline:none; resize:vertical; }
		.notes-modal-footer { margin-top:10px; display:flex; justify-content:flex-end; gap:8px; }
		.notes-btn-secondary, .notes-btn-primary { border-radius:999px; padding:8px 14px; font-size:0.9rem; font-weight:600; border:none; cursor:pointer; }
		.notes-btn-secondary { background:#E5E7EB; color:#374151; }
		.notes-btn-primary { background:var(--primary-yellow); color:var(--text-dark); }

		.order-type-wrapper { width:100%; display:flex; justify-content:center; margin:12px 0; }
		.order-type { width:375px; height:170px; position:relative; background:transparent; }
		.order-type__title { position:absolute; left:20px; top:0px; color:#1F2937; font-size:18px; font-weight:700; line-height:28px; display:flex; align-items:center; gap:8px; }
		.order-type__options {
		  position:absolute;
		  left:20px;
		  top:32px;
		  width:335px;
		  height:116px;
		  background:transparent;
		}

		/* sedikit lebih besar untuk proporsi icon dan area sentuh */
		.order-type__option {
		  position: absolute;
		  width: 108px; /* naik sedikit dari 103.66 untuk ruang klik */
		  height: 122px;
		  border-radius: 12px;
		  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
		  background: var(--card-bg, #fff);
		  display: flex;
		  flex-direction: column;
		  align-items: center;
		  justify-content: flex-start;
		  cursor: pointer;
		  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease, outline 0.12s ease;
		  -webkit-tap-highlight-color: transparent;
		  outline: none;
		}

		.order-type__option:hover {
		  transform: translateY(-4px);
		  box-shadow: 0 10px 24px rgba(15,23,42,0.10);
		}

		/* gaya aktif identik dengan chekout.html */
		.order-type__option--active,
		.order-type__option[aria-pressed="true"] {
		  background: #FEFCE8;
		  outline: 2px solid #F0C419;
		  outline-offset: -2px;
		  box-shadow: 0 12px 26px rgba(15,23,42,0.08);
		  transform: translateY(-2px);
		}

		/* keyboard focus yang jelas */
		.order-type__option:focus-visible {
		  box-shadow: 0 12px 26px rgba(15,23,42,0.10);
		  outline: 2px solid #F0C419;
		  outline-offset: -2px;
		}

		/* ukuran icon diperbesar sedikit agar proporsional dengan kartu */
		.order-type__icon {
		  width: 40px;
		  height: 40px;
		  margin-top: 16px;
		  object-fit: contain;
		  display: block;
		}

		.order-type__label {
		  margin-top: 12px;
		  text-align: center;
		  color: #1F2937;
		  font-size: 14px;
		  font-weight: 600;
		  line-height: 20px;
		  white-space: pre-line;
		}

		/* posisi opsi sedikit disesuaikan agar rapi */
		.order-type__option--first { left: 0px; top: 0px; }
		.order-type__option--second { left: 116px; top: 0px; }
		.order-type__option--third { left: 232px; top: 0px; }

		@media (max-width:400px) {
		  .order-type { transform: scale(0.98); transform-origin: top center; }
		  .order-type__option { width: 100px; height: 112px; }
		  .order-type__icon { width: 36px; height: 36px; }
		}

		/* NEW: lokasi input tampil di bawah card tipe pesanan (flow dokument, animasi & spacing) */
		.order-type-location-below {
		  padding: 6px 16px;
		  margin-top: 6px; /* dipendekkan agar proporsional seperti chekout.html */
		   display: flex;
		   justify-content: center;
		   transition: all 180ms ease;
		 }
		 .order-type-location-below .order-type__location-card {
		   width: 100%;
		   max-width: 335px;
		   min-height: 46px;
		   background: var(--card-bg, #fff);
		   box-shadow: 0 6px 18px rgba(15,23,42,0.06);
		   border-radius: 12px;
		   outline: 1px #E5E7EB solid;
		   outline-offset: -1px;
		   display: flex;
		   align-items: center;
		   padding: 8px 12px; /* slightly reduced padding */
		   color: #374151;
		   transform-origin: top;
		   transition: transform 180ms ease, opacity 180ms ease, max-height 180ms ease;
		   opacity: 0;
		   transform: translateY(-6px);
		   max-height: 0;
		   overflow: hidden;
		 }
		 .order-type-location-below.show .order-type__location-card {
		   opacity: 1;
		   transform: translateY(0);
		   max-height: 90px; /* reduced to keep compact */
		 }
		 .order-type-location-below .location-input {
		   width: 100%;
		   border: none;
		   outline: none;
		   background: transparent;
		   font-size: 14px;
		   color: #374151;
		 }

		/* small edit button for location row */
		.order-type-location-below .edit-btn {
			margin-left: 8px;
			background: transparent;
			border: none;
			width: 36px;
			height: 36px;
			border-radius: 8px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			color: #374151;
			box-shadow: 0 6px 14px rgba(15,23,42,0.06);
		}
		.order-type-location-below .edit-btn:hover { transform: translateY(-2px); }

		/* Modal lokasi (bottom sheet) styling */
		.location-modal-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(15,23,42,0.45);
			display: none;
			align-items: flex-end;
			justify-content: center;
			z-index: 40;
		}
		.location-modal-backdrop.show { display: flex; }
		.location-modal {
			width: 100%;
			max-width: 414px;
			background: #FFFFFF;
			border-top-left-radius: 24px;
			border-top-right-radius: 24px;
			padding: 16px 18px 18px;
			box-shadow: 0 -12px 30px rgba(15,23,42,0.35);
		}
		.location-input-big {
			width: 100%;
			border-radius: 12px;
			border: 1px solid #E5E7EB;
			padding: 10px 12px;
			font-size: 0.95rem;
			outline: none;
		}

		/* ...existing CSS... */
	`}</style>

            <div className="page">
                <header className="header">
                    <button className="back-btn" onClick={() => router.back()}>
                        <img src="/assets/Back.svg" alt="back" />
                    </button>
                    <h1 className="header-title">Pesanan Anda</h1>
                </header>

                <div id="orderList">
                    {checkoutState.items && checkoutState.items.length ? (
                        checkoutState.items.map((item, idx) => (
                            <div className="order-card" key={idx}>
                                <div className="order-thumb">
                                    <img src={item.imgFile ? `/assets/${item.imgFile}` : 'https://placehold.co/200x200?text=Menu'} alt={item.name} />
                                </div>
                                <div className="order-main">
                                    <div className="order-name">{item.name}</div>
                                    <div className="order-price">{formatRupiah(item.price)}</div>
                                </div>
                                <div className="order-actions">
                                    <div className="qty-inline">
                                        <button className="trash-btn" aria-label="Hapus" onClick={() => removeItem(idx)}>
                                            <svg className="trash-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#E5E7EB" /><path d="M9 9l6 6M15 9l-6 6" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" /></svg>
                                        </button>
                                        <button onClick={() => changeQty(idx, -1)}>−</button>
                                        <span>{item.qty}</span>
                                        <button onClick={() => changeQty(idx, 1)}>+</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>Belum ada pesanan.</div>
                    )}
                </div>

                {/* order type (replaced with HTML-like structure + React logic for location) */}
                <div className="order-type-wrapper" aria-hidden="false">
                    <div className="order-type" role="region" aria-label="Tipe Pesanan">
                        <div className="order-type__title">
                            <img src="/assets/Card_Icon.svg" alt="" className="order-type__title-icon" />
                            <span>Tipe Pesanan</span>
                        </div>

                        <div className="order-type__options" role="tablist" aria-label="Opsi Tipe Pesanan">
                            {/* Dine In */}
                            <div
                                className={`order-type__option order-type__option--first ${orderType === 'dinein' ? 'order-type__option--active' : ''}`}
                                data-type="dinein"
                                role="button"
                                tabIndex={0}
                                aria-pressed={orderType === 'dinein'}
                                onClick={() => setOrderType('dinein')}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOrderType('dinein'); } }}
                            >
                                <img src={`/assets/garpu${orderType === 'dinein' ? '_k' : ''}.svg`} alt="Makan Sini" className="order-type__icon" />
                                <div className="order-type__label">Makan<br />Sini</div>
                            </div>

                            {/* Takeaway */}
                            <div
                                className={`order-type__option order-type__option--second ${orderType === 'takeaway' ? 'order-type__option--active' : ''}`}
                                data-type="takeaway"
                                role="button"
                                tabIndex={0}
                                aria-pressed={orderType === 'takeaway'}
                                onClick={() => setOrderType('takeaway')}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOrderType('takeaway'); } }}
                            >
                                <img src={`/assets/bungkus${orderType === 'takeaway' ? '_k' : ''}.svg`} alt="Bungkus" className="order-type__icon" />
                                <div className="order-type__label">Bungkus</div>
                            </div>

                            {/* Delivery */}
                            <div
                                className={`order-type__option order-type__option--third ${orderType === 'delivery' ? 'order-type__option--active' : ''}`}
                                data-type="delivery"
                                role="button"
                                tabIndex={0}
                                aria-pressed={orderType === 'delivery'}
                                onClick={() => setOrderType('delivery')}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOrderType('delivery'); } }}
                            >
                                <img src={`/assets/motor${orderType === 'delivery' ? '_k' : ''}.svg`} alt="Antar" className="order-type__icon" />
                                <div className="order-type__label">Antar</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* render input below ONLY when delivery selected — this ensures elements below shift up when input is absent */}
                {orderType === 'delivery' && (
                    <div className={`order-type-location-below show`}>
                        <div className="order-type__location-card" role="group" aria-label="Lokasi Antar" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                ref={locationInputRef}
                                className="location-input"
                                type="text"
                                placeholder="Masukkan lokasi antar (mis. Gedung A, Lantai 2, Ruang 205)"
                                value={location}
                                onChange={onChangeLocation}
                                aria-label="Lokasi Antar"
                            />
                            {/* edit button opens bottom modal for more comfortable editing/saving */}
                            <button className="edit-btn" aria-label="Edit lokasi" onClick={openLocationModal} title="Edit lokasi">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* LOCATION Modal (bottom sheet) */}
                <div className={`location-modal-backdrop ${locationModalOpen ? 'show' : ''}`} onClick={() => setLocationModalOpen(false)}>
                    <div className="location-modal" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <strong style={{ fontSize: 16 }}>Lokasi Antar</strong>
                            <button onClick={() => setLocationModalOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: 20 }}>×</button>
                        </div>
                        <p style={{ margin: '6px 0 12px', color: '#6B7280' }}>Masukkan detail lokasi antar agar pesanan sampai tepat.</p>
                        <input className="location-input-big" value={locationDraft} onChange={(e) => setLocationDraft(e.target.value)} placeholder="Contoh: Gedung A, Lantai 2, Ruang 205" />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                            <button className="notes-btn-secondary" onClick={() => { setLocationDraft(''); clearLocationFromModal(); }}>Hapus</button>
                            <button className="notes-btn-primary" onClick={saveLocationFromModal}>Simpan</button>
                        </div>
                    </div>
                </div>

                <div className="section-title">
                    <span className="icon">
                        <svg className="icon-cutlery" viewBox="0 0 24 24"><path d="M4 3v7a2 2 0 0 0 2 2v9h2v-9a2 2 0 0 0 2-2V3h-2v4h-1V3H7v4H6V3H4zm10.5 0L14 3.5v7a3.5 3.5 0 0 0 2.5 3.346V21h2v-7.154A3.5 3.5 0 0 0 21 13.5V3.5L19.5 3 18 3.5 16.5 3z" /></svg>
                    </span>
                    <span>Mau Tambah Sesuatu?</span>
                </div>
                <div className="addon-list" id="addonList">
                    {productsData.map(m => (
                        <div className="addon-card" key={m.id}>
                            <div className="addon-thumb">
                                <img src={`/assets/${m.imgFile}`} alt={m.name}
                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://placehold.co/300x200?text=${encodeURIComponent(m.name)}`; }}
                                />
                            </div>
                            <div className="addon-name">{m.name}</div>
                            <div className="addon-price">{formatRupiah(m.price)}</div>
                            <div className="addon-footer">
                                <span className="addon-label">Tambah</span>
                                <button className="addon-add-btn" onClick={() => addAddon(m.id)}>+</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="section-title" style={{ marginTop: 20 }}>
                    <span className="icon">📝</span>
                    <span>Catatan Khusus</span>
                </div>
                <div className="notes-card" onClick={() => setNotesOpen(true)}>
                    <div className="notes-label-row">
                        <span className="notes-label">Catatan Untuk Dapur</span>
                        <span className="notes-edit-hint">Tambah / Ubah</span>
                    </div>
                    <div className="notes-preview notes-empty">Tidak ada catatan. Ketuk untuk menambahkan.</div>
                    <input className="notes-input-hidden" />
                </div>

                <div style={{ height: 90 }} />
            </div>

            <div className="bottom-fixed">
                <div className="bottom-fixed-inner">
                    <div className="summary-card">
                        <div className="summary-title">Ringkasan Pembayaran</div>
                        <div className="summary-row"><span>Subtotal</span><span id="subtotalText">{formatRupiah(checkoutState.subtotal)}</span></div>
                        <div className="summary-row total"><span>Total Pembayaran</span><span className="value" id="totalTextBottom">{formatRupiah(checkoutState.subtotal)}</span></div>
                    </div>
                    <button className="primary-btn" onClick={() => handleOrderNow()}>Pesan Sekarang</button>
                </div>
            </div>

            <div className={`notes-modal-backdrop ${notesOpen ? 'show' : ''}`} onClick={() => setNotesOpen(false)}>
                <div className="notes-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="notes-modal-header">
                        <span className="notes-modal-title">Catatan Untuk Dapur</span>
                        <button className="notes-modal-close" onClick={() => setNotesOpen(false)}>&times;</button>
                    </div>
                    <textarea className="notes-textarea" placeholder="Contoh: tanpa sambal, level pedas sedang, saus dipisah, dll." />
                    <div className="notes-modal-footer">
                        <button className="notes-btn-secondary" onClick={() => { }}>Hapus</button>
                        <button className="notes-btn-primary" onClick={() => setNotesOpen(false)}>Simpan</button>
                    </div>
                </div>
            </div>
        </>
    );
}
