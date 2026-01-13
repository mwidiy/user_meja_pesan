// --- SMART CONFIGURATION ---
// Helper untuk mendapatkan URL Dynamic secara Runtime
export const getDynamicUrl = () => {
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol;
        const host = window.location.hostname;
        return `${protocol}//${host}:3000`;
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

export const getProducts = async () => {
    const API_URL = getDynamicUrl(); // Calculate NOW
    try {
        console.log("🔍 [Debug] Fetching Products:", `${API_URL}/api/products`);
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
    const API_URL = getDynamicUrl();
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

export const getBanners = async () => {
    const API_URL = getDynamicUrl();
    try {
        const res = await fetch(`${API_URL}/api/banners?status=active`, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`Failed to fetch banners: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error fetching banners:', error);
        return [];
    }
};

export const getTableByQrCode = async (code) => {
    const API_URL = getDynamicUrl();
    try {
        console.log("🔍 [Debug] Fetching Table Scan:", `${API_URL}/api/tables/scan/${code}`);
        const res = await fetch(`${API_URL}/api/tables/scan/${code}`, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`Failed to verify table: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error verifying table:', error);
        return null;
    }
};

export const getStore = async () => {
    const API_URL = getDynamicUrl();
    try {
        const res = await fetch(`${API_URL}/api/store`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to fetch store: ${res.statusText}`);
        return await res.json();
    } catch (error) {
        console.error('Error fetching store:', error);
        return null; // Return null so UI can use default
    }
};

export const getImageUrl = (urlOrFilename) => {
    const API_URL = getDynamicUrl();
    if (!urlOrFilename) return '/assets/logo.png'; // Default placeholder/fallback

    // Jika URL lengkap (ada http/https)
    if (urlOrFilename.startsWith('http')) {
        try {
            const apiUrlObj = new URL(API_URL);
            const imgUrlObj = new URL(urlOrFilename);

            // Force replace localhost/127.0.0.1 with API_URL hostname
            if (['localhost', '127.0.0.1'].includes(imgUrlObj.hostname)) {
                imgUrlObj.protocol = apiUrlObj.protocol;
                imgUrlObj.hostname = apiUrlObj.hostname;
                imgUrlObj.port = apiUrlObj.port; // Ensure port matches API (3000)
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

export const createOrder = async (orderData) => {
    const API_URL = getDynamicUrl();
    try {
        const res = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to create order: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
};

export const getOrderByTransactionCode = async (code) => {
    const API_URL = getDynamicUrl();
    try {
        console.log("🔍 [Debug] Fetching Order by Code:", `${API_URL}/api/orders/code/${code}`);
        const res = await fetch(`${API_URL}/api/orders/code/${code}`, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`Failed to fetch order: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error fetching order by code:', error);
        return null;
    }
};

export const getOrdersByBatch = async (codes) => {
    const API_URL = getDynamicUrl();
    try {
        console.log("🔍 [Debug] Fetching Batch Orders:", `${API_URL}/api/orders/batch`);
        const res = await fetch(`${API_URL}/api/orders/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ codes }),
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch batch orders: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error fetching batch orders:', error);
        return { success: false, data: [] };
    }
};
