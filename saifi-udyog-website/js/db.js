/**
 * SAIFI UDYOG — Database Layer (production-hardened)
 */

let db = null;
let storage = null;
let auth = null;

const DEFAULT_CATEGORIES = [
  { id: 'sofa-seating', title: 'Sofa & Seating', description: 'Comfortable and stylish seating solutions for living rooms and lounges.', order: 1 },
  { id: 'office-furniture', title: 'Office Furniture', description: 'Functional and ergonomic furniture designed for productive workspaces.', order: 2 },
  { id: 'home-furniture', title: 'Home Furniture', description: 'Beautiful furniture pieces to make every room in your home feel complete.', order: 3 },
  { id: 'other-furniture', title: 'Other Furniture', description: 'Additional furniture solutions including storage, shelving and custom pieces.', order: 4 }
];

const MAX_IMAGE_DATA_URL_CHARS = 450000; // keep Firestore docs safely under 1MB
const MAX_UPLOAD_FILE_BYTES = 8 * 1024 * 1024; // 8MB original file

function initFirebase() {
  if (typeof FIREBASE_ENABLED === 'undefined' || !FIREBASE_ENABLED) return false;
  if (typeof firebase === 'undefined') return false;
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    // Public pages load only Firestore. Admin also loads Auth (+ Storage).
    // Do NOT call firebase.auth() unless the Auth SDK script is present —
    // otherwise init throws and the website never loads products.
    if (typeof firebase.auth === 'function') {
      auth = firebase.auth();
    } else {
      auth = null;
    }

    if (typeof firebase.firestore !== 'function') {
      throw new Error('Firebase Firestore SDK is missing on this page.');
    }
    db = firebase.firestore();

    try {
      storage = (typeof firebase.storage === 'function') ? firebase.storage() : null;
    } catch (e) {
      storage = null;
      console.warn('Storage unavailable:', e);
    }
    return true;
  } catch (e) {
    console.error('Firebase init failed:', e);
    db = null;
    auth = null;
    storage = null;
    return false;
  }
}

function isFirebaseReady() {
  if (typeof FIREBASE_ENABLED !== 'undefined' && FIREBASE_ENABLED && !db) {
    initFirebase();
  }
  return Boolean(db);
}

function firebaseErrorMessage(err) {
  const code = (err && err.code) || '';
  const raw = String((err && err.message) || '');
  if (code.includes('permission-denied') || /permission|insufficient/i.test(raw)) {
    return 'Permission denied. In Firebase Console → Firestore → Rules, allow public read on products & categories, then Publish.';
  }
  if (code.includes('unauthenticated')) {
    return 'Session expired. Please log in again.';
  }
  if (code.includes('storage/')) {
    return 'Image cloud storage is not ready. Image will be saved with the product instead.';
  }
  if (code.includes('unavailable') || code.includes('network')) {
    return 'Network issue. Check your internet and try again.';
  }
  return (err && err.message) || 'Unexpected error';
}

/* ---- Auth ---- */
async function adminLogin(email, password) {
  if (!initFirebase() || !auth) throw new Error('Firebase is not configured.');
  return auth.signInWithEmailAndPassword(email, password);
}

async function adminLogout() {
  if (auth) await auth.signOut();
}

function onAuthChange(callback) {
  if (!initFirebase() || !auth) return;
  auth.onAuthStateChanged(callback);
}

function getCurrentUser() {
  return (auth && auth.currentUser) || null;
}

function requireAuth() {
  if (!getCurrentUser()) {
    throw new Error('Not logged in. Please refresh and sign in again.');
  }
}

/* ---- Categories ---- */
async function getCategories() {
  if (!isFirebaseReady()) {
    return DEFAULT_CATEGORIES.map(c => ({ ...c }));
  }
  try {
    const snap = await db.collection('categories').get();
    if (snap.empty) return [];
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  } catch (err) {
    console.error('getCategories failed:', err);
    throw new Error(firebaseErrorMessage(err));
  }
}

async function ensureDefaultCategories() {
  const fallback = DEFAULT_CATEGORIES.map(c => ({ ...c }));
  if (!isFirebaseReady()) return fallback;

  try {
    let existing = await getCategories();
    if (existing.length) return existing;

    const batch = db.batch();
    DEFAULT_CATEGORIES.forEach(cat => {
      const ref = db.collection('categories').doc(cat.id);
      batch.set(ref, cat, { merge: true });
    });
    await batch.commit();
    existing = await getCategories();
    return existing.length ? existing : fallback;
  } catch (err) {
    console.warn('ensureDefaultCategories fallback:', err);
    return fallback;
  }
}

async function saveCategory(category) {
  if (!isFirebaseReady()) throw new Error('Firebase not configured');
  requireAuth();
  const id = String(category.id || '').trim();
  if (!id || !category.title) throw new Error('Category name is required.');
  await db.collection('categories').doc(id).set({
    title: String(category.title).trim(),
    description: String(category.description || '').trim(),
    order: Number(category.order) || 0,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function deleteCategory(id) {
  if (!isFirebaseReady()) throw new Error('Firebase not configured');
  requireAuth();
  const products = await db.collection('products').where('categoryId', '==', id).limit(1).get();
  if (!products.empty) {
    throw new Error('Cannot delete category with products. Move or delete products first.');
  }
  await db.collection('categories').doc(id).delete();
}

/* ---- Products ---- */
async function getProducts() {
  // Never invent sample products — empty cloud = empty list
  if (!isFirebaseReady()) return [];
  try {
    const snap = await db.collection('products').get();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  } catch (err) {
    console.error('getProducts failed:', err);
    throw new Error(firebaseErrorMessage(err));
  }
}

function flattenLocalProducts() {
  if (typeof CATALOGUE_DATA === 'undefined') return [];
  const products = [];
  let order = 0;
  CATALOGUE_DATA.forEach(cat => {
    (cat.subcategories || []).forEach(sub => {
      (sub.products || []).forEach(p => {
        products.push({
          id: `local-${order++}`,
          name: p.name,
          description: p.description,
          imageUrl: p.image,
          categoryId: cat.id,
          subcategory: sub.name,
          order,
          active: true
        });
      });
    });
  });
  return products;
}

function validateProductInput(product) {
  const name = String(product.name || '').trim();
  const imageUrl = String(product.imageUrl || '').trim();
  const categoryId = String(product.categoryId || '').trim();

  if (!name) throw new Error('Product name is required.');
  if (!categoryId) throw new Error('Category is required.');
  if (!imageUrl) throw new Error('Product image is required.');

  const lower = imageUrl.toLowerCase();
  const ok =
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('data:image/');
  if (!ok) throw new Error('Image must be an http(s) URL or uploaded image.');

  if (lower.startsWith('data:image/') && imageUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
    throw new Error('Image is too large after compression. Use a smaller photo or an image URL.');
  }

  return {
    name,
    description: String(product.description || '').trim().slice(0, 2000),
    imageUrl,
    categoryId,
    subcategory: String(product.subcategory || '').trim().slice(0, 120),
    order: Number(product.order) || 0,
    active: product.active !== false
  };
}

async function saveProduct(product) {
  if (!isFirebaseReady()) throw new Error('Firebase not configured.');
  requireAuth();

  const data = validateProductInput(product);
  data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

  try {
    if (product.id && !String(product.id).startsWith('local-')) {
      await db.collection('products').doc(product.id).set(data, { merge: true });
      return product.id;
    }
    const ref = await db.collection('products').add({
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  } catch (err) {
    console.error('saveProduct failed:', err);
    throw new Error(firebaseErrorMessage(err));
  }
}

async function deleteProduct(id) {
  if (!isFirebaseReady()) throw new Error('Firebase not configured');
  requireAuth();
  await db.collection('products').doc(id).delete();
}

/* ---- Images ---- */
function isProbablyImageFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  // Windows sometimes gives empty MIME — check extension
  const name = String(file.name || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(name);
}

function compressImageFile(file, maxWidth, quality) {
  maxWidth = maxWidth || 900;
  quality = quality || 0.68;

  return new Promise((resolve, reject) => {
    if (!isProbablyImageFile(file)) {
      reject(new Error('Please select a JPG, PNG, or WebP image.'));
      return;
    }
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      reject(new Error('Image is too large (max 8MB). Choose a smaller photo.'));
      return;
    }

    const finishFromBitmap = (bitmap) => {
      try {
        let width = bitmap.width;
        let height = bitmap.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        if (bitmap.close) bitmap.close();

        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.45);
        }
        if (dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
          reject(new Error('Image is still too large. Use a smaller photo.'));
          return;
        }
        resolve(dataUrl);
      } catch (e) {
        reject(new Error('Could not process image.'));
      }
    };

    // Modern path
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file)
        .then(finishFromBitmap)
        .catch(() => {
          // Fallback below
          readWithFileReader();
        });
      return;
    }

    readWithFileReader();

    function readWithFileReader() {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read image file.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not open this image. Try JPG/PNG.'));
        img.onload = () => {
          try {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;
            if (!width || !height) {
              reject(new Error('Invalid image dimensions.'));
              return;
            }
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            let dataUrl = canvas.toDataURL('image/jpeg', quality);
            if (dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
              dataUrl = canvas.toDataURL('image/jpeg', 0.45);
            }
            if (dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
              reject(new Error('Image is still too large. Use a smaller photo.'));
              return;
            }
            resolve(dataUrl);
          } catch (e) {
            reject(new Error('Could not process image.'));
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  });
}

async function uploadImage(file, path) {
  if (!isFirebaseReady() || !storage) throw new Error('Firebase Storage not available.');
  requireAuth();
  const ref = storage.ref(path);
  const snapshot = await ref.put(file);
  return snapshot.ref.getDownloadURL();
}

/**
 * Always compress locally first.
 * Storage is optional — if it fails/hangs, we still return a working image data URL.
 */
async function uploadProductImage(file) {
  const compressedDataUrl = await compressImageFile(file);

  // Only try Storage if bucket looks configured AND user is logged in
  const canTryStorage =
    isFirebaseReady() &&
    storage &&
    getCurrentUser() &&
    FIREBASE_CONFIG &&
    FIREBASE_CONFIG.storageBucket;

  if (!canTryStorage) {
    return compressedDataUrl;
  }

  try {
    const res = await fetch(compressedDataUrl);
    const blob = await res.blob();
    const safe = String(file.name || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `products/${Date.now()}_${safe}.jpg`;
    const ref = storage.ref(path);

    // Timeout so Storage hang doesn't block upload
    const uploadPromise = ref.put(blob, { contentType: 'image/jpeg' }).then(s => s.ref.getDownloadURL());
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Storage timeout')), 8000)
    );
    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Storage skipped/failed, using local compressed image:', err);
    return compressedDataUrl;
  }
}

/* ---- Public catalogue (live Firebase only — never sample / Unsplash filler) ---- */
function isProductPubliclyVisible(p) {
  if (!p) return false;
  // Hidden only when explicitly false (boolean or string)
  if (p.active === false || p.active === 'false') return false;
  return true;
}

function mapProductForCatalogue(p) {
  return {
    name: p.name || 'Product',
    description: p.description || '',
    image: p.imageUrl || ''
  };
}

/**
 * Loads catalogue for the public website.
 * Returns { data, error } so the UI can distinguish empty vs permission failure.
 */
async function getCatalogueData() {
  const result = { data: [], error: null };
  try {
    if (typeof initFirebase === 'function') initFirebase();
    if (!isFirebaseReady()) {
      result.error = 'Firebase is not connected. Check firebase-config.js.';
      return result.data;
    }

    let categories = [];
    let productsRaw = [];

    try {
      categories = await getCategories();
    } catch (err) {
      console.error('getCategories (public):', err);
      result.error = firebaseErrorMessage(err);
      categories = [];
    }

    try {
      productsRaw = await getProducts();
    } catch (err) {
      console.error('getProducts (public):', err);
      result.error = firebaseErrorMessage(err);
      // Permission denied while admin works = Firestore rules block public read
      if (/permission|insufficient|unauth/i.test(String(err.message || err.code || ''))) {
        result.error =
          'Firestore is blocking public reads. In Firebase Console → Firestore → Rules, publish rules that allow anyone to read products and categories.';
      }
      window.__SAIFI_CATALOGUE_ERROR = result.error;
      return result.data;
    }

    const products = (productsRaw || []).filter(isProductPubliclyVisible);
    window.__SAIFI_CATALOGUE_ERROR = null;

    const cats = (categories && categories.length) ? categories : [];
    const knownIds = new Set(cats.map(c => c.id));
    const orphanProducts = products.filter(p => !knownIds.has(p.categoryId));
    const allCats = cats.slice();
    if (orphanProducts.length) {
      allCats.push({
        id: '_other',
        title: 'More Products',
        description: '',
        order: 999
      });
    }

    // Always include every category — even with 0 products (UI shows empty message)
    result.data = allCats.map(cat => {
      const catProducts = cat.id === '_other'
        ? orphanProducts
        : products.filter(p => p.categoryId === cat.id);

      const groups = new Map();
      catProducts.forEach(p => {
        const key = (p.subcategory && String(p.subcategory).trim()) || 'Products';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(mapProductForCatalogue(p));
      });

      return {
        id: cat.id,
        title: cat.title,
        description: cat.description || '',
        subcategories: [...groups.entries()].map(([name, list]) => ({
          name,
          products: list
        }))
      };
    });

    return result.data;
  } catch (err) {
    console.error('getCatalogueData failed:', err);
    window.__SAIFI_CATALOGUE_ERROR = err.message || String(err);
    return [];
  }
}

/* ---- Settings ---- */
async function getSiteSettings() {
  const defaults = typeof SITE_CONFIG !== 'undefined' ? { ...SITE_CONFIG } : {};
  if (!isFirebaseReady()) return defaults;
  try {
    const doc = await db.collection('settings').doc('contact').get();
    if (!doc.exists) return defaults;
    const merged = { ...defaults };
    Object.entries(doc.data() || {}).forEach(([k, v]) => {
      if (v !== '' && v != null) merged[k] = v;
    });
    return merged;
  } catch (e) {
    console.warn('getSiteSettings failed:', e);
    return defaults;
  }
}

async function saveSiteSettings(settings) {
  if (!isFirebaseReady()) throw new Error('Firebase not configured');
  requireAuth();
  await db.collection('settings').doc('contact').set({
    phone: String(settings.phone || '').trim(),
    whatsapp: String(settings.whatsapp || '').trim(),
    whatsappNumber: String(settings.whatsappNumber || '').replace(/\D/g, ''),
    email: String(settings.email || '').trim(),
    address: String(settings.address || '').trim(),
    mapsEmbedUrl: String(settings.mapsEmbedUrl || '').trim(),
    web3formsKey: String(settings.web3formsKey || '').trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

/* ---- Enquiries ---- */
async function saveEnquiry(data) {
  if (!isFirebaseReady()) return null;
  try {
    const ref = await db.collection('enquiries').add({
      name: String(data.name || '').trim().slice(0, 120),
      mobile: String(data.mobile || '').trim().slice(0, 30),
      email: String(data.email || '').trim().slice(0, 120),
      message: String(data.message || '').trim().slice(0, 3000),
      product: String(data.product || '').trim().slice(0, 200),
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  } catch (err) {
    console.error('saveEnquiry failed:', err);
    // Do not throw — caller still opens WhatsApp; returns null so UI can warn
    return null;
  }
}

async function getEnquiries() {
  if (!isFirebaseReady()) return [];
  try {
    const snap = await db.collection('enquiries').get();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = (a.createdAt && a.createdAt.toMillis && a.createdAt.toMillis()) || 0;
        const tb = (b.createdAt && b.createdAt.toMillis && b.createdAt.toMillis()) || 0;
        return tb - ta;
      });
  } catch (err) {
    throw new Error(firebaseErrorMessage(err));
  }
}

async function markEnquiryRead(id) {
  if (!isFirebaseReady()) return;
  requireAuth();
  await db.collection('enquiries').doc(id).update({ read: true });
}

async function deleteEnquiry(id) {
  if (!isFirebaseReady()) return;
  requireAuth();
  await db.collection('enquiries').doc(id).delete();
}

/* ---- Seed ---- */
async function seedDatabase() {
  if (!isFirebaseReady()) throw new Error('Firebase not configured');
  requireAuth();

  await ensureDefaultCategories();
  const local = flattenLocalProducts();
  for (const p of local) {
    await db.collection('products').add({
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      categoryId: p.categoryId,
      subcategory: p.subcategory,
      order: p.order,
      active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}
