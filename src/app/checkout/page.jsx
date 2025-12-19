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
    const [notes, setNotes] = useState('');
    const [notesDraft, setNotesDraft] = useState('');

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

    // open notes modal with draft
    const openNotesModal = () => { setNotesDraft(notes || ''); setNotesOpen(true); };
    const closeNotesModal = () => setNotesOpen(false);
    const saveNotes = () => {
        setNotes(notesDraft);
        try { localStorage.setItem('checkout_notes_v1', notesDraft); } catch (e) { }
        setNotesOpen(false);
    };
    const clearNotes = () => {
        setNotes(''); setNotesDraft(''); try { localStorage.removeItem('checkout_notes_v1'); } catch (e) { }
        setNotesOpen(false);
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
			--qx-navy: #2C3E50;
			--qx-yellow: #F7DC6F;
			--qx-dark-grey: #34495E;
			--qx-med-grey: #7F8C8D;
		}
		/* keep global resets minimal */
		* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
		body { margin: 0; font-family: 'Poppins', sans-serif; }

		/* ===== Scoped checkout styles (prevent leaking to other pages) ===== */
		.checkout-root .page { max-width: 414px; margin: 0 auto; padding: 16px 16px 120px; }
		.checkout-root .header { display:flex; align-items:center; justify-content:center; position:relative; margin-bottom:16px; }
		.checkout-root .back-btn { position:absolute; left:0; width:40px; height:40px; border-radius:999px; border:none; background:#7c7a7a; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 18px rgba(15,23,42,0.08); cursor:pointer; }
		.checkout-root .header-title { font-size:1.3rem; font-weight:700; color:var(--text-dark); }

		.checkout-root .order-card { background:var(--card-bg); border-radius:24px; padding:14px 16px; display:flex; gap:14px; align-items:center; box-shadow:0 10px 25px rgba(15,23,42,0.06); margin-bottom:12px; }
		.checkout-root .order-thumb { width:70px; height:70px; border-radius:16px; overflow:hidden; background:#E5E7EB; flex-shrink:0; }
		.checkout-root .order-thumb img { width:100%; height:100%; object-fit:cover; }
		.checkout-root .order-main { flex:1; display:flex; flex-direction:column; justify-content:center; }
		.checkout-root .order-name { font-weight:600; font-size:1rem; margin-bottom:4px; color:var(--text-dark); }
		.checkout-root .order-price { font-weight:700; font-size:0.95rem; color:var(--red-price); }
		.checkout-root .order-actions { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
		.checkout-root .qty-inline { display:flex; align-items:center; gap:8px; font-weight:600; color:var(--text-dark); }
		.checkout-root .qty-inline button { border:none; background:transparent; font-size:1.4rem; cursor:pointer; color:var(--text-dark); }
		.checkout-root .trash-btn { border:none; background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0 4px 0 0; }
		.checkout-root .trash-icon { width:22px; height:22px; }

		.checkout-root .section-title { margin:18px 4px 10px; font-weight:700; color:var(--text-dark); display:flex; align-items:center; gap:8px; font-size:1.05rem; }
		.checkout-root .section-title span.icon { display:inline-flex; align-items:center; justify-content:center; }
		.checkout-root .section-title svg.icon-cutlery { width:22px; height:22px; fill:#FACC15; }

		.checkout-root .addon-list { display:flex; gap:12px; overflow-x:auto; padding:4px 2px 6px; }
		.checkout-root .addon-card { min-width:150px; background:#fff; border-radius:18px; box-shadow:0 8px 20px rgba(15,23,42,0.06); padding:10px; display:flex; flex-direction:column; }
		.checkout-root .addon-thumb { width:100%; height:80px; border-radius:14px; overflow:hidden; background:#E5E7EB; margin-bottom:8px; }
		.checkout-root .addon-thumb img { width:100%; height:100%; object-fit:cover; }
		.checkout-root .addon-name { font-weight:600; font-size:0.9rem; color:var(--text-dark); margin-bottom:2px; }
		.checkout-root .addon-price { font-weight:700; font-size:0.9rem; color:var(--red-price); margin-bottom:6px; }
		.checkout-root .addon-footer { display:flex; align-items:center; justify-content:space-between; }
		.checkout-root .addon-label { font-size:0.8rem; color:var(--text-gray); }
		.checkout-root .addon-add-btn { align-self:flex-end; width:30px; height:30px; border-radius:999px; border:none; background:var(--primary-yellow); display:flex; align-items:center; justify-content:center; font-size:1.3rem; cursor:pointer; box-shadow:0 8px 16px rgba(250,204,21,0.5); }

		.checkout-root .notes-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 12px 14px;
  margin: 16px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  border: 1.5px solid rgba(44,62,80,0.12); /* subtle dark navy border */
  box-shadow: 0 10px 24px rgba(44,62,80,0.06); /* soft navy shadow */
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.checkout-root .notes-card:active { transform: translateY(1px); }
.checkout-root .notes-card:hover { box-shadow: 0 14px 32px rgba(44,62,80,0.08); }

		/* Icon circle */
		.checkout-root .notes-card .notes-icon {
  width: 46px;
  height: 46px;
  background: var(--qx-yellow);
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 14px rgba(247,220,111,0.18);
  flex-shrink: 0;
}

/* Title + placeholder area */
.checkout-root .notes-card .notes-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.checkout-root .notes-card .notes-title {
  color: var(--qx-navy);
  font-weight: 700;
  font-size: 0.97rem;
  line-height: 1;
}
.checkout-root .notes-card .notes-placeholder {
  color: var(--qx-med-grey);
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* small tag on right */
.checkout-root .notes-card .notes-action {
  margin-left: auto;
  color: var(--qx-dark-grey);
  font-weight: 600;
  font-size: 0.82rem;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(44,62,80,0.04);
}

/* Notes modal (updated look) */
.notes-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.45);
  display: none;
  align-items: flex-end;
  justify-content: center;
  z-index: 60;
}
.notes-modal-backdrop.show { display:flex; }

.notes-modal {
  width: 100%;
  max-width: 414px;
  background: #fff;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 14px 16px;
  box-shadow: 0 -18px 40px rgba(44,62,80,0.16);
}

/* header */
.notes-modal-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:8px; border-bottom:1px solid #f3f4f6; }
.notes-modal-title { color: var(--qx-navy); font-weight: 800; font-size: 1rem; }
.notes-modal-close { border:none; background:transparent; font-size:20px; color:var(--qx-dark-grey); cursor:pointer; }

/* textarea */
.notes-textarea {
  width:100%;
  min-height:120px;
  border-radius:12px;
  border:1px solid #E6E9EE;
  padding:12px;
  font-size:0.96rem;
  color:var(--qx-navy);
  resize: vertical;
  margin-top:10px;
}

/* footer */
.notes-modal-footer { margin-top:12px; display:flex; justify-content:space-between; align-items:center; gap:8px; }
.notes-btn-clear { background: transparent; border: 1px solid #E6E9EE; color: var(--qx-dark-grey); padding:8px 12px; border-radius:10px; cursor:pointer; }
.notes-btn-save { background: var(--qx-navy); color: var(--qx-yellow); padding:10px 14px; border-radius:10px; border:none; font-weight:700; cursor:pointer; box-shadow: 0 10px 22px rgba(44,62,80,0.12); }

/* truncated preview */
.notes-preview.truncated { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

		.checkout-root .order-type-wrapper { width:100%; display:flex; justify-content:center; margin:12px 0; }
		.checkout-root .order-type { width:375px; height:170px; position:relative; background:transparent; }
		.checkout-root .order-type__title { position:absolute; left:20px; top:0px; color:#1F2937; font-size:18px; font-weight:700; line-height:28px; display:flex; align-items:center; gap:8px; }
		.checkout-root .order-type__options {
		  position:absolute;
		  left:20px;
		  top:32px;
		  width:335px;
		  height:116px;
		  background:transparent;
		}

		/* sedikit lebih besar untuk proporsi icon dan area sentuh */
		.checkout-root .order-type__option {
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

		.checkout-root .order-type__option:hover {
		  transform: translateY(-4px);
		  box-shadow: 0 10px 24px rgba(15,23,42,0.10);
		}

		/* gaya aktif identik dengan chekout.html */
		.checkout-root .order-type__option--active,
		.order-type__option[aria-pressed="true"] {
		  background: #FEFCE8;
		  outline: 2px solid #F0C419;
		  outline-offset: -2px;
		  box-shadow: 0 12px 26px rgba(15,23,42,0.08);
		  transform: translateY(-2px);
		}

		/* keyboard focus yang jelas */
		.checkout-root .order-type__option:focus-visible {
		  box-shadow: 0 12px 26px rgba(15,23,42,0.10);
		  outline: 2px solid #F0C419;
		  outline-offset: -2px;
		}

		/* ukuran icon diperbesar sedikit agar proporsional dengan kartu */
		.checkout-root .order-type__icon {
		  width: 40px;
		  height: 40px;
		  margin-top: 16px;
		  object-fit: contain;
		  display: block;
		}

		.checkout-root .order-type__label {
		  margin-top: 12px;
		  text-align: center;
		  color: #1F2937;
		  font-size: 14px;
		  font-weight: 600;
		  line-height: 20px;
		  white-space: pre-line;
		}

		/* posisi opsi sedikit disesuaikan agar rapi */
		.checkout-root .order-type__option--first { left: 0px; top: 0px; }
		.checkout-root .order-type__option--second { left: 116px; top: 0px; }
		.checkout-root .order-type__option--third { left: 232px; top: 0px; }

		@media (max-width:400px) {
		  .checkout-root .order-type { transform: scale(0.98); transform-origin: top center; }
		  .checkout-root .order-type__option { width: 100px; height: 112px; }
		  .checkout-root .order-type__icon { width: 36px; height: 36px; }
		}

		/* NEW: lokasi input tampil di bawah card tipe pesanan (flow dokument, animasi & spacing) */
		.checkout-root .order-type-location-below {
		  padding: 6px 16px;
		  margin-top: 6px; /* dipendekkan agar proporsional seperti chekout.html */
		   display: flex;
		   justify-content: center;
		   transition: all 180ms ease;
		 }
		 .checkout-root .order-type-location-below .order-type__location-card {
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
		 .checkout-root .order-type-location-below.show .order-type__location-card {
		   opacity: 1;
		   transform: translateY(0);
		   max-height: 90px; /* reduced to keep compact */
		 }
		 .checkout-root .order-type-location-below .location-input {
		   width: 100%;
		   border: none;
		   outline: none;
		   background: transparent;
		   font-size: 14px;
		   color: #374151;
		 }

		/* small edit button for location row */
		.checkout-root .order-type-location-below .edit-btn {
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
		.checkout-root .order-type-location-below .edit-btn:hover { transform: translateY(-2px); }

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

		/* --- Restored summary / bottom-fixed styles (scoped to checkout-root) --- */
		.checkout-root .summary-card {
			background:#fff;
			border-radius:24px;
			padding:14px 16px;
			box-shadow:0 12px 26px rgba(15,23,42,0.08);
			margin-bottom:0;
		}
		.checkout-root .summary-title {
			font-weight:700;
			font-size:1rem;
			color:var(--text-dark);
			margin-bottom:8px;
		}
		.checkout-root .summary-row {
			display:flex;
			justify-content:space-between;
			align-items:center;
			margin:2px 0;
			font-size:0.95rem;
			color:var(--text-gray);
		}
		.checkout-root .summary-row.total {
			margin-top:8px;
			font-weight:700;
			font-size:1.02rem;
			color:var(--text-dark);
		}
		.checkout-root .summary-row.total .value {
			color:var(--red-price);
		}

		.checkout-root .bottom-fixed {
			position:fixed;
			left:50%;
			transform:translateX(-50%);
			bottom:0;
			width:100%;
			max-width:414px;
			padding:10px 16px 18px;
			background:linear-gradient(to top, rgba(243,244,246,1), rgba(243,244,246,0.9), rgba(243,244,246,0));
			box-sizing:border-box;
			z-index:20;
		}
		.checkout-root .bottom-fixed-inner { display:flex; flex-direction:column; gap:10px; }
		.checkout-root .primary-btn {
			width:100%;
			border:none;
			border-radius:999px;
			padding:14px 16px;
			background:var(--primary-yellow);
			color:var(--text-dark);
			font-weight:700;
			font-size:1rem;
			cursor:pointer;
			box-shadow:0 14px 26px rgba(250,204,21,0.55);
		}

		/* ...existing CSS continues... */
 			`}</style>

            <div className="checkout-root">
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

                    <div
                        className="notes-card"
                        role="button"
                        tabIndex={0}
                        onClick={openNotesModal}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openNotesModal(); }}
                    >
                        <div className="notes-icon" aria-hidden="true">
                            {/* playful pencil/sticky icon (simple SVG) */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#2C3E50" opacity="0.06" />
                                <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#F7DC6F" />
                                <path d="M14.06 4.94l3.75 3.75" stroke="#2C3E50" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>

                        <div className="notes-content">
                            <div className="notes-title">Catatan Untuk Dapur</div>
                            <div className={`notes-placeholder ${notes ? 'truncated' : ''}`}>
                                {notes ? notes : 'Contoh: Jangan pedas, tanpa sayur...'}
                            </div>
                        </div>

                        <div className="notes-action">Tambah</div>
                    </div>

                    {/* NOTES Modal (bottom sheet) - wired to notes state/handlers */}
                    <div className={`notes-modal-backdrop ${notesOpen ? 'show' : ''}`} onClick={closeNotesModal}>
                        <div className="notes-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="notes-modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--qx-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" fill="#2C3E50" /></svg>
                                    </div>
                                    <span className="notes-modal-title">Catatan Untuk Dapur</span>
                                </div>
                                <button className="notes-modal-close" onClick={closeNotesModal} aria-label="Tutup">×</button>
                            </div>

                            <textarea className="notes-textarea" value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Contoh: Jangan pedas, tanpa sayur..." />

                            <div className="notes-modal-footer">
                                <button className="notes-btn-clear" onClick={clearNotes}>Hapus</button>
                                <button className="notes-btn-save" onClick={saveNotes}>Simpan</button>
                            </div>
                        </div>
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
            </div>
        </>
    );
}
