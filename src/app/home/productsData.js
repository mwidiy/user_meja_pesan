// ...new file...
export const productsData = [
  { id: 1, name: 'Nasi Omelet', price: 8000, category: 'makanan', ar: true, imgFile: 'Nasi_Omelet.png', desc: "Nasi omelet lembut dengan telur yang dimasak sempurna..." },
  { id: 2, name: 'Es Teh Manis', price: 3000, category: 'minuman', ar: true, imgFile: 'Es_Teh_Manis.png', desc: "Kesegaran teh asli pilihan..." },
  { id: 3, name: 'Es Susu Coklat', price: 5000, category: 'minuman', ar: false, imgFile: 'Es_Susu_Coklat.png', desc: "Perpaduan susu segar dan coklat premium..." },
  { id: 4, name: 'Nasi Soto Bening', price: 8000, category: 'makanan', ar: false, imgFile: 'Soto_Bening.png', desc: "Soto ayam kuah bening segar..." },
  { id: 5, name: 'Nasi Katsu', price: 13000, category: 'makanan', ar: false, imgFile: 'Nasi_Katsu.png', desc: "Nasi ayam katsu renyah..." },
  { id: 6, name: 'Es Matcha', price: 5000, category: 'minuman', ar: false, imgFile: 'Es_Matcha.png', desc: "Minuman matcha jepang..." }
];

export const formatRupiah = (num) => 'Rp ' + num.toLocaleString('id-ID');

export default productsData;
