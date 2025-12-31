'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { productsData, formatRupiah } from './productsData';
import ProductDetailModal from './ProductDetailModal';

export default function HomePixelPerfect() {
    const router = useRouter();
    const bannerRef = useRef(null);

    // --- STATE ---
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState({});
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [activeBannerIndex, setActiveBannerIndex] = useState(0);

    // load cart from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem('cart_v1');
            if (raw) setCart(JSON.parse(raw));
        } catch (e) { /* ignore */ }
    }, []);

    // persist cart to localStorage
    useEffect(() => {
        try { localStorage.setItem('cart_v1', JSON.stringify(cart)); } catch (e) { }
    }, [cart]);

    // sync cart across tabs/windows
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === 'cart_v1') {
                try { setCart(JSON.parse(e.newValue || '{}')); } catch (err) { }
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // --- LOGIC BANNER AUTO SLIDE ---
    useEffect(() => {
        const bannerTrack = bannerRef.current;
        if (!bannerTrack) return;

        let sliderDirection = 1;

        const interval = setInterval(() => {
            const cardWidth = bannerTrack.offsetWidth;
            const maxScroll = bannerTrack.scrollWidth - cardWidth;
            let nextScroll = bannerTrack.scrollLeft + (cardWidth * sliderDirection);

            if (nextScroll >= maxScroll) {
                nextScroll = maxScroll;
                sliderDirection = -1;
            } else if (nextScroll <= 0) {
                nextScroll = 0;
                sliderDirection = 1;
            }

            bannerTrack.scrollTo({ left: nextScroll, behavior: 'smooth' });

            const newIndex = Math.round(nextScroll / cardWidth);
            setActiveBannerIndex(newIndex);

        }, 3000);

        const handleScroll = () => {
            const scrollLeft = bannerTrack.scrollLeft;
            const cardWidth = bannerTrack.offsetWidth;
            setActiveBannerIndex(Math.round(scrollLeft / cardWidth));
        };
        bannerTrack.addEventListener('scroll', handleScroll);

        return () => {
            clearInterval(interval);
            if (bannerTrack) bannerTrack.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // --- LOGIC CART ---
    const filteredProducts = productsData.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCat = activeFilter === 'all' ? true : p.category === activeFilter;
        return matchSearch && matchCat;
    });

    const totalItemsInCart = Object.values(cart).reduce((a, b) => a + (Number(b) || 0), 0);

    const updateCart = (e, id, delta) => {
        if (e) e.stopPropagation();
        setCart(prev => {
            const current = parseInt(prev[id]) || 0;
            const next = current + delta;
            if (next <= 0) {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            }
            return { ...prev, [id]: next };
        });
    };

    const manualInputCart = (e, id) => {
        e.stopPropagation();
        const raw = e.target.value;
        if (raw === '') {
            setCart(prev => ({ ...prev, [id]: '' }));
            return;
        }
        const val = parseInt(raw) || 0;
        setCart(prev => {
            if (val <= 0) {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            }
            return { ...prev, [id]: val };
        });
    };

    const handleInputBlur = (e, id) => {
        const val = parseInt(e.target.value) || 0;
        if (val <= 0) {
            setCart(prev => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });
        }
    };

    // Handler modal: update cart + selectedProduct qty (live)
    const handleModalChangeQty = (delta) => {
        if (!selectedProduct) return;
        const id = selectedProduct.id;
        setCart(prev => {
            const current = prev[id] || 0;
            const next = Math.max(0, current + delta);
            const copy = { ...prev };
            if (next <= 0) delete copy[id];
            else copy[id] = next;
            // update selectedProduct qty immediately so modal shows correct value
            setSelectedProduct(curr => curr ? { ...curr, selectedQty: next } : curr);
            return copy;
        });
    };

    // When "Tambah ke Keranjang" di modal ditekan: ensure cart matches selectedQty, then close modal
    const handleModalAddToCart = () => {
        if (!selectedProduct) { setSelectedProduct(null); return; }
        const id = selectedProduct.id;
        const target = selectedProduct.selectedQty || 0;
        setCart(prev => {
            const copy = { ...prev };
            if (target <= 0) delete copy[id];
            else copy[id] = target;
            return copy;
        });
        setSelectedProduct(null);
    };

    const handleModalManualQty = (val) => {
        if (!selectedProduct) return;
        const id = selectedProduct.id;
        if (val === '') {
            setCart(prev => ({ ...prev, [id]: '' }));
            setSelectedProduct(curr => curr ? { ...curr, selectedQty: '' } : curr);
            return;
        }
        const num = parseInt(val) || 0;
        setCart(prev => {
            if (num <= 0) {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            }
            return { ...prev, [id]: num };
        });
        setSelectedProduct(curr => curr ? { ...curr, selectedQty: num } : curr);
    };

    return (
        <>
            {/* CSS STYLE BLOCK - Mengambil style langsung dari home.html */}
            <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        
        :root {
            --primary-yellow: #FACC15;
            --text-dark: #111827;
            --text-gray: #6B7280;
            --red-price: #EF4444;
            --blue-banner: #1F2937;
            --white: #FFFFFF;
            --shadow-sm: 0 8px 15px rgba(15, 23, 42, 0.06);
            --shadow-md: 0 18px 35px rgba(15, 23, 42, 0.14);
        }

        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; font-family: 'Poppins', sans-serif; background-color: #e5e7eb; }
        
        .app-wrapper {
            width: 100%; max-width: 414px; background-color: #F9FAFB;
            min-height: 100vh; margin: 0 auto; position: relative;
            box-shadow: 0 0 0 1px rgba(15,23,42,0.03), var(--shadow-md);
            overflow: hidden; display: flex; flex-direction: column;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Header */
        .header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 16px 22px; background: var(--white); position: sticky; top: 0; z-index: 50;
            box-shadow: 0 1px 0 rgba(15,23,42,0.04);
        }
        .badge {
            background: var(--primary-yellow); padding: 10px 22px; border-radius: 999px;
            font-weight: 600; color: var(--text-dark); box-shadow: 0 8px 16px rgba(234, 179, 8, 0.4);
        }

        /* Hero */
        .hero { padding: 22px 22px 18px 22px; background: var(--white); border-radius: 0 0 32px 32px; }
        .search-box {
            background: #F3F4F6; border-radius: 999px; padding: 12px 18px;
            display: flex; align-items: center; gap: 12px;
        }

        /* Banner */
        .banner-track {
            display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
            gap: 14px; padding: 0 22px; scroll-behavior: smooth;
        }
        .banner-card {
            flex: 0 0 100%; scroll-snap-align: center;
            background-color: var(--blue-banner); border-radius: 26px;
            padding: 18px; display: flex; align-items: center; gap: 16px;
            color: white !important; /* Force White Text */
            height: 120px; position: relative; overflow: hidden;
        }
        
        /* Menu Grid */
        .menu-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
            padding: 0 22px 96px 22px;
        }
        .menu-card {
            background: white; border-radius: 22px; padding: 10px 10px 12px;
            box-shadow: var(--shadow-sm); display: flex; flex-direction: column;
            position: relative; cursor: pointer;
        }

        /* QTY Controls */
        .qty-bar {
            position: absolute; 
            left: 58%; /* Sesuai posisi tombol + awal */
            bottom: 12px; 
            transform: translateX(-50%);
            display: flex; align-items: center; justify-content: center; z-index: 20;
        }
        .qty-track {
            min-width: 80px; height: 26px; background: white; border-radius: 999px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 3px 8px rgba(15,23,42,0.10); position: relative; z-index: 1;
        }
        .qty-btn {
            width: 38px; height: 38px; border-radius: 50%; border: none;
            background: var(--primary-yellow); display: flex; align-items: center;
            justify-content: center; font-size: 1.3rem; font-weight: 600;
            box-shadow: 0 8px 16px rgba(250, 204, 21, 0.55); cursor: pointer;
            position: relative; z-index: 2; color: var(--text-dark);
        }

        /* FAB Styling */
        .fab-container {
            position: fixed; bottom: 26px; right: max(20px, calc(50vw - 187px));
            display: flex; flex-direction: column; gap: 14px; z-index: 100; pointer-events: none;
        }
        .fab {
            width: 60px; height: 60px; border-radius: 50%; display: flex;
            align-items: center; justify-content: center; cursor: pointer;
            box-shadow: 0 20px 35px rgba(15,23,42,0.35); pointer-events: auto;
            transition: transform 0.2s;
        }
        .fab:active { transform: scale(0.95); }

        /* PERBAIKAN WARNA ICON (Sesuai home.html) */
        .fab-cart {
            background-color: var(--primary-yellow);
            color: var(--text-dark);
        }
        .fab-notif {
            background-color: #111827; /* --blue-fab */
            color: #FFFFFF !important; /* Putih Mutlak */
        }
        .cart-badge {
            position: absolute;
            top: -3px;
            right: -3px;
            background-color: #EF4444; /* --red-price */
            color: #FFFFFF !important; /* Angka Putih */
            font-size: 0.7rem;
            font-weight: 700;
            min-width: 22px;
            height: 22px;
            padding: 0 6px;
            border-radius: 999px;
            border: 2px solid #FFFFFF; /* Border Putih */
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s;
        }
      `}</style>

            <div className="app-wrapper">

                {/* HEADER */}
                <header className="header">
                    <div className="flex items-center gap-[8px]">
                        <div className="h-[38px] max-w-[140px] flex items-center">
                            <img src="/assets/logo.png" alt="Logo" className="h-full w-auto object-contain"
                                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerText = 'Logo' }}
                            />
                        </div>
                        <span className="font-semibold text-[0.9rem] text-[#6B7280]">Logo</span>
                    </div>
                    <div className="badge">Meja 12</div>
                </header>

                <div className="flex-1">

                    {/* HERO */}
                    <section className="hero">
                        <h1 className="text-[1.9rem] font-extrabold text-[#111827] mb-[18px]">
                            Selamat Datang!
                        </h1>
                        <div className="search-box">
                            <svg className="w-[20px] h-[20px]" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            <input
                                type="text"
                                placeholder="Mau pesan apa hari ini?"
                                className="bg-transparent border-none w-full outline-none text-[0.95rem] text-[#111827]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </section>

                    {/* BANNER */}
                    <section className="mt-[20px] relative">
                        <div className="banner-track no-scrollbar" ref={bannerRef}>
                            {/* Card 1 */}
                            <div className="banner-card">
                                <img src="/assets/Paket_Omelet.png" className="w-[90px] h-[90px] rounded-[18px] object-cover bg-gray-600 flex-shrink-0" />
                                <div>
                                    <h3 className="text-[1.05rem] font-bold leading-[1.35] mb-[4px]">Paket Hemat<br />Nasi Omelet</h3>
                                    <p className="text-[0.9rem] opacity-95">Hanya Rp 10.000</p>
                                </div>
                            </div>
                            {/* Card 2 */}
                            <div className="banner-card">
                                <img src="/assets/Paket_Nasi_Katsu.png" className="w-[90px] h-[90px] rounded-[18px] object-cover bg-gray-600 flex-shrink-0" />
                                <div>
                                    <h3 className="text-[1.05rem] font-bold leading-[1.35] mb-[4px]">Paket Mantap<br />Nasi Katsu</h3>
                                    <p className="text-[0.9rem] opacity-95">Hanya Rp 15.000</p>
                                </div>
                            </div>
                            {/* Card 3 (Background konsisten) */}
                            <div className="banner-card">
                                <img src="/assets/Ar.png" className="w-[90px] h-[90px] rounded-[18px] object-contain p-1 bg-white/10 flex-shrink-0" />
                                <div>
                                    <h3 className="text-[1.05rem] font-bold leading-[1.35] mb-[4px]">Nikmati Melihat<br />Menu Langsung</h3>
                                    <p className="text-[0.9rem] opacity-95">Dengan Fitur AR</p>
                                </div>
                            </div>
                        </div>
                        {/* Dots Indicator */}
                        <div className="flex justify-center gap-[6px] mt-[8px]">
                            {[0, 1, 2].map(idx => (
                                <div key={idx}
                                    className={`h-[6px] rounded-full transition-all duration-300 ${activeBannerIndex === idx ? 'w-[18px] bg-[#1F2937]' : 'w-[6px] bg-[#D1D5DB]'}`}
                                ></div>
                            ))}
                        </div>
                    </section>

                    {/* CATEGORIES */}
                    <nav className="flex gap-[10px] overflow-x-auto px-[22px] pt-[22px] pb-[18px] no-scrollbar">
                        {['all', 'makanan', 'minuman', 'cemilan'].map(cat => {
                            const isActive = activeFilter === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveFilter(cat)}
                                    className={`
                                  border-none px-[20px] py-[9px] rounded-full text-[0.92rem] font-semibold whitespace-nowrap cursor-pointer flex items-center gap-[8px] transition-all
                                  ${isActive ? 'bg-[#FACC15] text-[#111827] shadow-[0_10px_20px_rgba(250,204,21,0.5)]' : 'bg-white text-[#6B7280] shadow-[0_8px_18px_rgba(15,23,42,0.03)]'}
                              `}
                                >
                                    {cat === 'all' && (
                                        <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"></path></svg>
                                    )}
                                    {cat === 'all' ? 'Terlaris' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </button>
                            )
                        })}
                    </nav>

                    {/* MENU GRID */}
                    <main className="menu-grid">
                        {filteredProducts.map(item => {
                            const qty = cart[item.id] ?? 0;
                            return (
                                <div
                                    key={item.id}
                                    className="menu-card"
                                    // buka detail: tampilkan modal produk (konsisten dengan page.jsx)
                                    onClick={() => setSelectedProduct({ ...item, selectedQty: qty })}
                                >
                                    {/* Image */}
                                    <div className="relative w-full aspect-[4/3.3] rounded-[18px] overflow-hidden mb-[10px] bg-[#E5E7EB]">
                                        {item.ar && (
                                            <div className="absolute top-[10px] left-[10px] bg-transparent z-10">
                                                <img src="/assets/Ar_Icon.png" className="w-[40px] h-[18px] object-contain block" />
                                            </div>
                                        )}
                                        <img src={`/assets/${item.imgFile}`} className="w-full h-full object-cover" />

                                        {/* Qty Controller */}
                                        {qty === 0 ? (
                                            <button
                                                className="absolute bottom-[10px] right-[10px] w-[38px] h-[38px] rounded-full flex items-center justify-center border-none cursor-pointer text-[1.5rem] font-medium text-[#111827] z-20 bg-[#FACC15] shadow-[0_10px_18px_rgba(250,204,21,0.55)]"
                                                onClick={(e) => updateCart(e, item.id, 1)}
                                            >
                                                +
                                            </button>
                                        ) : (
                                            <div className="qty-bar" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="qty-btn"
                                                    style={{ marginRight: '-18px' }}
                                                    onClick={(e) => updateCart(e, item.id, -1)}
                                                >
                                                    −
                                                </button>
                                                <div className="qty-track">
                                                    <input
                                                        type="number"
                                                        className="w-[50px] border-none bg-transparent text-center font-semibold text-[0.9rem] text-[#111827] outline-none"
                                                        value={qty}
                                                        onChange={(e) => manualInputCart(e, item.id)}
                                                        onBlur={(e) => handleInputBlur(e, item.id)}
                                                    />
                                                </div>
                                                <button
                                                    className="qty-btn"
                                                    style={{ marginLeft: '-18px' }}
                                                    onClick={(e) => updateCart(e, item.id, 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-[0.95rem] font-bold text-[#111827] mt-[2px] mb-[2px] leading-[1.3]">{item.name}</h3>
                                    <div className="text-[0.9rem] font-bold text-[#EF4444]">{formatRupiah(item.price)}</div>
                                </div>
                            );
                        })}
                    </main>
                </div>

                {/* FABs */}
                <div className="fab-container">
                    {/* Cart FAB */}
                    <div
                        className="fab fab-cart relative"
                        onClick={() => {
                            // bangun state checkout dari cart dan productsData
                            const items = Object.entries(cart).map(([key, qty]) => {
                                const idNum = Number(key);
                                const p = productsData.find(x => x.id === idNum);
                                return {
                                    id: p?.id ?? idNum,
                                    name: p?.name ?? 'Item',
                                    price: p?.price ?? 0,
                                    qty,
                                    imgFile: p?.imgFile ?? null
                                };
                            }).filter(it => it.qty > 0);
                            const subtotal = items.reduce((s, it) => s + (it.price || 0) * it.qty, 0);
                            const state = { items, subtotal, orderType: 'dinein' };
                            router.push(`/checkout?state=${encodeURIComponent(JSON.stringify(state))}`);
                        }}
                    >
                        {/* Badge Keranjang: Warna Putih Di-Force */}
                        <div className={`cart-badge ${totalItemsInCart > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                            {totalItemsInCart}
                        </div>
                        <svg className="w-[24px] h-[24px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    </div>

                    {/* Notif FAB: Warna Putih Di-Force */}
                    <div
                        className="fab fab-notif"
                        onClick={() => router.push('/status')}
                    >
                        <svg className="w-[24px] h-[24px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                    </div>
                </div>

                {/* Product detail sebagai modal terpisah komponen */}
                <ProductDetailModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onChangeSelectedQty={(delta) => handleModalChangeQty(delta)}
                    onManualInput={(val) => handleModalManualQty(val)}
                    onAddToCart={() => handleModalAddToCart()}
                />
            </div>
        </>
    );
}