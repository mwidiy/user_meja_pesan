// src/app/layout.jsx

// Gunakan "../styles/globals.css" karena file ada di folder styles
import "../styles/globals.css";

import { Inter } from 'next/font/google';
import TableGuard from '../components/TableGuard';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: "Meja Pesan App",
  description: "Aplikasi Pemesanan Makanan",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      {/* suppressHydrationWarning ditambahkan untuk mencegah error ekstensi browser */}
      <body className={inter.className} suppressHydrationWarning={true}>
        <TableGuard>
          {children}
        </TableGuard>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (process.env.NODE_ENV === 'production') {
                console.log = function() {};
                console.warn = function() {};
                console.error = function() {};
              }
            `,
          }}
        />
      </body>
    </html>
  );
}