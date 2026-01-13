'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getImageUrl, getOrdersByBatch } from '../../services/api';

export default function StatusPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('process'); // process | completed
    const [orders, setOrders] = useState({ process: [], completed: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            // 1. Get transaction codes from localStorage
            const history = JSON.parse(localStorage.getItem('order_history') || '[]');

            if (history.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Fetch from backend batch endpoint using Service
            const json = await getOrdersByBatch(history);

            if (json.success) {
                const processList = [];
                const completedList = [];

                json.data.forEach(order => {
                    const isCompleted = order.status === 'Completed' || order.status === 'Ready' || order.status === 'Cancelled';
                    if (isCompleted) {
                        completedList.push(order);
                    } else {
                        processList.push(order);
                    }
                });

                setOrders({
                    process: processList,
                    completed: completedList
                });
            }
        } catch (error) {
            console.error("Error fetching status:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatRupiah = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');

    const goToWaitingPage = (order) => {
        // Construct state param for Waiting Page
        const stateParam = encodeURIComponent(JSON.stringify({
            items: order.items.map(item => ({
                name: item.product.name,
                price: item.priceSnapshot,
                qty: item.quantity,
                image: item.product.image ? getImageUrl(item.product.image) : '/assets/placeholder.png'
            })),
            transactionCode: order.transactionCode,
            queueNumber: order.queueNumber ? String(order.queueNumber) : '-'
        }));
        router.push(`/waiting?state=${stateParam}`);
    };

    return (
        <>
            <style jsx global>{`
      :root {
        --bg-page: #F9FAFB;
        --bg-card: #FFFFFF;
        --text-main: #1A2332;
        --text-sub: #6B7280;
        --text-muted: #9E9E9E;
        --primary-yellow: #F0C419;
        --primary-yellow-soft: #F0C41933;
        --tab-bg: #F3F4F6;
        --status-blue-bg: #EFF6FF;
        --status-blue: #2563EB;
        --border-soft: #CED4DA;
        --border-card: #F3F4F6;
        --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        min-height: 100vh;
        background:#FFFFFF;
        display:flex;
        justify-content:center;
        align-items:flex-start;
      }

      .frame {
        width:100%;
        max-width: 414px;
        min-height: 100vh;
        display:flex;
        flex-direction:column;
        align-items:flex-start;
        background-color:#FFFFFF;
        border:2px solid var(--border-soft);
        overflow:hidden;
      }

      .body {
        width:100%;
        min-height:100vh;
        background-color:var(--bg-page);
        display: flex;
        flex-direction: column;
      }

      .div {
        height:100%;
        width: 100%;
        display:flex;
        flex-direction:column;
        background-color:#FFFFFF;
      }

      /* HEADER */
      .header {
        width:100%;
        height:60px;
        display:flex;
        align-items:center;
        justify-content:center;      /* judul di tengah */
        background-color:#FFFFFF;
        box-shadow:var(--shadow-xs);
        padding:0 16px;
        position:relative;
      }
      .button {
        position:absolute;
        left:16px;
        width:28px;
        height:28px;
        display:flex;
        align-items:center;
        justify-content:center;
        border:none;
        background:none;
        padding:0;
        cursor:pointer;
      }
      /* back pakai IMG dari aset kamu */
      .button img {
        width:22px;
        height:22px;
        object-fit:contain;
        display:block;
      }

      .h {
        /* judul di tengah dengan flex */
        display:flex;
        align-items:center;
        justify-content:center;
        flex:1;
      }
      .text-wrapper {
        font-size:18px;
        font-weight:700;
        color:var(--text-main);
        text-align:center;
      }

      /* TAB FILTER */
      .section {
        width:100%;
        height:76px;
        display:flex;
        align-items:center;
        background-color:#FFFFFF;
        box-shadow:var(--shadow-xs);
      }
      .div-2 {
        width:343px;
        margin:16px auto 0;
        display:flex;
        gap:12px;
      }
      .tab-btn {
        all:unset;
        box-sizing:border-box;
        width:50%;
        height:44px;
        border-radius:9999px;
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        font-size:14px;
        font-weight:600;
        text-align:center;
        transition: all 0.2s;
      }
      .tab-active {
        background-color:var(--primary-yellow);
        color:var(--text-main);
      }
      .tab-inactive {
        background-color:var(--tab-bg);
         color:#4B5563;
      }

      /* MAIN */
      .main {
        flex:1;
        display:flex;
        flex-direction:column;
        padding-bottom: 24px;
      }

      /* CARD PESANAN */
      .div-3 {
        width:343px;
        min-height:160px;
        margin:16px auto 0;
        display:flex;
        flex-direction:column;
        gap:12px;
        background-color:#FFFFFF;
        border-radius:16px;
        border:1px solid var(--border-card);
        box-shadow:var(--shadow-xs);
        padding-bottom:12px;
        cursor: pointer;
      }
      .div-4 {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        margin:17px 17px 0;
      }
      .div-5 {
        display:flex;
        gap:12px;
      }

      .i-wrapper {
        width:40px;
        height:40px;
        border-radius:9999px;
        background-color:var(--primary-yellow-soft);
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
      }
      /* icon pesanan pakai IMG sekarang */
      .i-wrapper img {
        width:24px;
        height:24px;
        object-fit:contain;
        display:block;
      }

      .div-7 {
        display:flex;
        flex-direction:column;
        gap:2px;
      }
      .text-wrapper-4 {
        font-size:16px;
        font-weight:700;
        color:var(--text-main);
      }
      .text-wrapper-5 {
        font-size:12px;
        color:var(--text-sub);
      }

      .button-3 {
        width:24px;
        height:28px;
        display:flex;
        align-items:center;
        justify-content:center;
        border:none;
        background:none;
        padding:0;
        cursor:pointer;
      }
     
      .p-wrapper {
        margin:0 17px;
        min-height:44px;
        background-color:var(--bg-page);
        border-radius:12px;
        display:flex;
        align-items:center;
        padding:8px 12px;
      }
      .p {
        font-size:14px;
        color:var(--text-main);
      }
     
      .div-8 {
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin:0 17px;
        margin-top:4px;
      }
      .span-wrapper {
        flex-shrink:0;
      }
      .span {
        display:flex;
        align-items:center;
        gap:6px;
        padding:4px 12px;
        border-radius:9999px;
        background-color:var(--status-blue-bg);
      }
      
      .text-wrapper-7 {
        font-size:12px;
        font-weight:600;
        color:var(--status-blue);
      }

      .div-10 {
        display:flex;
        flex-direction:column;
        align-items:flex-end;
      }
      .text-wrapper-8 {
        font-size:12px;
        color:var(--text-sub);
      }
      .text-wrapper-9 {
        font-size:16px;
        font-weight:700;
        color:var(--text-main);
      }

      /* ILLUSTRASI & CTA */
      .div-11 {
        width:128px;
        height:128px;
        margin:81px auto 0;
        display:block;
      }

      .text-wrapper-10 {
        margin-top:35px;
        text-align:center;
        font-size:20px;
        font-weight:700;
        color:#424242;
      }

      .text-wrapper-11 {
        margin-top:18px;
        margin-inline:25px;
        text-align:center;
        font-size:14px;
        color:var(--text-muted);
        line-height:23px;
      }

      .button-4 {
        all:unset;
        box-sizing:border-box;
        width:311px;
        height:56px;
        margin:18.5px auto 0;
        border-radius:9999px;
        background-color:var(--primary-yellow);
        box-shadow:var(--shadow-xs);
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
      }
      .text-wrapper-12 {
        font-size:16px;
        font-weight:700;
        color:#424242;
        text-align:center;
      }
    `}</style>

            <div className="frame">
                <main className="body">
                    <div className="div">
                        <header className="header">
                            <button className="button" aria-label="Kembali" onClick={() => router.back()}>
                                <img src="/assets/kembali.svg" alt="Kembali" />
                            </button>
                            <h1 className="h">
                                <span className="text-wrapper">Status Pesanan Saya</span>
                            </h1>
                        </header>

                        <nav className="section" aria-label="Filter status pesanan">
                            <div className="div-2" role="tablist">
                                <button className={`tab-btn ${activeTab === 'process' ? 'tab-active' : 'tab-inactive'}`}
                                    onClick={() => setActiveTab('process')}>
                                    Sedang Diproses
                                </button>
                                <button className={`tab-btn ${activeTab === 'completed' ? 'tab-active' : 'tab-inactive'}`}
                                    onClick={() => setActiveTab('completed')}>
                                    Selesai
                                </button>
                            </div>
                        </nav>

                        <section className="main" role="tabpanel">
                            {/* LIST */}
                            {loading ? (
                                <div style={{ textAlign: 'center', marginTop: 40, color: '#999' }}>Memuat pesanan...</div>
                            ) : (
                                orders[activeTab].map((order) => (
                                    <article className="div-3" key={order.id} onClick={() => goToWaitingPage(order)}>
                                        <div className="div-4">
                                            <div className="div-5">
                                                <span className="i-wrapper">
                                                    <img src="/assets/Card_Icon.svg" alt="" />
                                                </span>
                                                <div className="div-7">
                                                    <h2 className="text-wrapper-4">Pesanan #{order.queueNumber || order.id}</h2>
                                                    {order.createdAt && (
                                                        <time className="text-wrapper-5">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                                                    )}
                                                </div>
                                            </div>
                                            <button className="button-3">
                                                <img src="/assets/wa.svg" style={{ width: 16, visibility: 'hidden' }} alt="" />
                                                {/* Placeholder for arrow */}
                                                <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M2.25 15.75L9 9L2.25 2.25" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className="p-wrapper">
                                            <p className="p">
                                                {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                                            </p>
                                        </div>

                                        <div className="div-8">
                                            <div className="span-wrapper">
                                                <span className="span" style={{
                                                    backgroundColor: activeTab === 'completed' ? '#DCFCE7' : '#EFF6FF'
                                                }}>
                                                    <span className="text-wrapper-7" style={{
                                                        color: activeTab === 'completed' ? '#166534' : '#2563EB'
                                                    }}>
                                                        {activeTab === 'completed' ? 'Pesanan Selesai' : 'Sedang Disiapkan'}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="div-10">
                                                <span className="text-wrapper-8">Total</span>
                                                <span className="text-wrapper-9">{formatRupiah(order.totalAmount)}</span>
                                            </div>
                                        </div>
                                    </article>
                                ))
                            )}

                            {/* EMPTY STATE */}
                            {orders[activeTab].length === 0 && !loading && (
                                <>
                                    <img className="div-11" src="/assets/Plus_Icon.svg" alt="Ilustrasi" style={{ opacity: 0.5 }} />
                                    <h3 className="text-wrapper-10">Belum ada pesanan</h3>
                                    <p className="text-wrapper-11">
                                        {activeTab === 'process' ? 'Kamu tidak memiliki pesanan aktif saat ini.' : 'Riwayat pesanan kamu masih kosong.'}
                                    </p>
                                    <button className="button-4" type="button" onClick={() => router.push('/home')}>
                                        <span className="text-wrapper-12">Pesan Menu Lain</span>
                                    </button>
                                </>
                            )}

                            {orders[activeTab].length > 0 && (
                                <div style={{ marginTop: 40, textAlign: 'center' }}>
                                    <button className="button-4" type="button" onClick={() => router.push('/home')}>
                                        <span className="text-wrapper-12">Pesan Menu Lain</span>
                                    </button>
                                </div>
                            )}

                        </section>
                    </div>
                </main>
            </div>
        </>
    );
}
