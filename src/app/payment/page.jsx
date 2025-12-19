'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentPage() {
    const router = useRouter();
    const [orderState, setOrderState] = useState({ items: [], subtotal: 0 });
    const [selectedMethod, setSelectedMethod] = useState('qris');

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('state');
            if (!raw) return;
            const parsed = JSON.parse(decodeURIComponent(raw));
            const items = Array.isArray(parsed.items) ? parsed.items : [];
            const subtotal = parsed.subtotal ?? items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);
            setOrderState({ items, subtotal });
        } catch (e) {
            // ignore
        }
    }, []);

    const formatRupiah = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');

    const handleContinue = () => {
        const stateParam = encodeURIComponent(JSON.stringify(orderState));
        if (selectedMethod === 'qris') {
            router.push(`/nota?state=${stateParam}`);
        } else {
            router.push(`/kasir?state=${stateParam}`);
        }
    };

    const handleBack = () => {
        // navigate back to checkout with same state if available
        const stateParam = encodeURIComponent(JSON.stringify(orderState));
        const target = orderState && orderState.items && orderState.items.length
            ? `/checkout?state=${stateParam}`
            : '/checkout';
        router.push(target);
    };

    const subtotal = orderState && orderState.items && orderState.items.length
        ? orderState.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0)
        : orderState.subtotal || 0;

    return (
        <>
            <style jsx global>{`
        :root {
            --bg-page: #F4F5F8;
            --card-bg: #FFFFFF;
            --text-main: #111827;
            --text-sub: #6B7280;
            --border-soft: #E5E7EB;
            --yellow: #FACC15;
            --yellow-soft: #FEF3C7;
            --red: #EF4444;
            --blue-qris: #2563EB;
        }
        * { box-sizing: border-box; font-family:'Poppins',sans-serif; -webkit-tap-highlight-color: transparent; }
        body { margin:0; background:var(--bg-page); }

        /* scope to this page to avoid leaking */
        .payment-page { max-width:414px; margin:0 auto; min-height:100vh; background:var(--bg-page); position:relative; }
        .payment-page .page { padding:0 0 90px 0; display:flex; flex-direction:column; min-height:100vh; }

        .payment-page .header {
            height:64px; background:#FFFFFF; display:flex; align-items:center; justify-content:center;
            position:sticky; top:0; z-index:10; box-shadow:0 1px 0 rgba(15,23,42,0.06);
        }
        .payment-page .back-btn { position:absolute; left:14px; width:36px; height:36px; border-radius:999px; border:none; background:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer; }
        .payment-page .header-title { font-size:1.25rem; font-weight:700; color:var(--text-main); }

        .payment-page .content { padding:16px 16px 0; flex:1; }

        .payment-page .summary-card { background:var(--card-bg); border-radius:24px; padding:18px 18px 16px; box-shadow:0 8px 20px rgba(15,23,42,0.05); margin-bottom:22px; }
        .payment-page .summary-title { font-size:1.1rem; font-weight:700; color:var(--text-main); margin-bottom:14px; }
        .payment-page .summary-row { display:flex; justify-content:space-between; align-items:center; margin:4px 0; font-size:0.95rem; color:var(--text-sub); }
        .payment-page .summary-row.total-label { margin-top:14px; padding-top:10px; border-top:1px solid var(--border-soft); font-weight:700; color:var(--text-main); }
        .payment-page .summary-row .value { font-weight:600; color:var(--text-sub); }
        .payment-page .summary-row.total-label .value { color:var(--red); font-size:1.05rem; }

        .payment-page .section-title { font-weight:700; color:var(--text-main); font-size:1.05rem; margin-bottom:12px; }

        .payment-page .method-list { display:flex; flex-direction:column; gap:14px; }
        .payment-page .method-card { background:var(--card-bg); border-radius:22px; padding:14px 14px 12px; display:flex; gap:12px; align-items:flex-start; border:1px solid var(--border-soft); cursor:pointer; }
        .payment-page .method-card.active { border-color: #FCD34D; box-shadow:0 10px 24px rgba(250,204,21,0.25); }
        .payment-page .method-icon { width:52px; height:52px; border-radius:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden; }
        .payment-page .method-icon.qris { background:#1D4ED8; }
        .payment-page .method-icon.cash { background:#FEE2E2; }
        .payment-page .method-icon img { width:70%; height:70%; object-fit:contain; }
        .payment-page .method-info { flex:1; }
        .payment-page .method-name { font-weight:700; font-size:1rem; color:var(--text-main); margin-bottom:2px; }
        .payment-page .method-desc { font-size:0.88rem; color:var(--text-sub); line-height:1.4; }
        .payment-page .method-extra { margin-top:10px; display:flex; align-items:center; gap:6px; font-size:0.83rem; color:var(--text-sub); }
        .payment-page .wallet-logos-img { height:18px; width:auto; object-fit:contain; display:block; }
        .payment-page .method-radio { width:24px; height:24px; border-radius:999px; border:2px solid var(--border-soft); display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-left:6px; }
        .payment-page .method-card.active .method-radio { border-color:var(--yellow); }
        .payment-page .method-radio-dot { width:14px; height:14px; border-radius:999px; background:var(--yellow); opacity:0; }
        .payment-page .method-card.active .method-radio-dot { opacity:1; }
        .payment-page .method-time { display:flex; align-items:center; gap:6px; font-size:0.83rem; color:var(--text-sub); margin-top:10px; }
        .payment-page .time-icon { width:18px; height:18px; flex-shrink:0; }

        .payment-page .bottom-bar {
            position:fixed; left:50%; transform:translateX(-50%); bottom:0; width:100%; max-width:414px; padding:10px 16px 18px; background:#FFFFFF; box-shadow:0 -6px 18px rgba(15,23,42,0.1); box-sizing:border-box;
        }
        .payment-page .bottom-total-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:0.96rem; color:var(--text-sub); }
        .payment-page .bottom-total-row strong { font-weight:700; color:var(--text-main); }
        .payment-page .bottom-total-row .value { font-weight:700; font-size:1.05rem; color:var(--red); }
        .payment-page .primary-btn { width:100%; border:none; border-radius:999px; padding:14px 16px; background:var(--yellow); color:var(--text-main); font-weight:700; font-size:1rem; cursor:pointer; box-shadow:0 14px 26px rgba(250,204,21,0.55); }
        .payment-page .ssl-row { margin-top:8px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.82rem; color:var(--text-sub); }
        .payment-page .ssl-dot { width:14px; height:14px; border-radius:4px; background:#16A34A; }

        @media (max-width: 420px) {
          .payment-page { padding:0 0 90px 0; }
        }
      `}</style>

            <div className="payment-page">
                <div className="page">
                    <header className="header">
                        <button className="back-btn" onClick={handleBack} aria-label="Kembali">←</button>
                        <h1 className="header-title">Pilih Metode Pembayaran</h1>
                    </header>

                    <main className="content">
                        <section className="summary-card">
                            <div className="summary-title">Ringkasan Pesanan</div>
                            <div className="summary-row">
                                <span>Subtotal</span>
                                <span className="value">{formatRupiah(subtotal)}</span>
                            </div>
                            <div className="summary-row total-label">
                                <span>Total Pembayaran</span>
                                <span className="value">{formatRupiah(subtotal)}</span>
                            </div>
                        </section>

                        <h2 className="section-title">Metode Pembayaran</h2>
                        <section className="method-list">
                            <article
                                className={`method-card ${selectedMethod === 'qris' ? 'active' : ''}`}
                                data-method="qris"
                                onClick={() => setSelectedMethod('qris')}
                            >
                                <div className="method-icon qris">
                                    <img src="/assets/Icon_Qris.svg" alt="QRIS" />
                                </div>
                                <div className="method-info">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                        <div>
                                            <div className="method-name">QRIS</div>
                                            <div className="method-desc">Bayar langsung dari semua aplikasi e-wallet</div>
                                        </div>
                                        <div className="method-radio"><div className="method-radio-dot" /></div>
                                    </div>
                                    <div className="method-extra">
                                        <div className="wallet-badges">
                                            <img src="/assets/Icon_Ewallet.svg" alt="E-Wallet Logos" className="wallet-logos-img" />
                                        </div>
                                        <span>+ Dana, GoPay, OVO, LinkAja, dan lainnya</span>
                                    </div>
                                </div>
                            </article>

                            <article
                                className={`method-card ${selectedMethod === 'cash' ? 'active' : ''}`}
                                data-method="cash"
                                onClick={() => setSelectedMethod('cash')}
                            >
                                <div className="method-icon cash">
                                    <img src="/assets/Icon_Kasir.svg" alt="Bayar di Kasir" />
                                </div>
                                <div className="method-info">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                        <div>
                                            <div className="method-name">Bayar di Kasir</div>
                                            <div className="method-desc">Tunjukkan kode pesanan Anda di kasir</div>
                                        </div>
                                        <div className="method-radio"><div className="method-radio-dot" /></div>
                                    </div>
                                    <div className="method-time">
                                        <span className="time-icon"><img src="/assets/Icon_Jam.svg" alt="Waktu" /></span>
                                        <span>Bayar dalam 15 menit setelah pesanan siap</span>
                                    </div>
                                </div>
                            </article>
                        </section>
                    </main>
                </div>

                <div className="bottom-bar">
                    <div className="bottom-total-row">
                        <span><strong>Total Pembayaran</strong></span>
                        <span className="value">{formatRupiah(subtotal)}</span>
                    </div>
                    <button className="primary-btn" onClick={handleContinue}>Lanjutkan Pembayaran</button>
                    <div className="ssl-row"><span className="ssl-dot" /> <span>Pembayaran dilindungi SSL</span></div>
                </div>
            </div>
        </>
    );
}
