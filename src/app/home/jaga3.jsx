// components/ProductDetailModal.jsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const formatRupiah = (num) => 'Rp ' + num.toLocaleString('id-ID');

export default function ProductDetailModal({ product, onClose, onChangeSelectedQty, onManualInput, onAddToCart }) {
    const router = useRouter();
    const isOpen = !!product;
    const qty = product ? (product.selectedQty ?? 0) : 0;

    // disable body scroll when modal is open to mimic "pindah halaman"
    useEffect(() => {
        if (isOpen) {
            const prev = { overflow: document.body.style.overflow, touchAction: document.body.style.touchAction };
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
            return () => {
                document.body.style.overflow = prev.overflow || '';
                document.body.style.touchAction = prev.touchAction || '';
            };
        }
        return;
    }, [isOpen]);

    return (
        <>
            {/* Styles untuk detail view (diambil dari home.html) */}
            <style jsx global>{`
                /* Detail view styles (copied/adapted from home.html) */
                .detail-root { width:100%; max-width:414px; margin:0 auto; min-height:100vh; background:#ffffff; }
                #detailView, .detail-modal {
                    position: fixed; inset: 0; z-index: 200; display:flex; flex-direction:column; background: #ffffff;
                    overflow-y: auto; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
                }
                .detail-modal.open { transform: translateY(0); }
                .detail-header { padding:16px 20px; display:flex; align-items:center; gap:16px; background:#fff; position:sticky; top:0; z-index:10; box-shadow: 0 1px 0 rgba(15,23,42,0.04); }
                .back-btn { background:none; border:none; font-size:1.5rem; cursor:pointer; padding:5px; display:flex; align-items:center; justify-content:center; }
                .detail-image-container { width:100%; aspect-ratio:1/1; position:relative; background:#f0f0f0; overflow:hidden; }
                .detail-image-container img.product-img { width:100%; height:100%; object-fit:cover; display:block; }
                .ar-watermark { position:absolute; top:18px; left:18px; width:64px; height:auto; z-index:2; object-fit:contain; pointer-events:none; }
                .detail-content { padding:24px 20px; flex:1; display:flex; flex-direction:column; }
                .dt-name { font-size:1.5rem; font-weight:700; color:#111827; margin-bottom:8px; }
                .dt-price { font-size:1.25rem; font-weight:600; color:#EF4444; margin-bottom:16px; }
                .dt-desc { font-size:0.95rem; color:#6B7280; line-height:1.6; margin-bottom:24px; }
                .detail-actions { margin-top:auto; }
                .qty-wrapper { margin-bottom:24px; }
                .qty-label { font-weight:600; margin-bottom:10px; display:block; }
                .qty-selector { display:inline-flex; align-items:center; gap:16px; }
                .qty-circle { width:36px; height:36px; border-radius:50%; border:1px solid #E5E7EB; background:#fff; font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center; }
                .qty-number { font-size:1.1rem; font-weight:600; min-width:20px; text-align:center; }
                .btn-group { display:flex; flex-direction:column; gap:12px; }
                .btn-main { width:100%; padding:14px; border-radius:12px; font-weight:600; font-size:1rem; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; }
                .btn-primary { background:#FACC15; color:#111827; }
                .btn-outline { background:transparent; border:1px solid #111827; color:#111827; }
            `}</style>

            {/* container mimicking #detailView */}
            <div
                className={`detail-modal ${isOpen ? 'open' : ''}`}
                role="dialog"
                aria-modal={isOpen}
                aria-hidden={!isOpen}
                style={{ pointerEvents: isOpen ? 'auto' : 'none', WebkitOverflowScrolling: 'touch' }}
            >
                {product && (
                    <>
                        <div className="detail-header">
                            <button className="back-btn" onClick={onClose} aria-label="Kembali">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            </button>
                            <span className="detail-title-header" style={{ fontWeight: 700, fontSize: '1.1rem' }}>Detail Produk</span>
                        </div>

                        <div className="detail-image-container">
                            {product.ar && (
                                <img src="/assets/Ar_Icon.png" alt="AR" className="ar-watermark" />
                            )}
                            <img
                                className="product-img"
                                src={`/assets/${product.imgFile}`}
                                alt={product.name}
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://placehold.co/600x600/E5E7EB/6B7280?text=${encodeURIComponent(product.name)}`; }}
                            />
                        </div>

                        <div className="detail-content">
                            <h2 className="dt-name">{product.name}</h2>
                            <div className="dt-price">{formatRupiah(product.price)}</div>
                            <p className="dt-desc">{product.desc}</p>

                            <div className="detail-actions">
                                <div className="qty-wrapper">
                                    <span className="qty-label">Jumlah</span>
                                    <div className="qty-selector">
                                        <button
                                            className="qty-circle"
                                            onClick={() => onChangeSelectedQty && onChangeSelectedQty(-1)}
                                            aria-label="Kurangi jumlah"
                                        >−</button>

                                        <input
                                            type="text"
                                            className="qty-number"
                                            value={qty}
                                            onChange={(e) => onManualInput && onManualInput(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ width: '50px', border: 'none', background: 'transparent', outline: 'none', textAlign: 'center' }}
                                        />

                                        <button
                                            className="qty-circle"
                                            onClick={() => onChangeSelectedQty && onChangeSelectedQty(1)}
                                            aria-label="Tambah jumlah"
                                        >+</button>
                                    </div>
                                </div>

                                <div className="btn-group">
                                    {product.ar && (
                                        <button className="btn-main btn-outline" id="btnAR" onClick={() => {
                                            router.push('/ar?model=/assets/extra_chocolate_marshmallow_cupcake.glb');
                                        }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>
                                            Lihat di Meja Anda (AR)
                                        </button>
                                    )}

                                    <button className="btn-main btn-primary" onClick={() => {
                                        const currentQty = parseInt(qty) || 0;
                                        if (currentQty <= 0) {
                                            alert("Mohon isi jumlah pesanan terlebih dahulu!");
                                            return;
                                        }
                                        onClose();
                                    }}>
                                        Tambah ke Keranjang
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
