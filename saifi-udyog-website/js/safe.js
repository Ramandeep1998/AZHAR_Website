/**
 * SAIFI FURNITURE UDYOG — Safe helpers (prevent crashes)
 */
(function (global) {
  const PLACEHOLDER_IMAGE =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
        '<rect fill="#e8dfd3" width="800" height="600"/>' +
        '<text x="400" y="300" text-anchor="middle" fill="#8b6f47" font-family="Arial,sans-serif" font-size="28">SAIFI FURNITURE UDYOG</text>' +
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

  /**
   * Escape for HTML attribute values. Do NOT entity-encode & inside data: URLs —
   * that corrupts base64/SVG payloads. Only quote-escape.
   */
  function escapeAttr(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  function escapeAttrSrc(url) {
    const value = safeString(url);
    if (value.toLowerCase().startsWith("data:")) {
      // Quotes only — ampersands in data URLs must stay literal
      return value.replace(/"/g, "&quot;");
    }
    return escapeAttr(value);
  }

  /** Only allow http(s), root-relative, or data:image — blocks javascript: etc */
  function safeImageUrl(url) {
    const value = safeString(url).trim();
    if (!value) return PLACEHOLDER_IMAGE;
    const lower = value.toLowerCase();
    if (
      lower.startsWith("https://") ||
      lower.startsWith("http://") ||
      lower.startsWith("data:image/") ||
      lower.startsWith("/") // site-relative e.g. /images/hero-home.jpg
    ) {
      if (lower.startsWith("data:image/") && value.length > 950000) {
        return PLACEHOLDER_IMAGE;
      }
      return value;
    }
    return PLACEHOLDER_IMAGE;
  }

  function imgTag(src, alt, extraClass) {
    const resolved = safeImageUrl(src);
    const safeSrc = escapeAttrSrc(resolved);
    const safeAlt = escapeHtml(safeString(alt, "Product"));
    const cls = extraClass ? ' class="' + escapeHtml(extraClass) + '"' : "";
    // onerror uses SAIFI_SAFE at runtime — never embed the giant data-URL in the attribute
    return (
      "<img" +
      cls +
      ' src="' +
      safeSrc +
      '" alt="' +
      safeAlt +
      '" loading="eager" decoding="async" onerror="this.onerror=null;this.src=(window.SAIFI_SAFE&amp;&amp;SAIFI_SAFE.PLACEHOLDER_IMAGE)||\'\';">'
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
    escapeAttr,
    escapeAttrSrc,
    safeImageUrl,
    imgTag,
    safeAsync,
    bindGlobalErrorHandlers,
  };
})(window);
