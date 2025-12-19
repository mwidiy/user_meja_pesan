'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReceiptPage() {
    const router = useRouter();
    const [orderData, setOrderData] = useState({ id: '', items: [], method: 'QRIS', date: '', meta: {} });

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('state');
            let parsed = null;
            if (raw) {
                parsed = JSON.parse(decodeURIComponent(raw));
            } else {
                const saved = localStorage.getItem('order_state_v1');
                if (saved) parsed = JSON.parse(saved);
            }
            if (parsed) {
                const items = Array.isArray(parsed.items) ? parsed.items : [];
                const method = parsed.orderType || parsed.method || 'QRIS';
                const id = parsed.id || `MP${Date.now()}`;
                const date = parsed.date || new Date().toISOString();
                setOrderData({ id, items, method, date, meta: parsed.meta || {} });
                return;
            }
        } catch (e) {
            // ignore parse errors
        }
        // fallback empty
        setOrderData({ id: `MP${Date.now()}`, items: [], method: 'QRIS', date: new Date().toISOString(), meta: {} });
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
        body { margin:0; background:#FFFFFF; }

        .receipt-page-wrapper { display:flex; justify-content:center; background:#FFFFFF; min-height:100vh; padding-bottom:20px; }
        .app { width:100%; max-width:414px; min-height:100vh; padding:60px 0 20px; background:#FFFFFF; position:relative; }

        .top-bar { position:absolute; top:17px; left:0; right:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
        .top-back { position:absolute; left:12px; width:32px; height:32px; border-radius:999px; display:flex; align-items:center; justify-content:center; cursor:pointer; pointer-events:auto; }
        .top-back img { width:20px; height:20px; object-fit:contain; display:block; }
        .top-title { font-size:18px; font-weight:600; color:#1F2937; }

        .page-body { margin-top:40px; background:var(--bg-page); padding-bottom:96px; }
        .receipt-shell { padding:32px 20px 0; }
        .receipt-card { width:100%; max-width:335px; margin:0 auto; background:var(--bg-card); border-radius:24px 24px 0 0; box-shadow:0 25px 50px rgba(0,0,0,0.25); overflow:hidden; }

        .receipt-header { background:var(--bg-header); padding:40px 24px 24px; text-align:center; position:relative; }
        .receipt-header-icon { width:80px; height:80px; border-radius:999px; background:#FFFFFF; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .receipt-header-icon img { width:60%; height:60%; object-fit:contain; display:block; }
        .receipt-header-title { font-size:24px; font-weight:700; color:#FFFFFF; }

        .receipt-body { padding:32px 24px 24px; }
        .total-block { text-align:center; margin-bottom:24px; }
        .total-label { font-size:14px; color:var(--text-sub); margin-bottom:4px; }
        .total-value { font-size:48px; font-weight:800; color:var(--text-main); line-height:48px; }

        .divider { border-top:2px solid var(--border-soft); margin:12px 0 18px; }
        .divider-thin { border-top:1px solid #E5E7EB; margin:16px 0; }

        .section-title { font-size:14px; font-weight:600; letter-spacing:0.35px; color:#374151; margin-bottom:8px; }
        .line-item { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .line-item-name { font-size:16px; font-weight:500; color:#1F2937; }
        .line-item-price { font-size:16px; font-weight:600; color:#1F2937; }

        .info-list { margin-top:18px; }
        .info-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:14px; }
        .info-label { color:var(--text-sub); }
        .info-value { color:#1F2937; font-weight:600; }
        .status-pill { min-width:70px; padding:3px 10px; border-radius:999px; background:var(--accent-green-soft); text-align:center; font-size:12px; font-weight:700; color:var(--accent-green); }

        .tear-pattern { height:14px; background:linear-gradient(45deg,#F3F4F6 0%,rgba(0,0,0,0) 33%,#F3F4F6 67%,rgba(0,0,0,0) 100%); }
        .store-footer { text-align:center; margin:20px auto 0; max-width:287px; color:var(--text-sub); font-size:12px; line-height:16px; }
        .store-footer .store-name { font-size:14px; font-weight:600; color:#1F2937; margin-top:4px; margin-bottom:4px; }

        .bottom-bar { position:absolute; left:0; right:0; bottom:0; height:96px; background:linear-gradient(0deg,#F3F4F6 0%,#F3F4F6 50%,rgba(0,0,0,0) 100%); display:flex; align-items:center; justify-content:center; }
        .track-btn { width:335px; height:56px; border-radius:16px; background:var(--yellow-btn); box-shadow:0 10px 15px rgba(0,0,0,0.10); border:none; display:flex; align-items:center; justify-content:center; gap:10px; cursor:pointer; }
        .track-btn-icon { width:18px; height:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .track-btn-icon img { width:100%; height:100%; object-fit:contain; display:block; }
        .track-btn-text { font-size:16px; font-weight:700; color:#111827; }
      `}</style>

            <div className="receipt-page-wrapper">
                <div className="app">
                    <div className="top-bar">
                        <div className="top-back" onClick={() => router.back()} aria-label="Kembali">
                            <img src="/assets/kembali.svg" alt="Kembali" />
                        </div>
                        <div className="top-title">Nota Pembayaran</div>
                    </div>

                    <div className="page-body">
                        <div className="receipt-shell">
                            <div className="receipt-card">
                                <div className="receipt-header">
                                    <div className="receipt-header-icon">
                                        <img src="/assets/sukses.svg" alt="Pembayaran Berhasil" />
                                    </div>
                                    <div className="receipt-header-title">Pembayaran Berhasil!</div>
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
                                            <span className="status-pill">LUNAS</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="tear-pattern" />
                            </div>

                            <div className="store-footer">
                                <div>Terima kasih telah berbelanja!</div>
                                <div className="store-name">Warung Makan Berkah</div>
                                <div>Jl. Raya No. 123, Jakarta</div>
                            </div>
                        </div>
                    </div>

                    <div className="bottom-bar">
                        <button className="track-btn" onClick={() => router.push('/lacak')}>
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
