/**
 * CopiumMeter Service Worker
 * Enables offline functionality by caching app assets and model files
 */

const CACHE_NAME = 'copiummeter-v4';
const MODEL_CACHE_NAME = 'copiummeter-models-v4';

// App shell files to cache
const APP_SHELL = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// CDN resources to cache
const CDN_RESOURCES = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(APP_SHELL);
            })
            .then(() => {
                console.log('[SW] App shell cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache app shell:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME && name !== MODEL_CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Handle HuggingFace model/CDN requests (cache with network fallback)
    if (url.hostname.includes('huggingface.co') || 
        url.hostname.includes('cdn-lfs') ||
        url.hostname.includes('hf.co')) {
        event.respondWith(handleModelRequest(event.request));
        return;
    }
    
    // Handle Transformers.js CDN
    if (url.hostname.includes('cdn.jsdelivr.net') && url.pathname.includes('transformers')) {
        event.respondWith(handleCdnRequest(event.request));
        return;
    }
    
    // Handle Google Fonts
    if (url.hostname.includes('fonts.googleapis.com') || 
        url.hostname.includes('fonts.gstatic.com')) {
        event.respondWith(handleCdnRequest(event.request));
        return;
    }
    
    // Handle app shell (cache first)
    event.respondWith(handleAppRequest(event.request));
});

// Handle app shell requests - cache first, network fallback
async function handleAppRequest(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);
        
        // Return cached version or offline page
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // For navigation requests, return the cached index.html
        if (request.mode === 'navigate') {
            return caches.match('./index.html');
        }
        
        throw error;
    }
}

// Handle CDN requests - cache with long expiry
async function handleCdnRequest(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Handle model requests - cache with separate cache for large files
async function handleModelRequest(request) {
    try {
        // Check model cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] Serving model from cache:', request.url);
            return cachedResponse;
        }
        
        console.log('[SW] Fetching model from network:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache model files in separate cache
            const cache = await caches.open(MODEL_CACHE_NAME);
            cache.put(request, networkResponse.clone());
            console.log('[SW] Model cached:', request.url);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Model fetch failed:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data === 'getModelCacheSize') {
        getCacheSize(MODEL_CACHE_NAME).then((size) => {
            event.source.postMessage({
                type: 'modelCacheSize',
                size: size
            });
        });
    }
});

// Helper to get cache size
async function getCacheSize(cacheName) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    let totalSize = 0;
    
    for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
            const blob = await response.clone().blob();
            totalSize += blob.size;
        }
    }
    
    return totalSize;
}
