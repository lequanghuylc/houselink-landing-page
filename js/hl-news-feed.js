/**
 * Lightweight browser-side news feed loader (WordPress REST).
 * Progressive enhancement: if fetch fails, keep existing static markup.
 */
(function () {
  "use strict";

  var WP_BASE = "https://vietnamconstruction.vn";
  var WP_POSTS = WP_BASE + "/wp-json/wp/v2/posts";

  function langKey() {
    var raw = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (raw.indexOf("vi") === 0) return "vi";
    if (raw.indexOf("ja") === 0) return "ja";
    if (raw.indexOf("ko") === 0) return "ko";
    if (raw.indexOf("zh") === 0) return "zh";
    return "en";
  }

  function tagForLocale() {
    var forced = document.body && document.body.getAttribute("data-hl-news-tag");
    if (forced) return String(forced);
    // Mirrors `Houselink/News.API.js#getListNews(isEng)` where EN uses tag=21, otherwise tag=22.
    return langKey() === "en" ? "21" : "22";
  }

  function stripHtml(html) {
    if (!html) return "";
    var tmp = document.createElement("div");
    tmp.innerHTML = String(html);
    return (tmp.textContent || tmp.innerText || "").trim();
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(+d)) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pickImage(post) {
    try {
      var emb = post && post._embedded;
      var fm = emb && emb["wp:featuredmedia"] && emb["wp:featuredmedia"][0];
      if (fm && fm.source_url) return fm.source_url;
      if (fm && fm.media_details && fm.media_details.sizes) {
        var sizes = fm.media_details.sizes;
        if (sizes.medium_large && sizes.medium_large.source_url) return sizes.medium_large.source_url;
        if (sizes.large && sizes.large.source_url) return sizes.large.source_url;
        if (sizes.medium && sizes.medium.source_url) return sizes.medium.source_url;
      }
    } catch (ignore) {}
    return "";
  }

  function renderCard(post, isFeatured) {
    var title = stripHtml(post && post.title && post.title.rendered);
    var excerpt = stripHtml(post && post.excerpt && post.excerpt.rendered);
    var date = fmtDate(post && (post.modified || post.date));
    var href = (post && post.link) || "#";
    var img = pickImage(post);

    var cls = "nc" + (isFeatured ? " feat" : "");
    var imgHtml = img
      ? '<img src="' + esc(img) + '" alt="' + esc(title) + '" loading="lazy" decoding="async">'
      : '<div style="background:var(--gray-50);min-height:' + (isFeatured ? "300px" : "180px") + ';"></div>';

    var metaHtml = date ? '<div class="nc-meta"><span>' + esc(date) + "</span></div>" : "";

    return (
      '<div class="' +
      cls +
      '">' +
      imgHtml +
      '<div class="nc-b">' +
      (isFeatured ? '<div class="nc-cat">⭐ Featured</div>' : "") +
      '<div class="nc-ttl">' +
      esc(title) +
      "</div>" +
      (excerpt ? '<div class="nc-tx">' + esc(excerpt) + "</div>" : "") +
      metaHtml +
      '<a href="' +
      esc(href) +
      '" class="nc-lnk">Continue reading →</a>' +
      "</div></div>"
    );
  }

  async function loadInto(container) {
    var tag = tagForLocale();
    var url =
      WP_POSTS +
      "?_embed=1&per_page=7&categories=20&tags=" +
      encodeURIComponent(tag) +
      "&orderby=modified&order=desc";

    var res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error("wp_fetch_failed");
    var posts = await res.json();
    if (!Array.isArray(posts) || !posts.length) throw new Error("wp_empty");

    var html = "";
    posts.forEach(function (p, idx) {
      html += renderCard(p, idx === 0);
    });
    container.innerHTML = html;
  }

  function boot() {
    var container = document.getElementById("hl-news-feed");
    if (!container) return;
    if (container.getAttribute("data-hl-news-bound") === "1") return;
    container.setAttribute("data-hl-news-bound", "1");

    loadInto(container).catch(function () {
      // Keep static markup if API fetch fails.
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

