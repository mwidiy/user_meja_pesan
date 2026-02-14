'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDynamicUrl } from '../../services/api';

export default function PaymentCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [status, setStatus] = useState('verifying'); // verifying, success, pending, error
    const [message, setMessage] = useState('Memverifikasi pembayaran...');

    useEffect(() => {
        const verify = async () => {
            const orderId = searchParams.get('order_id') || searchParams.get('orderId');

            if (!orderId) {
                setStatus('error');
                setMessage('Order ID tidak ditemukan');
                return;
            }

            try {
                const API_URL = getDynamicUrl();
                // Call our verification endpoint
                const res = await fetch(`${API_URL}/api/payment/verify/${orderId}`);
                const json = await res.json();

                if (json.success && json.status === 'Paid') {
                    setStatus('success');
                    setMessage('Pembayaran Berhasil!');

                    // Redirect to receipt after short delay
                    setTimeout(() => {
                        // Construct state for Receipt Page
                        const state = {
                            id: orderId,
                            status: 'paid',
                            method: 'QRIS',
                            transactionCode: orderId
                        };
                        router.push(`/order?state=${encodeURIComponent(JSON.stringify(state))}`);
                    }, 1500);

                } else {
                    setStatus('pending');
                    setMessage('Pembayaran belum terkonfirmasi. Silakan cek status di aplikasi E-Wallet Anda.');
                }

            } catch (err) {
                console.error("Verification Error:", err);
                setStatus('error');
                setMessage('Gagal memverifikasi status pembayaran.');
            }
        };

        // Add small delay to ensure backend is ready/Pakasir has updated
        const timer = setTimeout(verify, 1000);
        return () => clearTimeout(timer);

    }, [searchParams]);

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', padding: '20px', textAlign: 'center'
        }}>
            {status === 'verifying' && (
                <>
                    <div className="spinner"></div>
                    <h2 style={{ marginTop: 20 }}>Memverifikasi...</h2>
                    <p style={{ color: '#666' }}>Mohon tunggu sebentar</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    </div>
                    <h2>Pembayaran Berhasil!</h2>
                    <p>Mengalihkan ke nota...</p>
                </>
            )}

            {(status === 'pending' || status === 'error') && (
                <>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        <span style={{ fontSize: '40px', color: '#FFF' }}>!</span>
                    </div>
                    <h2>{status === 'pending' ? 'Belum Terbayar' : 'Gagal Verifikasi'}</h2>
                    <p style={{ color: '#666', marginBottom: 30 }}>{message}</p>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{ padding: '12px 24px', background: '#FACC15', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Cek Lagi
                        </button>
                        <button
                            onClick={() => router.push('/')} // Or router.back()
                            style={{ padding: '12px 24px', background: '#E5E7EB', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Ke Menu Utama
                        </button>
                    </div>
                </>
            )}

            <style jsx>{`
                .spinner {
                    width: 50px; height: 50px;
                    border: 5px solid #E5E7EB;
                    border-top-color: #FACC15;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
