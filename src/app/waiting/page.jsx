'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TrackingPage() {
    const router = useRouter();

    const [orderItems, setOrderItems] = useState([]);
    const [queueNumber, setQueueNumber] = useState(() => Math.floor(Math.random() * 5) + 1);
    const [orderStatus, setOrderStatus] = useState('received'); // received | preparing | ready
    const [estimatedTime, setEstimatedTime] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 20);
        return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    });

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('state');
            let parsed = null;
            if (raw) parsed = JSON.parse(decodeURIComponent(raw));
            else {
                const saved = localStorage.getItem('order_state_v1');
                if (saved) parsed = JSON.parse(saved);
            }

            if (parsed) {
                const items = Array.isArray(parsed.items) ? parsed.items : [];
                setOrderItems(items);
                if (parsed.queueNumber) setQueueNumber(parsed.queueNumber);
                if (parsed.orderStatus) setOrderStatus(parsed.orderStatus);
                if (parsed.estimatedTime) setEstimatedTime(parsed.estimatedTime);
            } else {
                // demo fallback items
                setOrderItems([
                    { name: 'Teh Manis', price: 3000, qty: 1, image: '/assets/Nasi_Katsu.png' },
                    { name: 'Es Beng Beng', price: 5000, qty: 1, image: '/assets/Nasi_Omelet.png' }
                ]);
            }
        } catch (e) {
            // ignore
        }
    }, []);

    // optional: simulate status progression
    useEffect(() => {
        const steps = ['received', 'preparing', 'ready'];
        let idx = steps.indexOf(orderStatus);
        const t = setInterval(() => {
            if (idx < steps.length - 1) {
                idx += 1;
                setOrderStatus(steps[idx]);
            } else {
                clearInterval(t);
            }
        }, 40000);
        return () => clearInterval(t);
    }, [orderStatus]);

    const formatRupiah = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');

    const total = orderItems.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);

    return (
        <>
            <style jsx global>{`
/* preserved styles from lacak.html (scoped globally) */
:root {
  --bg-page: #F9FAFB;
  --bg-card: #FFFFFF;
  --bg-header: #FFFFFF;
  --text-main: #111827;
  --text-sub: #6B7280;
  --text-dark: #374151;
  --primary-yellow: #F0C419;
  --primary-yellow-soft: #FFFBEB;
  --primary-orange: #F59E0B;
  --primary-green: #22C55E;
  --border-soft: #E5E7EB;
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.10);
  --shadow-footer: 0 -4px 12px rgba(0,0,0,0.08);
  --radius-lg: 24px;
  --radius-md: 16px;
  --radius-pill: 9999px;
}
* { margin:0; padding:0; box-sizing:border-box; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
body { margin:0; min-height:100vh; background:#FFFFFF; display:flex; justify-content:center; align-items:flex-start; }
.frame { width:100%; max-width:414px; min-height:100vh; background:#FFFFFF; overflow:hidden; display:flex; flex-direction:column; }
.body { flex:1; background:var(--bg-page); display:flex; flex-direction:column; }

/* header */
.header { height:60px; background:var(--bg-header); box-shadow:var(--shadow-xs); display:flex; align-items:center; justify-content:center; position:sticky; top:0; z-index:10; padding:0 20px; }
.header .button { position:absolute; left:20px; cursor:pointer; background:transparent; border:none; padding:0; width:28px; height:28px; display:flex; align-items:center; justify-content:center; }
.header .button img { width:22px; height:22px; object-fit:contain; display:block; }
.header .text-wrapper { font-weight:600; font-size:18px; }

/* main layout */
.main { flex:1; display:flex; flex-direction:column; gap:20px; padding:16px 0 24px; }

/* status card */
.div-2 { margin:24px auto 0; width:335px; background:var(--bg-card); border-radius:var(--radius-lg); box-shadow:var(--shadow-md); padding-bottom:24px; display:flex; flex-direction:column; gap:32px; }
.div-wrapper { margin:32px auto 0; width:271px; }
.div-3 { width:208px; height:208px; margin:0 auto; position:relative; }
.group-wrapper { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
.group .img { position:absolute; top:-7px; left:-7px; width:221px; height:221px; }
.div-4 { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; gap:8px; }
.div-5 { margin-top:54px; display:flex; justify-content:center; }
.text-wrapper-2 { font-weight:800; font-size:72px; color:var(--text-main); line-height:1; }
.div-6 { display:flex; justify-content:center; }
.text-wrapper-3 { font-size:14px; font-weight:500; color:var(--text-sub); }

/* stepper */
.div-7 { margin:0 auto; width:271px; }
.div-8 { display:flex; gap:8px; align-items:flex-start; }
.div-9,.div-11,.div-15 { display:flex; flex-direction:column; align-items:center; gap:8px; flex:1; }
.i-wrapper,.div-12,.div-16 { width:40px; height:40px; border-radius:var(--radius-pill); display:flex; align-items:center; justify-content:center; }
.i-wrapper { background:var(--primary-green); }
.div-12 { background:var(--primary-yellow); }
.div-16 { background:#E5E7EB; }
.text-wrapper-4,.text-wrapper-5,.text-wrapper-6 { font-size:12px; line-height:16px; text-align:center; }
.text-wrapper-4 { color:#374151; }
.text-wrapper-5 { font-weight:600; color:var(--text-main); }
.text-wrapper-6 { color:#9CA3AF; }
.div-10,.div-14 { width:44px; height:4px; align-self:center; border-radius:999px; }
.div-10 { background:var(--primary-yellow); }
.div-14 { background:#E5E7EB; }

/* estimation */
.div-18 { margin:0 auto; width:271px; height:60px; background:var(--primary-yellow-soft); border-radius:16px; display:flex; align-items:center; padding:0 16px; gap:12px; }

/* order details */
.div-20 { margin:0 auto 24px; width:335px; background:var(--bg-card); border-radius:16px; box-shadow:var(--shadow-md); padding-bottom:16px; display:flex; flex-direction:column; }
.h-2 { margin:24px 24px 0; }
.text-wrapper-9 { font-size:16px; font-weight:600; color:var(--text-main); }
.order-list { list-style:none; margin:16px 0 0; padding:0 24px 0; display:flex; flex-direction:column; gap:16px; }
.div-21,.div-25 { width:100%; display:flex; }
.div-22 { display:flex; gap:16px; width:100%; }
.gemini-generated { width:64px; height:64px; border-radius:12px; object-fit:cover; flex-shrink:0; }
.div-23 { flex:1; display:flex; flex-direction:column; gap:4px; }
.div-24,.div-26 { display:flex; justify-content:space-between; align-items:center; }
.text-wrapper-10,.text-wrapper-13,.text-wrapper-11 { font-size:14px; font-weight:600; color:var(--text-main); }
.text-wrapper-12 { font-size:12px; color:var(--text-sub); }

/* notes block */
.div-27 { margin:15px 24px 0; padding:12px 13px; background:#FEFCE8; border-radius:12px; border:1px solid #FEF08A; display:flex; align-items:flex-start; gap:8px; }
.text-wrapper-14 { font-size:12px; font-weight:500; color:#374151; }
.p { font-size:12px; color:#4B5563; }

/* total */
.div-30 { margin:14px 24px 0; padding-top:14px; border-top:1px solid #F3F4F6; }
.div-31 { display:flex; justify-content:space-between; align-items:center; }
.text-wrapper-15 { font-size:14px; font-weight:500; color:#374151; }
.text-wrapper-16 { font-size:16px; font-weight:700; color:var(--text-main); }

/* footer actions */
.footer { width:100%; max-width:414px; background:var(--bg-card); box-shadow:var(--shadow-footer); padding:16px 20px 16px; }
.div-32 { display:flex; gap:12px; margin-bottom:12px; }
.button-2, .button-3, .button-4 { border-radius:12px; border:2px solid #D1D5DB; display:flex; align-items:center; justify-content:center; gap:8px; padding:0 12px; height:48px; background:transparent; cursor:pointer; }
.button-2 { flex:1; } .button-3 { flex:1.1; }
.button-4 { width:100%; margin-top:8px; background:var(--primary-yellow); border:none; }

/* responsive */
.visually-hidden { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border-width:0; }
      `}</style>

            <div className="frame">
                <div className="body">
                    <header className="header">
                        <button className="button" type="button" aria-label="Kembali ke halaman sebelumnya" onClick={() => router.back()}>
                            <img src="/assets/kembali.svg" alt="Kembali" />
                        </button>

                        <h1 className="text-wrapper">Lacak Pesanan</h1>

                        <button className="top-icon" type="button" aria-label="Icon kanan atas" onClick={() => { /* optional handler */ }}>
                            <img src="/assets/wa.svg" alt="Icon" />
                        </button>
                    </header>

                    <main className="main">
                        <section className="div-2" aria-labelledby="order-status-heading">
                            <h2 id="order-status-heading" className="visually-hidden">Status Pesanan</h2>

                            <div className="div-wrapper">
                                <div className="div-3">
                                    <div className="group-wrapper" aria-hidden="true">
                                        <div className="group">
                                            <img className="img" src="/assets/Ring.svg" alt="" />
                                            <img className="img" src="/assets/Ring.svg" alt="" />
                                        </div>
                                    </div>

                                    <div className="div-4">
                                        <div className="div-5">
                                            <div className="text-wrapper-2" aria-label={`${queueNumber} pesanan dalam antrean`}>{queueNumber}</div>
                                        </div>
                                        <div className="div-6">
                                            <div className="text-wrapper-3">Antrean Kamu</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="div-7">
                                <nav className="div-8" aria-label="Tahapan pesanan">
                                    <div className="div-9">
                                        <div className="i-wrapper" aria-label="Pesanan diterima - selesai">
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                                <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <div className="text-wrapper-4">Pesanan Diterima</div>
                                    </div>

                                    <div className={orderStatus === 'preparing' || orderStatus === 'ready' ? 'div-10' : 'div-14'} role="separator" aria-hidden="true" />

                                    <div className="div-11">
                                        <div className={orderStatus === 'preparing' || orderStatus === 'ready' ? 'div-12' : 'div-16'} aria-label="Sedang disiapkan - dalam proses">
                                            <svg className="i-2" width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden="true">
                                                <path d="M9 2L2 6V10C2 14.5 5 18 9 18C13 18 16 14.5 16 10V6L9 2Z" fill="white" />
                                            </svg>
                                        </div>
                                        <div className="text-wrapper-5">Sedang Disiapkan</div>
                                    </div>

                                    <div className={orderStatus === 'ready' ? 'div-10' : 'div-14'} role="separator" aria-hidden="true" />

                                    <div className="div-15">
                                        <div className="div-16" aria-label="Siap diantar - belum dimulai">
                                            <svg className="i-3" width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden="true">
                                                <path d="M12 8H10V2H4V8H2L7 13L12 8Z" fill="#9CA3AF" />
                                            </svg>
                                        </div>
                                        <div className="text-wrapper-6">Siap Diantar</div>
                                    </div>
                                </nav>
                            </div>

                            <div className="div-18" role="status" aria-live="polite">
                                <svg className="i-4" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                                    <circle cx="9" cy="9" r="8" stroke="#F59E0B" strokeWidth="2" />
                                    <path d="M9 5V9L12 12" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span className="span">Estimasi Selesai:</span>
                                <span className="span-2"><time className="text-wrapper-8" dateTime={estimatedTime}>{estimatedTime} WIB</time></span>
                            </div>
                        </section>

                        <section className="div-20" aria-labelledby="order-details-heading">
                            <div className="h-2">
                                <h2 id="order-details-heading" className="text-wrapper-9">Rincian Pesanan</h2>
                            </div>

                            <ul className="order-list">
                                {orderItems.length === 0 ? (
                                    <li style={{ padding: '12px 24px', color: '#6B7280' }}>Tidak ada item</li>
                                ) : (
                                    orderItems.map((it, idx) => (
                                        <li className="div-21" key={idx}>
                                            <div className="div-22">
                                                <img className="gemini-generated" src={it.image || '/assets/placeholder.png'} alt={it.name} />
                                                <div className="div-23">
                                                    <div className="div-24">
                                                        <div className="text-wrapper-10">{it.name}</div>
                                                        <div className="text-wrapper-11" aria-label={`Harga ${formatRupiah(it.price)}`}>{formatRupiah(it.price)}</div>
                                                    </div>
                                                    <div className="text-wrapper-12" aria-label={`Jumlah ${it.qty || 1}`}>{(it.qty || 1)}x</div>
                                                </div>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>

                            <div className="div-27">
                                <svg className="i-5" width="13" height="20" viewBox="0 0 13 20" fill="none" aria-hidden="true">
                                    <path d="M11 2H2C1.45 2 1 2.45 1 3V17C1 17.55 1.45 18 2 18H11C11.55 18 12 17.55 12 17V3C12 2.45 11.55 2 11 2ZM6.5 15.5C5.95 15.5 5.5 15.05 5.5 14.5C5.5 13.95 5.95 13.5 6.5 13.5C7.05 13.5 7.5 13.95 7.5 14.5C7.5 15.05 7.05 15.5 6.5 15.5Z" fill="#F59E0B" />
                                </svg>
                                <div className="div-29">
                                    <div className="text-wrapper-14">Catatan Khusus:</div>
                                    <p className="p">Tambahkan es batu lebih banyak</p>
                                </div>
                            </div>

                            <div className="div-30">
                                <div className="div-31">
                                    <div className="text-wrapper-15">Total Pembayaran</div>
                                    <div className="text-wrapper-16" aria-label={`Total ${formatRupiah(total)}`}>{formatRupiah(total)}</div>
                                </div>
                            </div>
                        </section>
                    </main>

                    <footer className="footer">
                        <div className="div-32">
                            <button className="button-2" type="button" aria-label="Beri masukan tentang pesanan" onClick={() => router.push('/saran')}>
                                <svg className="i-6" width="14" height="17" viewBox="0 0 14 17" fill="none" aria-hidden="true"><path d="M12 1H2C1.45 1 1 1.45 1 2V12L4 9H12C12.55 9 13 8.55 13 8V2C13 1.45 12.55 1 12 1Z" fill="#374151" /></svg>
                                <span className="text-wrapper-17">Beri Masukan</span>
                            </button>

                            <button className="button-3" type="button" aria-label="Batalkan pesanan" onClick={() => alert('Fitur batalkan pesanan belum tersedia')}>
                                <svg className="i-7" width="11" height="17" viewBox="0 0 11 17" fill="none" aria-hidden="true"><path d="M8 3V2C8 1.45 7.55 1 7 1H4C3.45 1 3 1.45 3 2V3H1V4H2V13C2 13.55 2.45 14 3 14H8C8.55 14 9 13.55 9 13V4H10V3H8Z" fill="#DC2626" /></svg>
                                <span className="text-wrapper-18">Batalkan Pesanan</span>
                            </button>
                        </div>

                        <button className="button-4" type="button" aria-label="Pesan menu lain" onClick={() => router.push('/home')}>
                            <svg className="i-8" width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden="true"><path d="M7 2L2 7H5V12H9V7H12L7 2Z" fill="#111827" /></svg>
                            <span className="text-wrapper-19">Pesan Menu Lain</span>
                        </button>
                    </footer>
                </div>
            </div>
        </>
    );
}
