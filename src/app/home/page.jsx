// src/app/home/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Ambil nama dari localStorage saat halaman dimuat
    const storedName = localStorage.getItem('customerName');
    if (storedName) setUserName(storedName);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Halo, {userName}!</h1>
      <p>Ini adalah halaman Menu (Home).</p>
      <p className="text-gray-500 text-sm mt-2">
        (Anda perlu memindahkan kode dari home.html ke sini nanti)
      </p>
      
      {/* Tombol Back sementara */}
      <a href="/" className="mt-8 text-blue-500 underline">Kembali ke Depan</a>
    </div>
  );
}