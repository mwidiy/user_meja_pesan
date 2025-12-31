const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const getProducts = async () => {
    try {
        const res = await fetch(`${API_URL}/api/products`, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`Failed to fetch products: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
};

export const getCategories = async () => {
    try {
        const res = await fetch(`${API_URL}/api/categories`, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`Failed to fetch categories: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
};

export const getImageUrl = (urlOrFilename) => {
    if (!urlOrFilename) return '/assets/logo.png'; // Default placeholder/fallback

    // Jika URL lengkap (ada http/https)
    if (urlOrFilename.startsWith('http')) {
        try {
            const apiUrlObj = new URL(API_URL);
            const imgUrlObj = new URL(urlOrFilename);

            // Jika image dari localhost, kita 'paksa' ganti host-nya ke IP API_URL
            // agar bisa diakses dari HP (yang tidak kenal localhost laptop)
            if (imgUrlObj.hostname === 'localhost' || imgUrlObj.hostname === '127.0.0.1') {
                imgUrlObj.protocol = apiUrlObj.protocol;
                imgUrlObj.hostname = apiUrlObj.hostname;
                imgUrlObj.port = apiUrlObj.port;
                return imgUrlObj.toString();
            }
            return urlOrFilename;
        } catch (e) {
            return urlOrFilename;
        }
    }

    // Jika hanya nama file, asumsikan ada di folder uploads backend
    return `${API_URL}/uploads/${urlOrFilename}`;
};
