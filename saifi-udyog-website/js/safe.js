/**
 * SAIFI UDYOG — Safe helpers (prevent crashes)
 */
(function (global) {
  const PLACEHOLDER_IMAGE =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
        '<rect fill="#e8dfd3" width="800" height="600"/>' +
        '<text x="400" y="300" text-anchor="middle" fill="#8b6f47" font-family="Arial,sans-serif" font-size="28">SAIFI UDYOG</text>' +
        "</svg>"
    );

  function safeString(value, fallback) {
    if (value == null) return fallback || "";
    return String(value);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Only allow http(s) or data:image — blocks javascript: etc */
  function safeImageUrl(url) {
    const value = safeString(url).trim();
    if (!value) return PLACEHOLDER_IMAGE;
    const lower = value.toLowerCase();
    if (
      lower.startsWith("https://") ||
      lower.startsWith("http://") ||
      lower.startsWith("data:image/")
    ) {
      // Cap huge data URLs from blowing up the DOM
      if (lower.startsWith("data:image/") && value.length > 950000) {
        return PLACEHOLDER_IMAGE;
      }
      return value;
    }
    return PLACEHOLDER_IMAGE;
  }

  function imgTag(src, alt, extraClass) {
    const safeSrc = escapeHtml(safeImageUrl(src));
    const safeAlt = escapeHtml(safeString(alt, "Product"));
    const cls = extraClass ? ' class="' + escapeHtml(extraClass) + '"' : "";
    return (
      "<img" +
      cls +
      ' src="' +
      safeSrc +
      '" alt="' +
      safeAlt +
      '" loading="lazy" onerror="this.onerror=null;this.src=\'' +
      PLACEHOLDER_IMAGE +
      "';\">"
    );
  }

  async function safeAsync(fn, fallback) {
    try {
      return await fn();
    } catch (err) {
      console.error(err);
      return fallback;
    }
  }

  function bindGlobalErrorHandlers() {
    window.addEventListener("error", function (e) {
      console.error("Unhandled error:", e.error || e.message);
    });
    window.addEventListener("unhandledrejection", function (e) {
      console.error("Unhandled promise rejection:", e.reason);
    });
  }

  global.SAIFI_SAFE = {
    PLACEHOLDER_IMAGE,
    safeString,
    escapeHtml,
    safeImageUrl,
    imgTag,
    safeAsync,
    bindGlobalErrorHandlers,
  };
})(window);
