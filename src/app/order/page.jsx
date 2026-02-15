'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getOrderByTransactionCode, getStore } from '../../services/api';

export default function ReceiptPage() {
    const router = useRouter();
    const [orderData, setOrderData] = useState({ id: '', items: [], method: 'QRIS', date: '', meta: {}, status: 'paid', storeName: '' });

    useEffect(() => {
        // --- 1. Parsing Order State / Params ---
        const parseOrderState = async () => {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('state');
            let parsed = null;

            try {
                if (raw) {
                    parsed = JSON.parse(decodeURIComponent(raw));
                } else {
                    const saved = localStorage.getItem('order_state_v1');
                    if (saved) parsed = JSON.parse(saved);
                }

                if (parsed) {
                    const items = Array.isArray(parsed.items) ? parsed.items : [];
                    const paymentMethod = parsed.method || 'QRIS';
                    const id = parsed.id || `MP${Date.now()}`;
                    const date = parsed.date || new Date().toISOString();
                    const status = (paymentMethod === 'cash') ? 'unpaid' : 'paid';

                    if (items.length > 0) {
                        setOrderData(prev => ({
                            ...prev,
                            id, items, method: paymentMethod, date, meta: parsed.meta || {}, status, transactionCode: parsed.transactionCode, storeName: parsed.storeName || ''
                        }));
                        return; // Done if items exist
                    }

                    if (parsed.transactionCode || parsed.id) {
                        const codeToFetch = parsed.transactionCode || parsed.id;
                        fetchOrderByCode(codeToFetch);
                        return;
                    }
                }
            } catch (e) {
                console.error("Parse error", e);
            }

            // Fallback: Fetch by ID param
            const fallbackId = params.get('orderId') || params.get('id');
            if (fallbackId) {
                fetchOrderByCode(fallbackId);
            } else if (!parsed) {
                // Nothing found
                setOrderData(prev => ({ ...prev, id: `MP${Date.now()}`, date: new Date().toISOString(), transactionCode: '-' }));
            }
        };

        const fetchOrderByCode = (code) => {
            getOrderByTransactionCode(code).then(res => {
                if (res.success && res.data) {
                    const order = res.data;
                    setOrderData({
                        id: order.id,
                        items: order.items.map(i => ({
                            name: i.product.name,
                            price: i.priceSnapshot,
                            qty: i.quantity,
                            image: ''
                        })),
                        method: order.paymentMethod || 'QRIS',
                        date: order.createdAt,
                        meta: {},
                        status: order.paymentStatus === 'Paid' ? 'paid' : 'unpaid',
                        transactionCode: order.transactionCode,
                        storeName: order.store?.name || ''
                    });
                }
            }).catch(e => console.error(e));
        };

        parseOrderState();

        // --- 2. Fetch Store Name (Independent Logic) ---
        // Try to get store name from local storage if orderData didn't have it
        const fetchStoreName = async () => {
            try {
                const storedTable = localStorage.getItem('customer_table');
                if (storedTable) {
                    const parsedTable = JSON.parse(storedTable);
                    const storeId = parsedTable.location?.storeId;

                    if (storeId) {
                        const storeRes = await getStore(storeId);
                        if (storeRes && storeRes.success && storeRes.data) {
                            setOrderData(prev => ({ ...prev, storeName: storeRes.data.name }));
                        }
                    }
                }
            } catch (e) {
                console.error("Store fetch error", e);
            }
        };

        // Ensure we try to fetch store name if it's missing
        fetchStoreName();

    }, []);

    const formatRupiah = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');

    const total = (orderData.items || []).reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
    const orderDate = orderData.date ? new Date(orderData.date) : new Date();
    const formattedDate = orderDate.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <>
            <style jsx global>{`
        :root {
            --bg-page: #F3F4F6;
            --bg-card: #FFFFFF;
            --bg-header: #2A3B5A;
            --text-main: #111827;
            --text-sub: #6B7280;
            --accent-green: #15803D;
            --accent-green-soft: #DCFCE7;
            --border-soft: #D1D5DB;
            --yellow-btn: #F0C419;
        }
        * { margin:0; padding:0; box-sizing:border-box; font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
        body { margin:0; background:var(--bg-page); }

        .receipt-page-wrapper { display:flex; justify-content:center; background:var(--bg-page); min-height:100vh; padding-bottom:120px; }
        .app { width:100%; max-width:480px; min-height:100vh; padding:80px 0 20px; background:var(--bg-page); position:relative; }

        /* Floating Header (New) */
        .top-bar { 
            position:fixed; top:0; left:50%; transform:translateX(-50%); 
            width:100%; max-width:480px; height:60px;
            display:flex; align-items:center; justify-content:center; 
            background: rgba(243, 244, 246, 0.95); /* Semi-transparent matching bg */
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(0,0,0,0.05);
            z-index: 50; 
        }
        .top-title { font-size:18px; font-weight:700; color:#1F2937; }

        .page-body { margin-top:10px; background:var(--bg-page); }
        .receipt-shell { padding:0 24px; }
        .receipt-card { width:100%; background:var(--bg-card); border-radius:24px; box-shadow:0 10px 30px rgba(0,0,0,0.08); overflow:hidden; margin-bottom: 24px; }

        .receipt-header { background:var(--bg-header); padding:32px 24px 24px; text-align:center; position:relative; }
        .receipt-header-icon { width:72px; height:72px; border-radius:999px; background:#FFFFFF; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .receipt-header-icon img { width:60%; height:60%; object-fit:contain; display:block; }
        .receipt-header-title { font-size:20px; font-weight:700; color:#FFFFFF; }

        .receipt-body { padding:24px; }
        .total-block { text-align:center; margin-bottom:24px; }
        .total-label { font-size:14px; color:var(--text-sub); margin-bottom:4px; }
        .total-value { font-size:40px; font-weight:800; color:var(--text-main); line-height:1.1; }

        .divider { border-top:2px solid var(--border-soft); margin:12px 0 18px; }
        .divider-thin { border-top:1px solid #E5E7EB; margin:16px 0; }

        .section-title { font-size:14px; font-weight:600; letter-spacing:0.35px; color:#374151; margin-bottom:12px; }
        .line-item { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
        .line-item-name { font-size:15px; font-weight:500; color:#1F2937; }
        .line-item-price { font-size:15px; font-weight:600; color:#1F2937; }

        .info-list { margin-top:18px; }
        .info-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size:14px; }
        .info-label { color:var(--text-sub); }
        .info-value { color:#1F2937; font-weight:600; }
        .status-pill { min-width:80px; padding:4px 12px; border-radius:999px; background:var(--accent-green-soft); text-align:center; font-size:12px; font-weight:700; color:var(--accent-green); }

        .tear-pattern { height:16px; background:linear-gradient(45deg,#F3F4F6 0%,transparent 33%,#F3F4F6 67%,transparent 100%); background-size: 20px 20px; margin-top: -1px;}
        
        .store-footer { text-align:center; margin:24px auto 0; color:var(--text-sub); font-size:13px; line-height:1.5; opacity: 0.8; }
        .store-footer .store-label { font-size:12px; color:var(--text-sub); margin-bottom: 2px;}
        .store-footer .store-name { font-size:16px; font-weight:700; color:#1F2937; }

        /* Floating Bottom Bar (Consistent) */
        .bottom-bar { 
            position:fixed; bottom:20px; left:50%; transform:translateX(-50%); 
            width:calc(100% - 48px); max-width:432px;
            z-index: 50;
        }
        .track-btn { 
            width:100%; padding: 14px; 
            border-radius:16px; background:var(--yellow-btn); 
            box-shadow:0 10px 20px rgba(0,0,0,0.15); border:none; 
            display:flex; align-items:center; justify-content:center; gap:10px; 
            cursor:pointer; transition: transform 0.1s;
        }
        .track-btn:active { transform: scale(0.98); }
        .track-btn-icon { width:20px; height:20px; display:flex; align-items:center; justify-content:center; }
        .track-btn-icon img { width:100%; height:100%; object-fit:contain; }
        .track-btn-text { font-size:16px; font-weight:700; color:#111827; }
      `}</style>
            <div className="receipt-page-wrapper">
                <div className="app">
                    <div className="top-bar">
                        <div className="top-title">Nota Pembayaran</div>
                    </div>

                    <div className="page-body">
                        <div className="receipt-shell">
                            <div className="receipt-card">
                                <div className="receipt-header">
                                    <div className="receipt-header-icon" style={{ backgroundColor: orderData.status === 'unpaid' ? '#FEF3C7' : '#FFFFFF' }}>
                                        {orderData.status === 'unpaid' ? (
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                        ) : (
                                            <img src="/assets/sukses.svg" alt="Pembayaran Berhasil" />
                                        )}
                                    </div>
                                    <div className="receipt-header-title" style={{ color: orderData.status === 'unpaid' ? '#FFF' : '#FFFFFF' }}>
                                        {orderData.status === 'unpaid' ? 'Menunggu Pembayaran' : 'Pembayaran Berhasil!'}
                                    </div>
                                </div>

                                <div className="receipt-body">
                                    <div className="total-block">
                                        <div className="total-label">Total Pembayaran</div>
                                        <div className="total-value">{formatRupiah(total)}</div>
                                    </div>

                                    <div className="divider" />

                                    <div className="section-title">Detail Pesanan</div>
                                    {(orderData.items || []).length === 0 ? (
                                        <div className="line-item">
                                            <span className="line-item-name">Tidak ada item</span>
                                            <span className="line-item-price">{formatRupiah(0)}</span>
                                        </div>
                                    ) : (
                                        orderData.items.map((it, i) => (
                                            <div className="line-item" key={i}>
                                                <span className="line-item-name">{(it.qty || 1) > 1 ? `${it.qty}x ${it.name}` : `1x ${it.name}`}</span>
                                                <span className="line-item-price">{formatRupiah((it.price || 0) * (it.qty || 1))}</span>
                                            </div>
                                        ))
                                    )}

                                    <div className="divider-thin" />

                                    <div className="info-list">
                                        <div className="info-row">
                                            <span className="info-label">Order ID</span>
                                            <span className="info-value">{orderData.id || `MP${Date.now()}`}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Metode Pembayaran</span>
                                            <span className="info-value">{orderData.method || 'QRIS'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Tanggal</span>
                                            <span className="info-value">{formattedDate}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Status</span>
                                            <span className="status-pill" style={{
                                                backgroundColor: orderData.status === 'unpaid' ? '#FEF3C7' : '#DCFCE7',
                                                color: orderData.status === 'unpaid' ? '#D97706' : '#15803D'
                                            }}>
                                                {orderData.status === 'unpaid' ? 'BELUM DIBAYAR' : 'LUNAS'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="tear-pattern" />
                            </div>

                            {orderData.storeName ? (
                                <div className="store-footer">
                                    <div className="store-label">Terimakasih Telah Berbelanja</div>
                                    <div className="store-name">{orderData.storeName}</div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="bottom-bar">
                        <button className="track-btn" onClick={() => {
                            const stateParam = encodeURIComponent(JSON.stringify({
                                items: orderData.items,
                                status: orderData.status,
                                transactionCode: orderData.transactionCode,
                                storeName: orderData.storeName // Pass it if needed
                            }));
                            router.push(`/waiting?state=${stateParam}`);
                        }}>
                            <span className="track-btn-icon">
                                <img src="/assets/gps.svg" alt="Lacak" />
                            </span>
                            <span className="track-btn-text">Lacak Pesanan Saya</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
