/**
 * SAIFI UDYOG — Database Layer
 * Loads products from Firebase Firestore, falls back to products-data.js
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

function initFirebase() {
  if (!FIREBASE_ENABLED || typeof firebase === 'undefined') return false;
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();
  return true;
}

function isFirebaseReady() {
  if (FIREBASE_ENABLED && !db) initFirebase();
  return FIREBASE_ENABLED && db !== null;
}

/* ---- Auth ---- */
async function adminLogin(email, password) {
  initFirebase();
  if (!auth) throw new Error('Firebase is not configured.');
  return auth.signInWithEmailAndPassword(email, password);
}

async function adminLogout() {
  if (auth) await auth.signOut();
}

function onAuthChange(callback) {
  initFirebase();
  if (!auth) return;
  auth.onAuthStateChanged(callback);
}

/* ---- Categories ---- */
async function getCategories() {
  if (isFirebaseReady()) {
    const snap = await db.collection('categories').orderBy('order').get();
    if (!snap.empty) {
      return snap.docs.map(d => ({ ...d.data(), id: d.id }));
    }
  }
  if (typeof CATALOGUE_DATA !== 'undefined') {
    return CATALOGUE_DATA.map((c, i) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      order: i + 1
    }));
  }
  return DEFAULT_CATEGORIES;
}

async function saveCategory(category) {
  if (!isFirebaseReady()) throw new Error('Firebase not configured');
  const { id, ...data } = category;
  await db.collection('categories').doc(id).set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

async function deleteCategory(id) {
  if (!isFirebaseReady()) throw new Error('Firebase not configured');
  const products = await db.collection('products').where('categoryId', '==', id).get();
  if (!products.empty) throw new Error('Cannot delete category with products. Move or delete products first.');
  await db.collection('categories').doc(id).delete();
}

/* ---- Products ---- */
async function getProducts() {
  if (isFirebaseReady()) {
    const snap = await db.collection('products').orderBy('order').get();
    if (!snap.empty) {
      return snap.docs.map(d => ({ ...d.data(), id: d.id }));
    }
  }
  return flattenLocalProducts();
}

function flattenLocalProducts() {
  if (typeof CATALOGUE_DATA === 'undefined') return [];
  const products = [];
  let order = 0;
  CATALOGUE_DATA.forEach(cat => {
    cat.subcategories.forEach(sub => {
      sub.products.forEach(p => {
        products.push({
          id: `local-${order++}`,
          name: p.name,
          description: p.description,
          imageUrl: p.image,
          categoryId: cat.id,
          subcategory: sub.name,
          order: order,
          active: true
        });
      });
    });
  });
  return products;
}

async function saveProduct(product) {
  if (!isFirebaseReady()) throw new Error('Firebase not configured');
  const data = {
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    categoryId: product.categoryId,
    subcategory: product.subcategory,
    order: product.order || 0,
    active: product.active !== false,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (product.id && !product.id.startsWith('local-')) {
    await db.collection('products').doc(product.id).set(data, { merge: true });
    return product.id;
  }
  const ref = await db.collection('products').add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

async function deleteProduct(id) {
  if (!isFirebaseReady()) throw new Error('Firebase not configured');
  await db.collection('products').doc(id).delete();
}

/* ---- Image Upload ---- */
async function uploadImage(file, path) {
  if (!storage) throw new Error('Firebase Storage not configured');
  const ref = storage.ref(path);
  const snapshot = await ref.put(file);
  return snapshot.ref.getDownloadURL();
}

/* ---- Build catalogue structure for public page ---- */
async function getCatalogueData() {
  const categories = await getCategories();
  const products = (await getProducts()).filter(p => p.active !== false);

  return categories.map(cat => {
    const catProducts = products.filter(p => p.categoryId === cat.id);
    const subcategoryNames = [...new Set(catProducts.map(p => p.subcategory).filter(Boolean))];

    const subcategories = subcategoryNames.map(name => ({
      name,
      products: catProducts
        .filter(p => p.subcategory === name)
        .map(p => ({
          name: p.name,
          description: p.description,
          image: p.imageUrl
        }))
    })).filter(s => s.products.length > 0);

    return {
      id: cat.id,
      title: cat.title,
      description: cat.description,
      subcategories
    };
  }).filter(cat => cat.subcategories.length > 0);
}

/* ---- Site Settings (contact info in cloud) ---- */
async function getSiteSettings() {
  const defaults = typeof SITE_CONFIG !== 'undefined' ? SITE_CONFIG : {};
  if (!isFirebaseReady()) return defaults;

  try {
    const doc = await db.collection('settings').doc('contact').get();
    if (doc.exists) {
      const merged = { ...defaults };
      Object.entries(doc.data()).forEach(([k, v]) => {
        if (v !== '' && v != null) merged[k] = v;
      });
      return merged;
    }
  } catch (e) { console.warn('Could not load settings from Firebase', e); }
  return defaults;
}

async function saveSiteSettings(settings) {
  if (!isFirebaseReady()) throw new Error('Firebase not configured');
  await db.collection('settings').doc('contact').set({
    ...settings,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

/* ---- Enquiries ---- */
async function saveEnquiry(data) {
  if (!isFirebaseReady()) return null;
  const ref = await db.collection('enquiries').add({
    name: data.name,
    mobile: data.mobile,
    email: data.email || '',
    message: data.message,
    product: data.product || '',
    read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

async function getEnquiries() {
  if (!isFirebaseReady()) return [];
  const snap = await db.collection('enquiries').orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function markEnquiryRead(id) {
  if (!isFirebaseReady()) return;
  await db.collection('enquiries').doc(id).update({ read: true });
}

async function deleteEnquiry(id) {
  if (!isFirebaseReady()) return;
  await db.collection('enquiries').doc(id).delete();
}

/* ---- Seed Firestore from local products-data.js ---- */
async function seedDatabase() {
  if (!isFirebaseReady()) throw new Error('Firebase not configured');

  for (const cat of DEFAULT_CATEGORIES) {
    await db.collection('categories').doc(cat.id).set(cat, { merge: true });
  }

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

async function getProductCount() {
  const products = await getProducts();
  return products.filter(p => p.active !== false).length;
}
