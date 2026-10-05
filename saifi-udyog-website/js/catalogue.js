/* SAIFI UDYOG — Catalogue renderer (Firebase only) */

let catalogueData = [];
let selectedCategoryId = '';
let selectedSubName = '';

async function loadCatalogueData() {
  catalogueData = [];
  try {
    if (typeof getCatalogueData === 'function') {
      const data = await getCatalogueData();
      catalogueData = Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn('Catalogue load failed.', e);
    catalogueData = [];
  }
}

function escapeHtml(str) {
  if (window.SAIFI_SAFE) return SAIFI_SAFE.escapeHtml(str);
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function productImageHtml(src, alt) {
  if (window.SAIFI_SAFE) return SAIFI_SAFE.imgTag(src, alt);
  const safe = escapeHtml(src || '');
  return `<img src="${safe}" alt="${escapeHtml(alt || '')}" loading="eager" decoding="async">`;
}

function emptyCatalogueHtml(isSearch) {
  const loadError = window.__SAIFI_CATALOGUE_ERROR;
  if (loadError && !isSearch) {
    return `<section class="catalogue-section"><div class="container">
      <div class="no-results fade-in visible">
        <h3>Catalogue could not load</h3>
        <p>${escapeHtml(loadError)}</p>
        <p style="margin-top:1rem;">Open Firebase Console → Firestore → <strong>Rules</strong> and publish:</p>
        <pre class="rules-snippet">match /products/{doc} { allow read: if true; allow write: if request.auth != null; }
match /categories/{doc} { allow read: if true; allow write: if request.auth != null; }</pre>
        <p style="margin-top:1rem;"><a href="products.html">Retry</a> · <a href="contact.html">Contact us</a></p>
      </div></div></section>`;
  }
  if (isSearch) {
    return `<section class="catalogue-section"><div class="container">
      <div class="no-results fade-in visible">
        <h3>No products found</h3>
        <p>Try a different category or <a href="contact.html">contact us</a> for availability.</p>
      </div></div></section>`;
  }
  return `<section class="catalogue-section"><div class="container">
    <div class="no-results fade-in visible">
      <h3>Catalogue coming soon</h3>
      <p>Products will appear here after they are added in the admin panel and set to <strong>Active</strong>.</p>
      <p style="margin-top:1rem;"><a href="contact.html">Contact us</a> for current availability.</p>
    </div></div></section>`;
}

function allBrowseCategories() {
  const live = Array.isArray(catalogueData) ? catalogueData : [];
  const byId = new Map(live.filter(c => c && c.id).map(c => [c.id, c]));
  const defaults = (typeof DEFAULT_CATEGORIES !== 'undefined' && Array.isArray(DEFAULT_CATEGORIES))
    ? DEFAULT_CATEGORIES
    : [];

  return defaults
    .filter(def => def && def.id)
    .map(def => mergeCategory(def, byId.get(def.id)));
}

function mergeCategory(def, liveCat) {
  const id = (def && def.id) || (liveCat && liveCat.id) || '';
  const title = (def && def.title) || (liveCat && liveCat.title) || '';
  const description = (def && def.description) || (liveCat && liveCat.description) || '';
  const defSubs = normalizeSubs(def && def.subcategories);
  const liveSubs = normalizeSubs(liveCat && liveCat.subcategories);
  const liveByName = new Map(liveSubs.map(s => [s.name.toLowerCase(), s]));

  return {
    id,
    title,
    description,
    subcategories: defSubs.map(sub => {
      const liveSub = liveByName.get(sub.name.toLowerCase());
      return {
        name: sub.name,
        products: (liveSub && liveSub.products) || sub.products || []
      };
    })
  };
}

function normalizeSubs(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(s => {
    if (!s) return null;
    if (typeof s === 'string') return { name: s.trim(), products: [] };
    const name = String(s.name || '').trim();
    if (!name) return null;
    return { name, products: Array.isArray(s.products) ? s.products : [] };
  }).filter(Boolean);
}

function firstSubImage(sub, categoryId) {
  const product = (sub.products || []).find(p => p && p.image);
  if (product && product.image) return product.image;
  return (typeof sampleImageFor === 'function')
    ? sampleImageFor(categoryId, sub && sub.name)
    : '/images/samples/table.svg';
}

function renderCatalogue() {
  const container = document.getElementById('catalogue-container');
  if (!container) return;

  try {
    const categories = allBrowseCategories();
    if (window.__SAIFI_CATALOGUE_ERROR && !categories.length) {
      container.innerHTML = emptyCatalogueHtml(false);
      return;
    }

    if (!categories.length) {
      container.innerHTML = emptyCatalogueHtml(false);
      updateCatalogueNav([]);
      return;
    }

    if (!selectedCategoryId || !categories.some(c => c.id === selectedCategoryId)) {
      selectedCategoryId = categories[0].id;
    }

    updateCatalogueNav(categories);
    bindCategoryChips();

    const active = categories.find(c => c.id === selectedCategoryId) || categories[0];

    if (selectedSubName) {
      const sub = (active.subcategories || []).find(
        s => s.name.toLowerCase() === selectedSubName.toLowerCase()
      );
      container.innerHTML = renderProductList(active, sub);
      bindEnquireLinks(container);
      bindBrowseControls(container);
      if (typeof initProductLightbox === 'function') initProductLightbox();
      return;
    }

    container.innerHTML = renderSubcategoryMosaic(active);
    bindBrowseControls(container);
  } catch (err) {
    console.error('renderCatalogue failed:', err);
    container.innerHTML = `<section class="catalogue-section"><div class="container">
      <div class="no-results fade-in visible">
        <h3>Unable to display products</h3>
        <p>Please refresh the page. If the problem continues, <a href="contact.html">contact us</a>.</p>
      </div></div></section>`;
  }
}

function renderSubcategoryMosaic(category) {
  const subs = category.subcategories || [];
  if (!subs.length) {
    return `<section class="catalogue-section browse-section">${emptyCatalogueHtml(false)}</section>`;
  }

  const tiles = subs.map(sub => {
    const img = firstSubImage(sub, category.id);
    const imgHtml = img
      ? productImageHtml(img, sub.name)
      : '<div class="subcat-tile-fallback" aria-hidden="true"></div>';
    return `<button type="button" class="subcat-tile" data-cat="${escapeHtml(category.id)}" data-subcat="${escapeHtml(sub.name)}">
      <span class="subcat-tile-photo">${imgHtml}</span>
      <span class="subcat-tile-label">${escapeHtml(sub.name)}</span>
    </button>`;
  }).join('');

  return `<section class="catalogue-section browse-section" id="${escapeHtml(category.id)}">
    <div class="subcat-grid">${tiles}</div>
  </section>`;
}

function renderProductList(category, sub) {
  const products = (sub && Array.isArray(sub.products)) ? sub.products.filter(Boolean) : [];
  const title = (sub && sub.name) || 'Products';
  let cards = '';

  if (!products.length) {
    cards = `<div class="no-results fade-in visible">
      <h3>No products in ${escapeHtml(title)} yet</h3>
      <p><a href="contact.html">Contact us</a> for current availability.</p>
    </div>`;
  } else {
    cards = `<div class="product-grid">${products.map(product => {
      const name = product.name || 'Product';
      const image = product.image || '';
      const enquireUrl = `contact.html?product=${encodeURIComponent(name)}`;
      const safeImg = window.SAIFI_SAFE
        ? SAIFI_SAFE.safeImageUrl(image)
        : (image || '');
      const safeImgAttr = window.SAIFI_SAFE
        ? SAIFI_SAFE.escapeAttrSrc(safeImg)
        : escapeHtml(safeImg);
      return `
        <div class="product-card fade-in visible">
          <div class="product-image lightbox-trigger" data-src="${safeImgAttr}" data-alt="${escapeHtml(name)}">
            ${productImageHtml(image, name)}
            <span class="product-zoom-hint">View</span>
          </div>
          <div class="product-info">
            <h3>${escapeHtml(name)}</h3>
            <p>${escapeHtml(product.description || '')}</p>
            <a href="${enquireUrl}" class="btn btn-wood btn-sm enquire-link" data-product="${escapeHtml(name)}">Enquire Now</a>
          </div>
        </div>`;
    }).join('')}</div>`;
  }

  return `<section class="catalogue-section browse-section">
    <div class="browse-toolbar">
      <button type="button" class="subcat-back" data-back>← ${escapeHtml(category.title || 'Categories')}</button>
      <h2>${escapeHtml(title)}</h2>
    </div>
    ${cards}
  </section>`;
}

function bindBrowseControls(root) {
  const scope = root || document;
  scope.querySelectorAll('.subcat-tile').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategoryId = btn.getAttribute('data-cat') || selectedCategoryId;
      selectedSubName = btn.getAttribute('data-subcat') || '';
      renderCatalogue();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  scope.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSubName = '';
      renderCatalogue();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function bindEnquireLinks(root) {
  const scope = root || document;
  scope.querySelectorAll('a.enquire-link[data-product]').forEach((link) => {
    link.addEventListener('click', () => {
      const name = link.getAttribute('data-product') || '';
      if (typeof rememberEnquiryProduct === 'function') {
        rememberEnquiryProduct(name);
      } else {
        try { sessionStorage.setItem('saifi_enquiry_product', name); } catch (e) { /* ignore */ }
      }
    });
  });
}

function updateCatalogueNav(categories) {
  const nav = document.querySelector('.category-bar .category-nav-list')
    || document.querySelector('.category-nav-list');
  if (!nav) return;
  try {
    const list = (categories || []).filter(c => c && c.id && c.id !== '_other');
    if (!list.length) return;
    nav.innerHTML = list.map(c =>
      `<a href="#${escapeHtml(c.id || '')}" class="category-item${c.id === selectedCategoryId ? ' active' : ''}">${escapeHtml(c.title || '')}</a>`
    ).join('');
  } catch (e) {
    console.warn(e);
  }
}

function bindCategoryChips() {
  document.querySelectorAll('.category-bar .category-item').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href') || '';
      const id = href.includes('#') ? href.slice(href.indexOf('#') + 1) : '';
      if (!id) return;
      selectedCategoryId = id;
      selectedSubName = '';
      try { history.replaceState(null, '', '#' + id); } catch (err) { /* ignore */ }
      renderCatalogue();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

async function initCataloguePage() {
  if (!document.getElementById('catalogue-container')) return;
  const loader = document.getElementById('catalogue-loader');
  try {
    if (loader) loader.style.display = 'flex';
    if (typeof initFirebase === 'function') initFirebase();
    await loadCatalogueData();

    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      selectedCategoryId = hash.slice(1);
    }

    renderCatalogue();
  } catch (err) {
    console.error(err);
    const container = document.getElementById('catalogue-container');
    if (container) {
      container.innerHTML = `<section class="catalogue-section"><div class="container">
        <div class="no-results fade-in visible">
          <h3>Catalogue temporarily unavailable</h3>
          <p>Please refresh. <a href="contact.html">Contact us</a> for product details.</p>
        </div></div></section>`;
    }
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', initCataloguePage);
