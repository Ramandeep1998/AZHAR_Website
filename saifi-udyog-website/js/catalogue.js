/* SAIFI UDYOG — Dynamic Catalogue Renderer */

let catalogueData = [];

async function loadCatalogueData() {
  if (typeof getCatalogueData === 'function') {
    try {
      catalogueData = await getCatalogueData();
      if (catalogueData.length > 0) return;
    } catch (e) {
      console.warn('Firebase catalogue load failed, using fallback.', e);
    }
  }
  catalogueData = typeof CATALOGUE_DATA !== 'undefined' ? CATALOGUE_DATA : [];
}

function renderCatalogue(filter = '') {
  const container = document.getElementById('catalogue-container');
  if (!container) return;

  const query = filter.toLowerCase().trim();
  let html = '';
  let hasResults = false;

  catalogueData.forEach(category => {
    let categoryHtml = '';
    let categoryHasProducts = false;

    category.subcategories.forEach(sub => {
      const filtered = sub.products.filter(p => {
        if (!query) return true;
        const text = `${p.name} ${p.description} ${sub.name} ${category.title}`.toLowerCase();
        return text.includes(query);
      });

      if (!filtered.length) return;
      categoryHasProducts = true;

      categoryHtml += `<p class="subcategory-label">${escapeHtml(sub.name)}</p><div class="product-grid">`;
      filtered.forEach(product => {
        const enquireUrl = `contact.html?product=${encodeURIComponent(product.name)}`;
        categoryHtml += `
          <div class="product-card fade-in">
            <div class="product-image lightbox-trigger" data-src="${escapeHtml(product.image)}" data-alt="${escapeHtml(product.name)}">
              <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
              <span class="product-zoom-hint">View</span>
            </div>
            <div class="product-info">
              <h3>${escapeHtml(product.name)}</h3>
              <p>${escapeHtml(product.description)}</p>
              <a href="${enquireUrl}" class="btn btn-wood btn-sm">Enquire Now</a>
            </div>
          </div>`;
      });
      categoryHtml += '</div>';
    });

    if (!categoryHasProducts) return;
    hasResults = true;

    html += `
      <section id="${category.id}" class="catalogue-section">
        <div class="container">
          <div class="catalogue-section-header fade-in">
            <p class="section-label">Category</p>
            <h2>${escapeHtml(category.title)}</h2>
            <p>${escapeHtml(category.description)}</p>
          </div>
          ${categoryHtml}
        </div>
      </section>`;
  });

  if (!hasResults) {
    html = `<section class="catalogue-section"><div class="container">
      <div class="no-results fade-in visible">
        <h3>No products found</h3>
        <p>Try a different search or <a href="contact.html">contact us</a>.</p>
      </div></div></section>`;
  }

  container.innerHTML = html;
  updateCatalogueNav(catalogueData);
  if (typeof initScrollAnimations === 'function') initScrollAnimations();
  if (typeof initProductLightbox === 'function') initProductLightbox();
  if (typeof initCatalogueNav === 'function') initCatalogueNav();
}

function updateCatalogueNav(categories) {
  const nav = document.querySelector('.catalogue-nav .container');
  if (!nav) return;
  const visible = categories.filter(c => c.subcategories.some(s => s.products.length > 0));
  nav.innerHTML = visible.map((c, i) =>
    `<a href="#${c.id}" class="${i === 0 ? 'active' : ''}">${escapeHtml(c.title)}</a>`
  ).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function initCatalogueSearch() {
  const input = document.getElementById('product-search');
  if (!input) return;
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => renderCatalogue(input.value), 250);
  });
}

async function initCataloguePage() {
  if (!document.getElementById('catalogue-container')) return;
  const loader = document.getElementById('catalogue-loader');
  if (loader) loader.style.display = 'flex';
  await loadCatalogueData();
  renderCatalogue();
  initCatalogueSearch();
  if (loader) loader.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', initCataloguePage);
