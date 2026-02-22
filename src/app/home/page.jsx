'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

import { getProducts, getCategories, getBanners, getImageUrl, getDynamicUrl } from '../../services/api';
import ProductDetailModal from './ProductDetailModal';
import ArIconRGB from './ArIconRGB';

const formatRupiah = (price) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(price);
};

export default function HomePixelPerfect() {
    const router = useRouter();
    const bannerRef = useRef(null);

    // --- SECURITY: ROUTE GUARD ---
    useEffect(() => {
        const guardHome = () => {
            try {
                const stored = localStorage.getItem('customer_table');
                const name = localStorage.getItem('customerName'); // Security: Must have name

                if (!stored || !name) {
                    if (process.env.NODE_ENV !== 'production') console.warn("Access Denied: No customer table or name found");
                    router.replace('/'); // Redirect to Landing Page
                    return;
                }
                const parsed = JSON.parse(stored);
                if (!parsed || !parsed.id) {
                    router.replace('/');
                    return;
                }
            } catch (e) {
                router.replace('/');
            }
        };
        guardHome();
    }, []);

    // --- STATE ---
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [banners, setBanners] = useState([]);
    const [store, setStore] = useState(null); // Add Store State
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');

    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState({});
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [activeBannerIndex, setActiveBannerIndex] = useState(0);
    const [customerTable, setCustomerTable] = useState(null);
    const [isSearchMode, setIsSearchMode] = useState(false);

    // --- HARDWARE BACK BUTTON & SEARCH LOGIC ---
    useEffect(() => {
        const handlePopState = () => {
            // Jika user menekan tombol back HP saat mode search, matikan mode search
            if (isSearchMode) {
                setIsSearchMode(false);
                setSearchQuery('');
                setActiveFilter('all');
                // Force blur agar input tidak "stuck" di state focus
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
            }
        };

        // Tambahkan listener
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isSearchMode]);

    const handleSearchFocus = () => {
        if (!isSearchMode) {
            setIsSearchMode(true);
            // Push state history agar tombol back HP berfungsi untuk menutup search
            window.history.pushState({ search: true }, '', window.location.href);
        }
    };

    const handleSearchCancel = () => {
        // Trigger back browser (akan ditangkap oleh popstate listener)
        window.history.back();
    };

    // --- FETCH FUNCTIONS (INDEPENDENT) ---
    const fetchDataStore = async (sid) => {
        try {
            const storeRes = await import('../../services/api').then(mod => mod.getStore(sid));
            if (storeRes && storeRes.success) {
                setStore(storeRes.data);
            }
        } catch (error) {
            console.error('Error fetching store:', error);
        }
    };

    const fetchDataProducts = async (sid, isSilent = false) => {
        try {
            // Fallback to localStorage if sid is missing (common in socket events)
            let storeIdToUse = sid;
            if (!storeIdToUse) {
                try {
                    const stored = localStorage.getItem('customer_table');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed.location && parsed.location.storeId) {
                            storeIdToUse = parsed.location.storeId;
                        }
                    }
                } catch (e) {
                    console.error("Error parsing customer table for ID in fallback", e);
                }
            }

            if (!storeIdToUse) {
                console.warn("⚠️ fetchDataProducts: No Store ID found.");
                return;
            }

            // Only show loader if NOT silent (initial load)
            if (!isSilent && products.length === 0) setIsLoading(true);

            const prodsRes = await getProducts(storeIdToUse);
            const productsData = prodsRes.data && Array.isArray(prodsRes.data)
                ? prodsRes.data
                : (Array.isArray(prodsRes) ? prodsRes : []);
            setProducts(productsData);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    };

    const fetchDataBanners = async (sid) => {
        const staticArBanner = {
            id: 'static-ar',
            title: 'Nikmati Melihat Menu Langsung Di Meja',
            subtitle: 'Dengan Fitur AR',
            highlightText: '',
            image: '/assets/Ar.png',
            isStatic: true
        };

        try {
            // Fallback to localStorage if sid is missing
            let storeIdToUse = sid;
            if (!storeIdToUse) {
                try {
                    const stored = localStorage.getItem('customer_table');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed.location && parsed.location.storeId) {
                            storeIdToUse = parsed.location.storeId;
                        }
                    }
                } catch (e) {
                    console.error("Error parsing customer table for ID in banner fallback", e);
                }
            }

            if (!storeIdToUse) {
                console.warn("⚠️ fetchDataBanners: No Store ID found.");
                setBanners([staticArBanner]);
                return;
            }

            const bannersRes = await getBanners(storeIdToUse);
            const bannersData = bannersRes.data && Array.isArray(bannersRes.data)
                ? bannersRes.data
                : (Array.isArray(bannersRes) ? bannersRes : []);
            setBanners([...bannersData, staticArBanner]);
        } catch (error) {
            console.error('Error fetching banners:', error);
            setBanners([staticArBanner]);
        }
    };

    const fetchDataCategories = async (sid) => {
        try {
            const catsRes = await getCategories(sid);
            const categoriesData = catsRes.data && Array.isArray(catsRes.data)
                ? catsRes.data
                : (Array.isArray(catsRes) ? catsRes : []);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    // --- INITIAL DATA FETCHING ---
    useEffect(() => {
        const initData = async () => {
            setIsLoading(true);
            try {
                // Get Store ID from LocalStorage (Customer Table)
                let currentStoreId = null;
                try {
                    const stored = localStorage.getItem('customer_table');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        // Access storeId from location relation: location.storeId
                        // Or if direct relation exists. Assuming table -> location -> storeId
                        if (parsed.location && parsed.location.storeId) {
                            currentStoreId = parsed.location.storeId;
                        }
                    }
                } catch (e) {
                    console.error("Error parsing customer table for ID", e);
                }

                if (!currentStoreId) {
                    console.warn("⚠️ No Store ID found. PWA might show empty data.");
                }

                await Promise.all([
                    fetchDataStore(currentStoreId),
                    fetchDataProducts(currentStoreId),
                    fetchDataCategories(currentStoreId),
                    fetchDataBanners(currentStoreId)
                ]);
            } catch (err) {
                console.error('Error loading initial data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        initData();
    }, []);

    // --- SYNC SELECTED PRODUCT (REALTIME) ---
    useEffect(() => {
        if (selectedProduct) {
            // Check if product still exists in the latest products list
            const updated = products.find(p => p.id === selectedProduct.id);
            if (updated) {
                // Keep the client-side 'selectedQty' but update data from server
                setSelectedProduct(prev => ({
                    ...updated,
                    selectedQty: prev.selectedQty
                }));
            } else {
                // If product is not found (deleted/inactive), close modal
                // Note: This also handles the case where products becomes empty []
                setSelectedProduct(null);
            }
        }
    }, [products]);

    // --- SOCKET.IO LISTENER ---
    const updateTimeoutRef = useRef(null);
    const socketEventCountRef = useRef(0);

    useEffect(() => {
        // Initialize Socket.io with Dynamic URL
        const socketUrl = getDynamicUrl();
        if (process.env.NODE_ENV !== 'production') console.log("🔌 Socket connecting to:", socketUrl);

        const socket = io(socketUrl, {
            transports: ['websocket', 'polling'], // Fallback for PaaS
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        const handleUpdate = (type) => {
            // Security: Rate limit socket events (max 20 per minute)
            socketEventCountRef.current++;
            if (socketEventCountRef.current > 20) return;
            setTimeout(() => { socketEventCountRef.current = Math.max(0, socketEventCountRef.current - 1); }, 60000);

            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);

            updateTimeoutRef.current = setTimeout(() => {
                if (process.env.NODE_ENV !== 'production') console.log(`🔄 Socket event: ${type} received.`);
                // Fetch both to ensure consistency, efficient enough for small data
                // Pass true for isSilent to avoid full page loading spinner
                fetchDataProducts(null, true);
                fetchDataBanners();
            }, 1500); // 1.5s debounce to prevent crash loops
        };

        // Event Listener: Products Updated
        socket.on('products_updated', () => handleUpdate('products_updated'));

        // Event Listener: Banners Updated
        socket.on('banners_updated', () => handleUpdate('banners_updated'));

        // Cleanup saat unmount
        return () => {
            socket.disconnect();
            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        };
    }, []);

    // load cart from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem('cart_v1');
            if (raw) {
                const parsed = JSON.parse(raw);
                // Security: Validate cart structure
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    const safeCart = {};
                    for (const [key, val] of Object.entries(parsed)) {
                        // Only allow numeric keys with numeric values
                        if (/^\d+$/.test(key) && typeof val === 'number' && val > 0 && val <= 99) {
                            safeCart[key] = val;
                        }
                    }
                    setCart(safeCart);
                }
            }
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

    // Load Info Meja dari LocalStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('customer_table');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Security: Validate table data structure
                if (parsed && typeof parsed === 'object' && parsed.id && typeof parsed.name === 'string') {
                    setCustomerTable(parsed);
                }
            }
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') console.error('Gagal memuat info meja:', error);
        }
    }, []);

    // --- LOGIC BANNER AUTO SLIDE ---
    useEffect(() => {
        const bannerTrack = bannerRef.current;
        if (!bannerTrack || !banners || banners.length === 0) return;

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
    }, [banners]);

    // --- LOGIC FILTER & CART ---
    // SAFETY CHECK: Pastikan products adalah array sebelum di-filter
    const productList = Array.isArray(products) ? products : [];

    const filteredProducts = productList.filter((p) => {
        const matchSearch = p.name ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        // Gunakan categoryId dari backend
        const matchCat = activeFilter === 'all' ? true : String(p.categoryId) === String(activeFilter);
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
            return { ...prev, [id]: Math.min(next, 99) }; // CAP at 99
        });
    };

    const manualInputCart = (e, id) => {
        e.stopPropagation();
        const raw = e.target.value;
        if (raw === '') {
            setCart(prev => ({ ...prev, [id]: '' }));
            return;
        }
        const val = Math.min(Math.max(parseInt(raw) || 0, 0), 99); // Clamp 0-99
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
            const next = Math.min(Math.max(0, current + delta), 99);
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
        const num = Math.min(Math.max(parseInt(val) || 0, 0), 99);
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
            {/* CSS STYLE BLOCK */}
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

        /* WARNA ICON */
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
        @keyframes rgbShimmer {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
      `}</style>

            <div className="app-wrapper">

                {/* HEADER */}
                <header className={`header transition-all duration-300 ease-in-out ${isSearchMode ? 'hidden' : 'flex'}`}>
                    <div className="flex items-center gap-[8px]">
                        <div className="h-[38px] max-w-[140px] flex items-center">
                            <img
                                src={store?.logo ? getImageUrl(store.logo) : "/assets/logo.png"}
                                alt="Logo"
                                className="h-full w-auto object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    // Security: Use textContent instead of innerText, sanitize name
                                    const safeName = (store?.name || 'Resto').replace(/[<>&"']/g, '').substring(0, 30);
                                    e.target.parentElement.textContent = safeName;
                                }}
                            />
                        </div>
                        <span className="font-semibold text-[0.9rem] text-[#6B7280]">
                            {store?.name || 'Dapur QuackXel'}
                        </span>
                    </div>
                    <div className="badge">
                        {(() => {
                            if (!customerTable) return 'Meja ...';
                            // Parsing logic aman untuk object/string
                            const locationName = typeof customerTable.location === 'object' ? customerTable.location?.name : customerTable.location;
                            return `${locationName || ''} ${customerTable.name}`;
                        })()}
                    </div>
                </header>

                <div className="flex-1">

                    {/* HERO & SEARCH BAR */}
                    <section className={`transition-all duration-300 ${isSearchMode ? 'sticky top-0 z-[100] bg-white p-[10px] shadow-sm pb-[14px]' : 'hero'}`}>
                        <h1
                            className={`text-[1.9rem] font-extrabold text-[#111827] mb-[18px] transition-all duration-300 origin-left 
                            ${isSearchMode ? 'hidden' : 'block'}`}
                        >
                            Selamat Datang!
                        </h1>
                        <div className={`transition-all duration-300 flex items-center ${isSearchMode ? 'gap-[10px] bg-[#F3F4F6] rounded-[10px] px-[10px] py-[8px]' : 'search-box'}`}>

                            {/* Icon: Magnifying Glass (Normal) or Back Arrow (Search Mode) */}
                            {isSearchMode ? (
                                <button onClick={handleSearchCancel} className="bg-transparent border-none p-0 cursor-pointer flex items-center justify-center">
                                    <svg className="w-[24px] h-[24px] text-[#111827]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                                </button>
                            ) : (
                                <svg className="w-[20px] h-[20px] text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            )}

                            <input
                                type="text"
                                placeholder={isSearchMode ? "Cari menu favoritmu..." : "Mau pesan apa hari ini?"}
                                className={`bg-transparent border-none w-full outline-none text-[#111827] ${isSearchMode ? 'text-[1rem]' : 'text-[0.95rem]'}`}
                                value={searchQuery}
                                onFocus={handleSearchFocus}
                                onClick={handleSearchFocus} // Backup trigger jika onFocus tidak fire
                                maxLength={20}
                                onChange={(e) => {
                                    // Security: Sanitize search input
                                    const raw = e.target.value;
                                    const safe = raw
                                        .replace(/[<>{}()\[\]\\\/;`$'"]/g, '') // Strip dangerous chars
                                        .substring(0, 20);                       // Hard limit
                                    setSearchQuery(safe);
                                }}
                                autoFocus={isSearchMode}
                            />
                        </div>
                    </section>

                    {/* BANNER */}
                    <div className={`${isSearchMode ? 'hidden' : 'block transition-all duration-300 ease-in-out opacity-100 h-auto mt-[20px]'}`}>
                        <section className="relative">
                            <div className="banner-track no-scrollbar" ref={bannerRef}>
                                {banners.length > 0 ? (
                                    banners.map((banner) => (
                                        <div
                                            className="banner-card"
                                            key={banner.id}
                                            style={banner.isStatic ? { background: 'linear-gradient(45deg, #2C3E50, #34495E)' } : {}}
                                        >
                                            <img
                                                src={banner.isStatic ? banner.image : getImageUrl(banner.image)}
                                                className={`w-[90px] h-[90px] rounded-[18px] flex-shrink-0 ${banner.isStatic ? 'object-contain p-[5px] bg-white/10' : 'object-cover bg-gray-600'}`}
                                                alt={banner.title}
                                                onError={(e) => e.target.style.display = 'none'} // Safety jika gambar error
                                            />
                                            <div className="flex flex-col justify-center gap-0">
                                                <h3 className="text-[1rem] font-bold text-white leading-[1.15] mb-[-2px]">
                                                    {banner.title}
                                                </h3>
                                                <p className="text-[0.75rem] text-white/70 leading-[0.9] mb-[1px]">
                                                    {banner.subtitle || ""}
                                                </p>
                                                <p className="text-[0.85rem] font-bold text-[#FDD85D] leading-[0.9] mt-0">
                                                    {banner.highlightText}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    // Fallback jika banner kosong (opsional, bisa spinner atau statis)
                                    <div className="banner-card">
                                        <div className="w-[90px] h-[90px] rounded-[18px] bg-gray-600 flex-shrink-0 animate-pulse"></div>
                                        <div>
                                            <div className="h-4 w-32 bg-gray-500 rounded mb-2 animate-pulse"></div>
                                            <div className="h-3 w-20 bg-gray-500 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Dots Indicator */}
                            <div className="flex justify-center gap-[6px] mt-[8px]">
                                {/* Hanya render dots jika ada banners */}
                                {banners.length > 0 && banners.map((_, idx) => (
                                    <div key={idx}
                                        className={`h-[6px] rounded-full transition-all duration-300 ${activeBannerIndex === idx ? 'w-[18px] bg-[#1F2937]' : 'w-[6px] bg-[#D1D5DB]'}`}
                                    ></div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* CATEGORIES */}
                    <div className={`${isSearchMode ? 'hidden' : 'block transition-all duration-300 ease-in-out opacity-100 h-auto'}`}>
                        <nav className="flex gap-[10px] overflow-x-auto px-[22px] pt-[22px] pb-[18px] no-scrollbar">
                            {/* Tombol Terlaris / Semua */}
                            <button
                                onClick={() => setActiveFilter('all')}
                                className={`
                                      border-none px-[20px] py-[9px] rounded-full text-[0.92rem] font-semibold whitespace-nowrap cursor-pointer flex items-center gap-[8px] transition-all
                                      ${activeFilter === 'all' ? 'bg-[#FACC15] text-[#111827] shadow-[0_10px_20px_rgba(250,204,21,0.5)]' : 'bg-white text-[#6B7280] shadow-[0_8px_18px_rgba(15,23,42,0.03)]'}
                                  `}
                            >
                                {activeFilter === 'all' && (
                                    <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"></path></svg>
                                )}
                                Semua
                            </button>

                            {/* Kategori Dinamis dari API */}
                            {Array.isArray(categories) && categories.map((cat) => {
                                const isActive = activeFilter === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveFilter(cat.id)}
                                        className={`
                                            border-none px-[20px] py-[9px] rounded-full text-[0.92rem] font-semibold whitespace-nowrap cursor-pointer flex items-center gap-[8px] transition-all
                                            ${isActive ? 'bg-[#FACC15] text-[#111827] shadow-[0_10px_20px_rgba(250,204,21,0.5)]' : 'bg-white text-[#6B7280] shadow-[0_8px_18px_rgba(15,23,42,0.03)]'}
                                        `}
                                    >
                                        {cat.name}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* MENU GRID */}
                    <main className="menu-grid">
                        {isLoading ? (
                            <div className="col-span-2 text-center py-10 text-gray-500 font-medium">
                                Memuat Menu...
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="col-span-2 text-center py-10 text-gray-400">
                                Produk tidak ditemukan.
                            </div>
                        ) : filteredProducts.map((item) => {
                            const qty = cart[item.id] ?? 0;
                            const imageUrl = getImageUrl(item.image);
                            const isHabis = !item.isActive;

                            return (
                                <div
                                    key={item.id}
                                    className="menu-card"
                                    onClick={() => !isHabis && setSelectedProduct({ ...item, selectedQty: qty })}
                                >
                                    {/* Image */}
                                    <div className="relative w-full aspect-[4/3.3] rounded-[18px] overflow-hidden mb-[10px] bg-[#E5E7EB]">
                                        {item.isArActive && (
                                            <div className="absolute top-[10px] left-[10px] z-10 w-[36px] h-[36px]">
                                                <ArIconRGB />
                                            </div>
                                        )}
                                        <img
                                            src={getImageUrl(item.image)}
                                            className={`w-full h-full object-cover ${isHabis ? 'grayscale opacity-60' : ''}`}
                                            alt={item.name}
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = '/assets/logo.png'; // Fallback ke logo atau placeholder lokal
                                            }}
                                        />

                                        {/* Overlay HABIS jika tidak aktif */}
                                        {isHabis && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                                                <span className="text-white font-bold text-lg tracking-wider border-2 border-white px-3 py-1 rounded-lg transform -rotate-12">
                                                    HABIS
                                                </span>
                                            </div>
                                        )}

                                        {/* Qty Controller (Hanya muncul jika TIDAK habis) */}
                                        {!isHabis && (
                                            qty === 0 ? (
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
                                            )
                                        )}
                                    </div>

                                    <h3 className={`text-[0.95rem] font-bold mt-[2px] mb-[2px] leading-[1.3] ${isHabis ? 'text-gray-400' : 'text-[#111827]'}`}>
                                        {item.name}
                                    </h3>
                                    <div className={`text-[0.9rem] font-bold ${isHabis ? 'text-gray-400' : 'text-[#EF4444]'}`}>
                                        {formatRupiah(item.price)}
                                    </div>
                                    {isHabis && (
                                        <div className="text-[0.75rem] font-bold text-gray-400 mt-1">Stok Habis</div>
                                    )}
                                </div>
                            );
                        })}
                    </main>
                </div>

                {/* FABs */}
                <div className="fab-container">
                    <div
                        className="fab fab-cart relative"
                        onClick={() => {
                            const items = Object.entries(cart).map(([key, qty]) => {
                                const idNum = Number(key);
                                const p = products.find(x => x.id === idNum);
                                // Security: Validate qty is a reasonable number
                                const safeQty = Math.min(Math.max(parseInt(qty) || 0, 0), 99);
                                return {
                                    id: p?.id ?? idNum,
                                    name: p?.name ?? 'Item',
                                    price: p?.price ?? 0,
                                    qty: safeQty,
                                    image: p?.image ?? null
                                };
                            }).filter(it => it.qty > 0 && Number.isFinite(it.price) && it.price >= 0);

                            const subtotal = items.reduce((s, it) => s + (it.price || 0) * it.qty, 0);
                            const state = { items, subtotal, orderType: 'dinein' };

                            // Security: Use sessionStorage instead of URL for state transfer
                            try { sessionStorage.setItem('checkout_state', JSON.stringify(state)); } catch (e) { }
                            router.push('/checkout');
                        }}
                    >
                        <div className={`cart-badge ${totalItemsInCart > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                            {totalItemsInCart}
                        </div>
                        <svg className="w-[24px] h-[24px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    </div>

                    <div
                        className="fab fab-notif"
                        onClick={() => router.push('/status')}
                    >
                        <svg className="w-[24px] h-[24px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                    </div>
                </div>

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