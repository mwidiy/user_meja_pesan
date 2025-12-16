// src/app/page.tsx
'use client'; // Wajib karena kita pakai useState dan onClick

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName] = useState('');

  const handleStart = () => {
    if (!name.trim()) {
      alert("Silakan isi nama Anda terlebih dahulu!");
      return;
    }
    // Simpan ke localStorage seperti di index.html asli
    localStorage.setItem('customerName', name);
    
    // Pindah ke halaman home
    router.push('/home');
  };

  return (
    <main className="flex justify-center min-h-screen bg-white overflow-hidden font-poppins text-[#1a2b48]">
      <div className="w-full max-w-[480px] h-full min-h-screen relative flex flex-col justify-between p-10 bg-white">
        
        {/* Dekorasi Background */}
        <div className="absolute -top-12 left-5 text-[300px] font-bold text-[#f4f6f8] z-0 pointer-events-none leading-none">P</div>
        <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[#fffdf5] rounded-bl-full z-0"></div>
        <div className="absolute -bottom-12 -left-12 w-[200px] h-[200px] bg-[#fffdf0] rounded-full z-0"></div>

        {/* Logo Section */}
        <div className="flex-1 flex items-center justify-center z-10 mt-10">
          {/* Pastikan file logo.png ada di public/assets/ */}
          <img src="/assets/logo.png" alt="Logo Aplikasi" className="w-[120px] h-auto object-contain" />
        </div>

        {/* Content Section */}
        <div className="z-10 mb-10 text-center">
          <h1 className="text-[28px] text-[#1e3a5f] mb-10 leading-[1.4] min-h-[80px]">
            Senang bertemu<br />
            Anda, <span className="text-[#fdd85d] font-bold transition-all duration-300">
              {name || '...'}
            </span> !
          </h1>

          <div className="relative text-left mb-5">
            <label className="absolute -top-2.5 left-5 bg-white px-2 text-sm text-[#555] font-medium z-20">
              Nama Anda
            </label>
            <input 
              type="text" 
              autoComplete="off"
              className="w-full p-4 px-5 border-2 border-[#eef0f2] rounded-[20px] text-lg text-[#333] outline-none bg-transparent transition-colors focus:border-[#fdd85d]"
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </div>
        </div>

        {/* Footer Section */}
        <div className="z-10 pb-5">
          <button 
            onClick={handleStart}
            className="w-full p-5 bg-[#fdd85d] border-none rounded-[50px] text-lg font-bold text-[#1e3a5f] cursor-pointer shadow-[0_10px_20px_rgba(253,216,93,0.3)] hover:scale-[0.98] active:scale-[0.98] transition-transform bg-gradient-to-br from-[#fee070] to-[#fccf40]"
          >
            Mulai Memesan
          </button>
        </div>
      </div>
    </main>
  );
}