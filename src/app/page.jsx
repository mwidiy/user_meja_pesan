// src/app/page.tsx
'use client'; // Wajib karena kita pakai useState dan onClick

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <>
      {/* Styles diadaptasi dari index.html agar tampilan identik */}
      <style jsx global>{`
				/* --- RESET & BASIC SETUP (diambil dari index.html) --- */
				* {
					box-sizing: border-box;
					margin: 0;
					padding: 0;
					font-family: 'Poppins', sans-serif;
					-webkit-tap-highlight-color: transparent;
				}

				:root {
					--accent: #fdd85d;
					--accent-dark: #fdd85d;
					--text-dark: #1a2b48;
				}

				html, body, #__next {
					height: 100%;
				}

				body {
					background-color: #ffffff;
					color: var(--text-dark);
					height: 100vh;
					width: 100%;
					display: flex;
					justify-content: center;
					overflow: hidden;
				}

				/* --- CONTAINER --- */
				.app-container {
					width: 100%;
					max-width: 480px;
					height: 100%;
					position: relative;
					display: flex;
					flex-direction: column;
					justify-content: space-between;
					padding: 40px 30px;
					background: #fff;
					/* dekorasi kuning transparan dihapus */
					background-image: none;
				}

				/* Dekorasi latar belakang (sekarang menggunakan img agar bisa diganti) */
				.decoration-p-img {
					position: absolute;
					top: -50px;
					left: 20px;
					width: 300px; /* sesuaikan jika gambarnya berbeda ukuran */
					height: auto;
					z-index: 0;
					pointer-events: none;
					opacity: 1;
				}

				.decoration-right-img {
					position: absolute;
					top: 0;
					right: 0;
					width: 150px;
					height: 150px;
					object-fit: cover;
					z-index: 0;
				}

				.decoration-circle-img {
					position: absolute;
					bottom: -50px;
					left: -50px;
					width: 200px;
					height: 200px;
					object-fit: cover;
					z-index: 0;
				}

				/* --- LOGO SECTION --- */
				.logo-section {
					flex: 1;
					display: flex;
					align-items: center;
					justify-content: center;
					z-index: 1;
					margin-top: 40px;
				}

				.logo-img {
					width: 120px;
					height: auto;
					object-fit: contain;
				}

				/* --- CONTENT SECTION --- */
				.content-section {
					z-index: 1;
					margin-bottom: 40px;
					text-align: center;
				}

				h1 {
					font-size: 28px;
					color: #1e3a5f;
					margin-bottom: 40px;
					line-height: 1.4;
					min-height: 80px;
				}

				.highlight-name {
					color: var(--accent);
					font-weight: 700;
					transition: all 0.3s ease;
				}

				/* --- INPUT FIELD STYLING --- */
				.input-group {
					position: relative;
					text-align: left;
					margin: 0 auto;
					max-width: 100%;
				}

				.input-group label {
					position: absolute;
					top: -10px;
					left: 20px;
					background-color: #ffffff;
					padding: 0 8px;
					font-size: 14px;
					color: #555;
					font-weight: 500;
					z-index: 2;
				}

				.input-group input {
					width: 100%;
					padding: 18px 20px;
					border: 2px solid #eef0f2;
					border-radius: 20px;
					font-size: 18px;
					color: #333;
					outline: none;
					background: transparent;
					transition: border-color 0.3s;
				}

				.input-group input:focus {
					border-color: var(--accent);
				}

				/* --- FOOTER BUTTON --- */
				.footer-section {
					z-index: 1;
					padding-bottom: 20px;
				}

				.btn-primary {
					width: 100%;
					padding: 20px;
					background: linear-gradient(to bottom right, #fee070, #fccf40);
					border: none;
					border-radius: 50px;
					font-size: 18px;
					font-weight: 700;
					color: #1e3a5f;
					cursor: pointer;
					box-shadow: 0 10px 20px rgba(253, 216, 93, 0.3);
					transition: transform 0.2s, box-shadow 0.2s;
				}

				.btn-primary:active {
					transform: scale(0.98);
					box-shadow: 0 5px 10px rgba(253, 216, 93, 0.2);
				}

				/* responsive safety */
				@media (max-width: 420px) {
					.app-container { padding: 28px 18px; }
					/* gunakan ukuran/posisi untuk image decoration pada layar kecil */
					.decoration-p-img { width: 220px; left: 10px; top: -40px; }
				}
			`}</style>

      <div className="app-container">
        {/* Dekorasi menggunakan file p.svg (gunakan file ini sebagai referensi di /public/assets) */}
        <img src="/assets/p.svg" alt="P decoration" className="decoration-p-img" />
        <img src="/assets/dekorasi.svg" alt="right decoration" className="decoration-right-img" />
        <img src="/assets/dekorasi.svg" alt="circle decoration" className="decoration-circle-img" />

        <div className="logo-section">
          <img src="/assets/logo.svg" alt="Logo Aplikasi" className="logo-img" />
        </div>

        <div className="content-section">
          <h1>
            Senang bertemu
            <br />
            Anda, <span className="highlight-name" id="displayName">{name ? name : '...'}</span> !
          </h1>

          <div className="input-group" style={{ maxWidth: 420, margin: '0 auto' }}>
            <label htmlFor="userName">Nama Anda</label>
            <input
              id="userName"
              type="text"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="footer-section">
          <button className="btn-primary" onClick={handleStart}>Mulai Memesan</button>
        </div>
      </div>
    </>
  );
}