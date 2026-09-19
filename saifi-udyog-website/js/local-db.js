/**
 * SAIFI UDYOG — Local Database (no Firebase required)
 * Products & settings stored in browser localStorage.
 * Export JSON to deploy changes to live website.
 */

const DB_KEY = 'saifi_udyog_data';
const AUTH_KEY = 'saifi_udyog_auth';

const DEFAULT_CATEGORIES = [
  { id: 'sofa-seating', title: 'Sofa & Seating', description: 'Comfortable and stylish seating solutions for living rooms and lounges.', order: 1 },
  { id: 'office-furniture', title: 'Office Furniture', description: 'Functional and ergonomic furniture designed for productive workspaces.', order: 2 },
  { id: 'home-furniture', title: 'Home Furniture', description: 'Beautiful furniture pieces to make every room in your home feel complete.', order: 3 },
  { id: 'other-furniture', title: 'Other Furniture', description: 'Additional furniture solutions including storage, shelving and custom pieces.', order: 4 }
];

function getStore() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

function saveStore(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function uid() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/* ---- Auth ---- */
function adminLoginLocal(password) {
  const expected = SITE_CONFIG?.adminPassword || 'saifi2024';
  if (password === expected) {
    sessionStorage.setItem(AUTH_KEY, '1');
    return true;
  }
  throw new Error('Invalid password.');
}

function adminLogoutLocal() {
  sessionStorage.removeItem(AUTH_KEY);
}

function isAdminLoggedIn() {
  return sessionStorage.getItem(AUTH_KEY) === '1';
}

function requireAdmin() {
  if (!isAdminLoggedIn()) window.location.href = 'index.html';
}

/* ---- Init / Seed ---- */
function flattenCatalogueData(catalogue) {
  const products = [];
  let order = 0;
  catalogue.forEach(cat => {
    cat.subcategories.forEach(sub => {
      sub.products.forEach(p => {
        products.push({
          id: uid(),
          name: p.name,
          description: p.description,
          imageUrl: p.image,
          categoryId: cat.id,
          subcategory: sub.name,
          order: order++,
          active: true
        });
      });
    });
  });
  return products;
}

async function initLocalDb() {
  if (getStore()) return;

  let categories = DEFAULT_CATEGORIES;
  let products = [];

  try {
    const res = await fetch('../data/catalogue.json');
    if (res.ok) {
      const json = await res.json();
      categories = json.categories || DEFAULT_CATEGORIES;
      products = json.products || [];
    }
  } catch (e) { /* fallback below */ }

  if (!products.length && typeof CATALOGUE_DATA !== 'undefined') {
    categories = CATALOGUE_DATA.map((c, i) => ({
      id: c.id, title: c.title, description: c.description, order: i + 1
    }));
    products = flattenCatalogueData(CATALOGUE_DATA);
  }

  saveStore({ categories, products, settings: {} });
}

function resetToSample() {
  if (typeof CATALOGUE_DATA === 'undefined') return;
  const categories = CATALOGUE_DATA.map((c, i) => ({
    id: c.id, title: c.title, description: c.description, order: i + 1
  }));
  const products = flattenCatalogueData(CATALOGUE_DATA);
  const store = getStore() || {};
  saveStore({ ...store, categories, products });
}

/* ---- Categories ---- */
function getLocalCategories() {
  return getStore()?.categories || DEFAULT_CATEGORIES;
}

function saveLocalCategory(category) {
  const store = getStore() || { categories: [], products: [], settings: {} };
  const idx = store.categories.findIndex(c => c.id === category.id);
  if (idx >= 0) store.categories[idx] = category;
  else store.categories.push(category);
  saveStore(store);
}

function deleteLocalCategory(id) {
  const store = getStore();
  if (!store) return;
  if (store.products.some(p => p.categoryId === id)) {
    throw new Error('Cannot delete category with products. Move or delete products first.');
  }
  store.categories = store.categories.filter(c => c.id !== id);
  saveStore(store);
}

/* ---- Products ---- */
function getLocalProducts() {
  return getStore()?.products || [];
}

function saveLocalProduct(product) {
  const store = getStore() || { categories: DEFAULT_CATEGORIES, products: [], settings: {} };
  if (product.id) {
    const idx = store.products.findIndex(p => p.id === product.id);
    if (idx >= 0) store.products[idx] = product;
    else store.products.push(product);
  } else {
    product.id = uid();
    store.products.push(product);
  }
  saveStore(store);
  return product.id;
}

function deleteLocalProduct(id) {
  const store = getStore();
  if (!store) return;
  store.products = store.products.filter(p => p.id !== id);
  saveStore(store);
}

/* ---- Settings (contact info) ---- */
function getLocalSettings() {
  return getStore()?.settings || {};
}

function saveLocalSettings(settings) {
  const store = getStore() || { categories: DEFAULT_CATEGORIES, products: [], settings: {} };
  store.settings = { ...store.settings, ...settings };
  saveStore(store);
}

/* ---- Build catalogue for public page ---- */
function buildCatalogueFromStore() {
  const store = getStore();
  if (!store) return null;

  const categories = [...store.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
  const products = store.products.filter(p => p.active !== false);

  return categories.map(cat => {
    const catProducts = products.filter(p => p.categoryId === cat.id);
    const subNames = [...new Set(catProducts.map(p => p.subcategory).filter(Boolean))];

    return {
      id: cat.id,
      title: cat.title,
      description: cat.description,
      subcategories: subNames.map(name => ({
        name,
        products: catProducts
          .filter(p => p.subcategory === name)
          .map(p => ({ name: p.name, description: p.description, image: p.imageUrl }))
      })).filter(s => s.products.length > 0)
    };
  }).filter(c => c.subcategories.length > 0);
}

async function loadPublicCatalogue() {
  const local = buildCatalogueFromStore();
  if (local && local.length > 0) return local;

  try {
    const res = await fetch('data/catalogue.json');
    if (res.ok) {
      const json = await res.json();
      return buildCatalogueFromJson(json);
    }
  } catch (e) { /* continue */ }

  if (typeof CATALOGUE_DATA !== 'undefined') return CATALOGUE_DATA;
  return [];
}

function buildCatalogueFromJson(json) {
  const categories = json.categories || [];
  const products = (json.products || []).filter(p => p.active !== false);

  return categories.map(cat => {
    const catProducts = products.filter(p => p.categoryId === cat.id);
    const subNames = [...new Set(catProducts.map(p => p.subcategory).filter(Boolean));
    return {
      id: cat.id,
      title: cat.title,
      description: cat.description,
      subcategories: subNames.map(name => ({
        name,
        products: catProducts
          .filter(p => p.subcategory === name)
          .map(p => ({ name: p.name, description: p.description, image: p.imageUrl }))
      })).filter(s => s.products.length > 0)
    };
  }).filter(c => c.subcategories.length > 0);
}

/* ---- Export for deployment ---- */
function exportCatalogueJson() {
  const store = getStore();
  if (!store) return null;
  return JSON.stringify({
    categories: store.categories,
    products: store.products
  }, null, 2);
}

function downloadCatalogueJson() {
  const json = exportCatalogueJson();
  if (!json) { alert('No data to export.'); return; }
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'catalogue.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importCatalogueJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const store = getStore() || { settings: {} };
        store.categories = json.categories || store.categories;
        store.products = json.products || store.products;
        saveStore(store);
        resolve();
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/* ---- Image to base64 ---- */
function fileToBase64(file, maxSizeMB = 0.5) {
  return new Promise((resolve, reject) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      reject(new Error(`Image too large. Max ${maxSizeMB}MB. Use an image URL instead.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
