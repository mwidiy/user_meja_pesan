// src/app/layout.jsx

// Gunakan "../styles/globals.css" karena file ada di folder styles
import "../styles/globals.css"; 

import { Poppins } from "next/font/google";

const poppins = Poppins({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"] 
});

export const metadata = {
  title: "Meja Pesan App",
  description: "Aplikasi Pemesanan Makanan",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      {/* suppressHydrationWarning ditambahkan untuk mencegah error ekstensi browser */}
      <body className={poppins.className} suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}