// --- SMART CONFIGURATION ---
// Helper untuk mendapatkan URL Dynamic secara Runtime
// --- SECURITY: USE ENV VAR FOR API URL ---
export const getDynamicUrl = () => {
    // 1. PRIORITAS UTAMA: Environment variable (untuk production / explicit config)
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // 2. FALLBACK DEVELOPMENT: Gunakan hostname dari browser + port 3000
    //    Ini memungkinkan akses dari device lain di jaringan yang sama
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        return `${window.location.protocol}//${host}:3000`;
    }

    // 3. FALLBACK SERVER-SIDE: localhost (SSR / build time)
    return 'http://localhost:3000';
};

export const getProducts = async (storeId) => {
    const API_URL = getDynamicUrl(); // Calculate NOW
    try {
        const query = storeId ? `?storeId=${storeId}&t=${Date.now()}` : `?t=${Date.now()}`;
        if (process.env.NODE_ENV !== 'production') console.log("🔍 [Debug] Fetching Products:", `${API_URL}/api/products${query}`);
        const res = await fetch(`${API_URL}/api/products${query}`, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`Failed to fetch products: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
};

export const getCategories = async (storeId) => {
    const API_URL = getDynamicUrl();
    try {
        const query = storeId ? `?storeId=${storeId}` : '';
        const res = await fetch(`${API_URL}/api/categories${query}`, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`Failed to fetch categories: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
};

export const getBanners = async (storeId) => {
    const API_URL = getDynamicUrl();
    try {
        const query = storeId ? `&storeId=${storeId}` : '';
        const res = await fetch(`${API_URL}/api/banners?status=active${query}`, { cache: 'no-store' });
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
        if (process.env.NODE_ENV !== 'production') console.log("🔍 [Debug] Fetching Table Scan:", `${API_URL}/api/tables/scan/${code}`);
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

export const getStore = async (storeId) => {
    const API_URL = getDynamicUrl();
    try {
        const query = storeId ? `?storeId=${storeId}` : '';
        const res = await fetch(`${API_URL}/api/store${query}`, { cache: 'no-store' });
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

            // Force replace localhost OR any old IP/hostname with the current API_URL hostname
            // This fixes issues if DB has 'http://192.168.1.4:3000' but we are now on '192.168.1.8'
            if (imgUrlObj.hostname !== apiUrlObj.hostname || imgUrlObj.port !== apiUrlObj.port) {
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

export const getArModelUrl = (urlOrFilename) => {
    const API_URL = getDynamicUrl();
    if (!urlOrFilename) return null;

    // Jika URL lengkap (ada http/https)
    if (urlOrFilename.startsWith('http')) {
        try {
            const apiUrlObj = new URL(API_URL);
            const modelUrlObj = new URL(urlOrFilename);

            // Force replace localhost OR any old IP/hostname with the current API_URL hostname
            if (modelUrlObj.hostname !== apiUrlObj.hostname || modelUrlObj.port !== apiUrlObj.port) {
                modelUrlObj.protocol = apiUrlObj.protocol;
                modelUrlObj.hostname = apiUrlObj.hostname;
                modelUrlObj.port = apiUrlObj.port;
                return modelUrlObj.toString();
            }
            return urlOrFilename;
        } catch (e) {
            return urlOrFilename;
        }
    }

    // Jika hanya nama file, asumsikan ada di folder ar-assets backend
    // Note: Backend serve this at /ar-assets/filename.glb
    return `${API_URL}/ar-assets/${urlOrFilename}`;
};

export const createOrder = async (orderData) => {
    const API_URL = getDynamicUrl();
    try {
        if (process.env.NODE_ENV !== 'production') console.log("🔍 [Debug] Creating Order Payload:", JSON.stringify(orderData, null, 2));
        const res = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData), // orderData should now contain storeId
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
        if (process.env.NODE_ENV !== 'production') console.log("🔍 [Debug] Fetching Order by Code:", `${API_URL}/api/orders/code/${code}`);
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

export const getOrderById = async (id) => {
    const API_URL = getDynamicUrl();
    try {
        if (process.env.NODE_ENV !== 'production') console.log("🔍 [Debug] Fetching Order by ID:", `${API_URL}/api/orders/${id}`);
        const res = await fetch(`${API_URL}/api/orders/${id}`, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`Failed to fetch order: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error fetching order by id:', error);
        return null;
    }
};

export const getOrdersByBatch = async (codes) => {
    const API_URL = getDynamicUrl();
    try {
        if (process.env.NODE_ENV !== 'production') console.log("🔍 [Debug] Fetching Batch Orders:", `${API_URL}/api/orders/batch`);
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

// --- CANCELLATION ---
export const cancelOrder = async (transactionCode, reason) => {
    const API_URL = getDynamicUrl();
    try {
        const res = await fetch(`${API_URL}/api/orders/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionCode, reason })
        });
        return await res.json();
    } catch (error) {
        console.error('Error cancelling order:', error);
        throw error;
    }
};
