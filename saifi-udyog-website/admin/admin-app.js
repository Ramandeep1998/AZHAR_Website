/* SAIFI UDYOG — Admin Dashboard (production-hardened) */

let allProducts = [];
let allCategories = [];
let dashboardLoaded = false;
/** Bumped when the product modal closes so in-flight image work is ignored. */
let imageUploadSession = 0;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof FIREBASE_ENABLED === 'undefined' || !FIREBASE_ENABLED) {
    window.location.href = 'index.html';
    return;
  }

  if (window.SAIFI_SAFE) SAIFI_SAFE.bindGlobalErrorHandlers();

  initFirebase();

  // Wait for auth before loading data (avoids race / false logouts)
  onAuthChange(async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    if (dashboardLoaded) {
      updateFirebaseStatus();
      return;
    }
    dashboardLoaded = true;

    try {
      initNavigation();
      initModals();
      initProductForm();
      initCategoryForm();
      initSettingsForm();
      initLogout();
      initSeed();
      initEnquiries();

      const addBtn = document.getElementById('add-product-btn');
      const quickBtn = document.getElementById('quick-add-product');
      const addCatBtn = document.getElementById('add-category-btn');
      if (addBtn) addBtn.addEventListener('click', () => openProductModal());
      if (quickBtn) {
        quickBtn.addEventListener('click', () => {
          switchPanel('products');
          openProductModal();
        });
      }
      if (addCatBtn) addCatBtn.addEventListener('click', () => openCategoryModal());

      await loadDashboard();
    } catch (err) {
      console.error(err);
      alert('Admin failed to start: ' + (err.message || err));
    }
  });
});

function initNavigation() {
  document.querySelectorAll('.admin-nav a[data-panel]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchPanel(link.dataset.panel);
    });
  });
  document.querySelectorAll('[data-panel-link]').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panelLink));
  });
}

function switchPanel(id) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav a[data-panel]').forEach(a => a.classList.remove('active'));
  document.getElementById(`panel-${id}`)?.classList.add('active');
  document.querySelector(`[data-panel="${id}"]`)?.classList.add('active');
  if (id === 'enquiries') loadEnquiries();
}

function initModals() {
  document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', closeAllModals));
  document.querySelectorAll('.admin-modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) closeAllModals(); });
  });
}

function openModal(id) { document.getElementById(id).classList.add('active'); }

function resetProductModalState() {
  imageUploadSession += 1;

  const form = document.getElementById('product-form');
  if (form) form.reset();

  const fileInput = document.getElementById('product-image-file');
  if (fileInput) fileInput.value = '';

  const urlInput = document.getElementById('product-image-url-input');
  if (urlInput) urlInput.value = '';

  const hidden = document.getElementById('product-image-url');
  if (hidden) hidden.value = '';

  const preview = document.getElementById('image-preview');
  if (preview) {
    preview.removeAttribute('src');
    preview.style.display = 'none';
  }

  const hint = document.getElementById('upload-hint');
  if (hint) hint.style.display = 'block';

  const area = document.getElementById('image-upload-area');
  if (area) area.classList.remove('has-image');

  const progress = document.getElementById('upload-progress');
  if (progress) {
    progress.style.display = 'none';
    progress.style.color = '';
    progress.textContent = '';
  }

  const saveBtn = document.getElementById('save-product-btn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Product';
  }
}

function closeAllModals() {
  resetProductModalState();
  document.querySelectorAll('.admin-modal-overlay').forEach(m => m.classList.remove('active'));
}

const FALLBACK_CATEGORIES = [
  { id: 'sofa-seating', title: 'Sofa & Seating', order: 1 },
  { id: 'office-furniture', title: 'Office Furniture', order: 2 },
  { id: 'home-furniture', title: 'Home Furniture', order: 3 },
  { id: 'other-furniture', title: 'Other Furniture', order: 4 }
];

async function loadDashboard() {
  try {
    allCategories = await ensureDefaultCategories();
    if (!allCategories || !allCategories.length) {
      allCategories = FALLBACK_CATEGORIES.slice();
    }
    allProducts = await getProducts().catch(err => {
      console.warn('getProducts failed:', err);
      return [];
    });
    renderStats();
    renderProductsTable();
    renderCategoriesGrid();
    populateCategorySelect();
    await loadSettingsForm();
    updateFirebaseStatus();
  } catch (err) {
    console.error(err);
    // Never leave categories empty — dropdown must work
    allCategories = FALLBACK_CATEGORIES.slice();
    populateCategorySelect();
    updateFirebaseStatus();
    alert('Error loading data: ' + err.message + '\n\nCategories are still available. You can try adding a product.\n\nAlso check Firebase Firestore rules.');
  }
}

function updateFirebaseStatus() {
  const el = document.getElementById('firebase-status');
  if (!el) return;
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (user) {
    el.textContent = 'Connected as ' + user.email;
    el.className = 'firebase-status ok';
  } else {
    el.textContent = 'Not connected to Firebase';
    el.className = 'firebase-status fail';
  }
}

function renderStats() {
  document.getElementById('stat-products').textContent = allProducts.length;
  document.getElementById('stat-categories').textContent = allCategories.length;
  document.getElementById('stat-active').textContent = allProducts.filter(p => p.active !== false).length;
}

function renderProductsTable() {
  const loader = document.getElementById('products-loader');
  const table = document.getElementById('products-table');
  const tbody = document.getElementById('products-tbody');
  const empty = document.getElementById('products-empty');
  loader.style.display = 'none';

  if (!allProducts.length) {
    table.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  table.style.display = 'table';
  tbody.innerHTML = allProducts.map(p => {
    const cat = allCategories.find(c => c.id === p.categoryId);
    const thumb = window.SAIFI_SAFE
      ? SAIFI_SAFE.escapeHtml(SAIFI_SAFE.safeImageUrl(p.imageUrl))
      : esc(p.imageUrl || '');
    const placeholder = window.SAIFI_SAFE ? SAIFI_SAFE.PLACEHOLDER_IMAGE : '';
    return `<tr>
      <td><img class="product-thumb" src="${thumb}" alt="" onerror="this.onerror=null;this.src='${placeholder}'"></td>
      <td><strong>${esc(p.name)}</strong></td>
      <td>${esc(cat?.title || p.categoryId)}</td>
      <td>${esc(p.subcategory || '—')}</td>
      <td><span class="badge ${p.active === false ? 'inactive' : ''}">${p.active === false ? 'Hidden' : 'Active'}</span></td>
      <td class="table-actions">
        <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="editProduct('${esc(p.id)}')">Edit</button>
        <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="removeProduct('${esc(p.id)}')">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

function populateCategorySelect() {
  const select = document.getElementById('product-category');
  if (!select) return;

  const list = (allCategories && allCategories.length)
    ? allCategories
    : FALLBACK_CATEGORIES;

  select.innerHTML = list.map(c =>
    `<option value="${c.id}">${esc(c.title)}</option>`
  ).join('');
}

function openProductModal(product = null) {
  // Cancel any previous upload session and clear leftover UI
  resetProductModalState();

  // Always refresh category options before opening
  if (!allCategories || !allCategories.length) {
    allCategories = FALLBACK_CATEGORIES.slice();
  }
  populateCategorySelect();

  document.getElementById('product-modal-title').textContent = product ? 'Edit Product' : 'Add Product';
  document.getElementById('product-id').value = product?.id || '';
  document.getElementById('product-name').value = product?.name || '';
  document.getElementById('product-description').value = product?.description || '';

  // Re-populate after reset (reset can clear selection)
  populateCategorySelect();
  const preferred = product?.categoryId || allCategories[0]?.id || FALLBACK_CATEGORIES[0].id;
  document.getElementById('product-category').value = preferred;

  document.getElementById('product-subcategory').value = product?.subcategory || '';
  document.getElementById('product-order').value = product?.order || 0;
  document.getElementById('product-active').value = product?.active === false ? 'false' : 'true';
  document.getElementById('product-image-url').value = product?.imageUrl || '';
  const urlInput = document.getElementById('product-image-url-input');
  if (urlInput) urlInput.value = product?.imageUrl || '';

  const preview = document.getElementById('image-preview');
  const hint = document.getElementById('upload-hint');
  const area = document.getElementById('image-upload-area');
  if (product?.imageUrl) {
    preview.src = product.imageUrl;
    preview.style.display = 'block';
    hint.style.display = 'none';
    area.classList.add('has-image');
  } else {
    preview.style.display = 'none';
    hint.style.display = 'block';
    area.classList.remove('has-image');
  }
  openModal('product-modal');
}

window.editProduct = id => {
  const p = allProducts.find(x => x.id === id);
  if (p) openProductModal(p);
};

window.removeProduct = async id => {
  if (!confirm('Delete this product?')) return;
  try {
    await deleteProduct(id);
    await loadDashboard();
  } catch (err) { alert(err.message); }
};

function setImagePreview(url) {
  const preview = document.getElementById('image-preview');
  const hint = document.getElementById('upload-hint');
  const area = document.getElementById('image-upload-area');
  const hidden = document.getElementById('product-image-url');
  if (hidden) hidden.value = url || '';
  if (!preview || !area) return;
  if (url) {
    preview.src = url;
    preview.style.display = 'block';
    if (hint) hint.style.display = 'none';
    area.classList.add('has-image');
  } else {
    preview.removeAttribute('src');
    preview.style.display = 'none';
    if (hint) hint.style.display = 'block';
    area.classList.remove('has-image');
  }
}

async function handleSelectedImageFile(file) {
  const progress = document.getElementById('upload-progress');
  if (!file) return;

  const session = ++imageUploadSession;

  if (progress) {
    progress.style.display = 'block';
    progress.style.color = '';
    progress.textContent = 'Processing image...';
  }
  try {
    if (typeof uploadProductImage !== 'function') {
      throw new Error('Upload function missing. Hard refresh the page (Ctrl+Shift+R).');
    }
    const url = await uploadProductImage(file);
    // Modal was closed (or a newer pick started) — discard this result
    if (session !== imageUploadSession) return;
    if (!url) throw new Error('No image data returned.');
    setImagePreview(url);
    const urlInput = document.getElementById('product-image-url-input');
    if (urlInput) {
      // Keep text field empty for embedded images; hidden field holds the real value
      urlInput.value = url.startsWith('data:') ? '' : url;
    }
    if (progress) {
      progress.style.color = '#27ae60';
      progress.textContent = '✓ Photo ready — fill details and click Save Product';
    }
  } catch (err) {
    if (session !== imageUploadSession) return;
    console.error(err);
    if (progress) {
      progress.style.color = 'var(--admin-danger)';
      progress.textContent = 'Failed: ' + (err.message || err);
    }
    alert('Photo upload failed:\n\n' + (err.message || err) + '\n\nTip: use a JPG/PNG under 5MB, or paste an image URL instead.');
  }
}

function initProductForm() {
  const fileInput = document.getElementById('product-image-file');
  const urlInput = document.getElementById('product-image-url-input');
  const pickBtn = document.getElementById('pick-image-btn');

  if (pickBtn && fileInput) {
    pickBtn.addEventListener('click', () => fileInput.click());
  }

  if (urlInput) {
    urlInput.addEventListener('input', () => {
      const url = urlInput.value.trim();
      if (url) setImagePreview(url);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      await handleSelectedImageFile(file);
    });
  }

  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-product-btn');
    const imageUrl = (document.getElementById('product-image-url')?.value || '').trim()
      || (document.getElementById('product-image-url-input')?.value || '').trim();

    if (!imageUrl) {
      alert('Please choose a photo (Choose Photo) OR paste an Image URL.');
      return;
    }

    const name = document.getElementById('product-name').value.trim();
    const categoryId = document.getElementById('product-category').value;
    if (!name || !categoryId) {
      alert('Please enter product name and select a category.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      const savedId = await saveProduct({
        id: document.getElementById('product-id').value || undefined,
        name,
        description: document.getElementById('product-description').value.trim(),
        categoryId,
        subcategory: document.getElementById('product-subcategory').value.trim(),
        order: parseInt(document.getElementById('product-order').value) || 0,
        active: document.getElementById('product-active').value === 'true',
        imageUrl
      });

      await loadDashboard();
      const found = allProducts.find(p => p.id === savedId || p.name === name);
      if (!found) {
        throw new Error('Saved but not visible yet. Check Firestore rules / login, then refresh.');
      }

      closeAllModals();
      alert('Product saved!\n\n"' + name + '" is now on the website.');
      switchPanel('products');
    } catch (err) {
      console.error(err);
      alert('Could not save product:\n\n' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Product';
    }
  });
}

function renderCategoriesGrid() {
  const grid = document.getElementById('categories-grid');
  if (!allCategories.length) {
    grid.innerHTML = '<div class="empty-state"><p>No categories yet. Add a category, or use Load Demo Data (optional) on Overview.</p></div>';
    return;
  }
  grid.innerHTML = allCategories.map(c => {
    const count = allProducts.filter(p => p.categoryId === c.id && p.active !== false && p.active !== 'false').length;
    return `<div class="category-admin-card">
      <h4>${esc(c.title)}</h4>
      <p>${esc(c.description || '')}</p>
      <span class="badge">${count} product${count !== 1 ? 's' : ''}</span>
      <div style="margin-top:0.75rem;display:flex;gap:0.5rem;">
        <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="editCategory('${c.id}')">Edit</button>
        <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="removeCategory('${c.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function openCategoryModal(cat = null) {
  document.getElementById('category-modal-title').textContent = cat ? 'Edit Category' : 'Add Category';
  document.getElementById('category-id').value = cat?.id || '';
  document.getElementById('category-title').value = cat?.title || '';
  document.getElementById('category-description').value = cat?.description || '';
  document.getElementById('category-order').value = cat?.order || 0;
  openModal('category-modal');
}

window.editCategory = id => {
  const c = allCategories.find(x => x.id === id);
  if (c) openCategoryModal(c);
};

window.removeCategory = async id => {
  if (!confirm('Delete this category?')) return;
  try {
    await deleteCategory(id);
    await loadDashboard();
  } catch (err) { alert(err.message); }
};

function initCategoryForm() {
  document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('category-title').value.trim();
    let id = document.getElementById('category-id').value;
    if (!id) id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      await saveCategory({
        id, title,
        description: document.getElementById('category-description').value.trim(),
        order: parseInt(document.getElementById('category-order').value) || 0
      });
      closeAllModals();
      await loadDashboard();
    } catch (err) { alert(err.message); }
  });
}

function initSettingsForm() {
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await saveSiteSettings({
        phone: document.getElementById('set-phone').value.trim(),
        whatsapp: document.getElementById('set-whatsapp').value.trim(),
        whatsappNumber: document.getElementById('set-whatsapp-num').value.trim(),
        email: document.getElementById('set-email').value.trim(),
        address: document.getElementById('set-address').value.trim(),
        mapsEmbedUrl: document.getElementById('set-maps').value.trim(),
        web3formsKey: document.getElementById('set-web3forms').value.trim()
      });
      alert('Settings saved! Visible on live site immediately.');
    } catch (err) { alert(err.message); }
    btn.disabled = false;
  });
}

async function loadSettingsForm() {
  const s = await getSiteSettings();
  document.getElementById('set-phone').value = s.phone || '';
  document.getElementById('set-whatsapp').value = s.whatsapp || '';
  document.getElementById('set-whatsapp-num').value = s.whatsappNumber || '';
  document.getElementById('set-email').value = s.email || '';
  document.getElementById('set-address').value = s.address || '';
  document.getElementById('set-maps').value = s.mapsEmbedUrl || '';
  document.getElementById('set-web3forms').value = s.web3formsKey || '';
}

function initEnquiries() {
  document.getElementById('refresh-enquiries').addEventListener('click', loadEnquiries);
}

async function loadEnquiries() {
  const loader = document.getElementById('enquiries-loader');
  const list = document.getElementById('enquiries-list');
  const empty = document.getElementById('enquiries-empty');
  loader.style.display = 'flex';
  list.innerHTML = '';

  try {
    const enquiries = await getEnquiries();
    loader.style.display = 'none';

    if (!enquiries.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    list.innerHTML = enquiries.map(e => {
      const date = e.createdAt?.toDate
        ? e.createdAt.toDate().toLocaleString('en-IN')
        : 'Recently';
      return `<div class="enquiry-card ${e.read ? '' : 'unread'}" id="enq-${e.id}">
        <div class="enquiry-header">
          <strong>${esc(e.name)}</strong>
          <span class="enquiry-date">${date}</span>
        </div>
        <p class="enquiry-meta">📱 ${esc(e.mobile)}${e.email ? ` &nbsp;·&nbsp; 📧 ${esc(e.email)}` : ''}</p>
        ${e.product ? `<p class="enquiry-product">Product: <strong>${esc(e.product)}</strong></p>` : ''}
        <p class="enquiry-message">${esc(e.message)}</p>
        <div class="enquiry-actions">
          <a href="https://wa.me/${e.mobile.replace(/\D/g, '')}?text=${encodeURIComponent('Hello ' + e.name + ', thank you for your enquiry at SAIFI UDYOG.')}" target="_blank" class="admin-btn admin-btn-outline admin-btn-sm">Reply on WhatsApp</a>
          ${e.email ? `<a href="mailto:${e.email}" class="admin-btn admin-btn-outline admin-btn-sm">Send Email</a>` : ''}
          <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="markRead('${e.id}')">Mark Read</button>
          <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="deleteEnq('${e.id}')">Delete</button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    loader.style.display = 'none';
    list.innerHTML = `<div class="empty-state"><p>Error loading enquiries: ${esc(err.message)}</p></div>`;
  }
}

window.markRead = async id => {
  await markEnquiryRead(id);
  document.getElementById(`enq-${id}`)?.classList.remove('unread');
};

window.deleteEnq = async id => {
  if (!confirm('Delete this enquiry?')) return;
  await deleteEnquiry(id);
  await loadEnquiries();
};

function initSeed() {
  document.getElementById('seed-btn').addEventListener('click', async () => {
    if (!confirm('Load optional DEMO products (stock photos)?\n\nOnly for testing. For a client demo, prefer adding real products with your own photos.')) return;
    const btn = document.getElementById('seed-btn');
    btn.disabled = true;
    btn.textContent = 'Loading…';
    try {
      await seedDatabase();
      alert('Demo data loaded. Replace with real products before showing the client.');
      await loadDashboard();
    } catch (err) { alert(err.message); }
    btn.disabled = false;
    btn.textContent = 'Load Demo Data (optional)';
  });
}

function initLogout() {
  document.getElementById('logout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    await adminLogout();
    window.location.href = 'index.html';
  });
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
