// src/lib/data.js

export const products = [
  { 
      id: 1, 
      name: 'Nasi Omelet', 
      price: 8000, 
      category: 'makanan', 
      ar: true, 
      // Pastikan nama file gambar sesuai dengan yang ada di folder public/assets/
      imgFile: 'Nasi_Omelet.png',
      desc: "Nasi omelet lembut dengan telur yang dimasak sempurna dan aroma gurih yang khas."
  },
  { 
      id: 2, 
      name: 'Es Teh Manis', 
      price: 3000, 
      category: 'minuman', 
      ar: true, 
      imgFile: 'Es_Teh_Manis.png',
      desc: "Kesegaran teh asli pilihan dengan manis gula murni yang pas."
  },
  { 
      id: 3, 
      name: 'Es Susu Coklat', 
      price: 5000, 
      category: 'minuman', 
      ar: false, 
      imgFile: 'Es_Susu_Coklat.png',
      desc: "Perpaduan susu segar dan coklat premium yang creamy."
  },
  { 
      id: 4, 
      name: 'Nasi Soto Bening', 
      price: 8000, 
      category: 'makanan', 
      ar: false, 
      imgFile: 'Soto_Bening.png',
      desc: "Soto ayam kuah bening segar dengan rempah tradisional."
  },
  { 
      id: 5, 
      name: 'Nasi Katsu', 
      price: 13000, 
      category: 'makanan', 
      ar: false, 
      imgFile: 'Nasi_Katsu.png',
      desc: "Nasi ayam katsu renyah dengan potongan ayam tebal."
  },
  { 
      id: 6, 
      name: 'Es Matcha', 
      price: 5000, 
      category: 'minuman', 
      ar: false, 
      imgFile: 'Es_Matcha.png',
      desc: "Minuman matcha jepang dengan susu creamy yang lembut."
  }
];