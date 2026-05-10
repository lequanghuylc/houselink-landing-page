/**
 * Vietnam Construction (WordPress) — same input/output for live API vs local JSON.
 *
 * @typedef {{
 *   page?: number,
 *   perPage?: number,
 *   offset?: number,
 *   categories?: number[],
 *   embed?: boolean
 * }} VietnamConstructionFeedInput
 *
 * @typedef {{
 *   posts: object[],
 *   meta: {
 *     source: 'api' | 'hardcode',
 *     page: number,
 *     perPage: number,
 *     offset: number,
 *     categories: number[],
 *     totalAvailable: number
 *   }
 * }} VietnamConstructionFeedResult
 */

(function (global) {
  var WP_BASE = 'https://vietnamconstruction.vn/wp-json/wp/v2/posts';

  /** @param {VietnamConstructionFeedInput} input */
  function normalizeInput(input) {
    input = input || {};
    var page = parseInt(String(input.page), 10);
    var perPage = parseInt(String(input.perPage), 10);
    if (!page || page < 1) page = 1;
    if (!perPage || perPage < 1) perPage = 10;
    if (perPage > 100) perPage = 100;
    var categories = Array.isArray(input.categories) && input.categories.length
      ? input.categories.slice()
      : [6];
    var embed = input.embed !== false;
    var offset = parseInt(String(input.offset), 10);
    if (isNaN(offset) || offset < 0) offset = 0;
    if (offset > 5000) offset = 0;
    return { page: page, perPage: perPage, offset: offset, categories: categories, embed: embed };
  }

  function scriptBaseDir() {
    var el = document.querySelector('script[src*="vietnam-construction-feed.js"]');
    if (!el || !el.src) return '';
    return el.src.replace(/[^/]+$/, '');
  }

  function mergePostsByDateDesc(arrays) {
    var seen = {};
    var out = [];
    for (var a = 0; a < arrays.length; a++) {
      var list = arrays[a];
      if (!Array.isArray(list)) continue;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p || typeof p.id === 'undefined') continue;
        if (seen[p.id]) continue;
        seen[p.id] = true;
        out.push(p);
      }
    }
    out.sort(function (a, b) {
      var da = new Date(a.date || a.modified || 0).getTime();
      var db = new Date(b.date || b.modified || 0).getTime();
      return db - da;
    });
    return out;
  }

  /** Match WP REST `categories` filter (OR). */
  function filterByCategories(posts, categoryIds) {
    if (!categoryIds || !categoryIds.length) return posts;
    return posts.filter(function (p) {
      var cats = p.categories;
      if (!Array.isArray(cats)) return false;
      for (var i = 0; i < categoryIds.length; i++) {
        if (cats.indexOf(categoryIds[i]) !== -1) return true;
      }
      return false;
    });
  }

  /**
   * Live WordPress REST (may be blocked by Cloudflare from some networks).
   * @param {VietnamConstructionFeedInput} input
   * @returns {Promise<VietnamConstructionFeedResult>}
   */
  function fetchFromVietnamconstruction(input) {
    var n = normalizeInput(input);
    var params = new URLSearchParams();
    params.set('categories', n.categories.join(','));
    params.set('per_page', String(n.perPage));
    params.set('offset', String(n.offset));
    params.set('orderby', 'date');
    params.set('order', 'desc');
    if (n.embed) params.set('_embed', '1');
    var url = WP_BASE + '?' + params.toString();
    return fetch(url, { credentials: 'omit' }).then(function (res) {
      if (!res.ok) throw new Error('WP ' + res.status);
      var totalHeader = res.headers.get('X-WP-Total');
      return res.json().then(function (posts) {
        if (!Array.isArray(posts)) throw new Error('Invalid WP payload');
        var total = totalHeader != null ? parseInt(totalHeader, 10) : posts.length;
        if (isNaN(total)) total = posts.length;
        return {
          posts: posts,
          meta: {
            source: 'api',
            page: n.page,
            perPage: n.perPage,
            offset: n.offset,
            categories: n.categories,
            totalAvailable: total
          }
        };
      });
    });
  }

  /**
   * Same shape as API: Event (EN) dump only — data-event-en.json, client-side pagination.
   * @param {VietnamConstructionFeedInput} input
   * @returns {Promise<VietnamConstructionFeedResult>}
   */
  function hardcodeFromVietnamconstruction(input) {
    var n = normalizeInput(input);
    var base = scriptBaseDir();
    var uEvent = base + 'data-event-en.json';
    return fetch(uEvent, { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('event json ' + r.status);
      return r.json();
    }).then(function (arr) {
      if (!Array.isArray(arr)) throw new Error('Invalid event JSON');
      var merged = mergePostsByDateDesc([arr]);
      var filtered = filterByCategories(merged, n.categories);
      var total = filtered.length;
      var slice = filtered.slice(n.offset, n.offset + n.perPage);
      return {
        posts: slice,
        meta: {
          source: 'hardcode',
          page: n.page,
          perPage: n.perPage,
          offset: n.offset,
          categories: n.categories,
          totalAvailable: total
        }
      };
    });
  }

  /**
   * Single post by ID (live API).
   * @param {{ id: number }} input
   * @returns {Promise<{ post: object | null, meta: { source: 'api', id: number } }>}
   */
  function fetchPostFromVietnamconstruction(input) {
    var id = parseInt(String(input && input.id), 10);
    if (!id) return Promise.resolve({ post: null, meta: { source: 'api', id: NaN } });
    var q = new URLSearchParams();
    q.set('_embed', '1');
    var url = 'https://vietnamconstruction.vn/wp-json/wp/v2/posts/' + id + '?' + q.toString();
    return fetch(url, { credentials: 'omit' }).then(function (res) {
      if (res.status === 404) return { post: null, meta: { source: 'api', id: id } };
      if (!res.ok) throw new Error('WP post ' + res.status);
      return res.json().then(function (post) {
        return { post: post && post.id ? post : null, meta: { source: 'api', id: id } };
      });
    });
  }

  /**
   * Single post by ID from data-event-en.json (EN Event feed only).
   * @param {{ id: number }} input
   * @returns {Promise<{ post: object | null, meta: { source: 'hardcode', id: number } }>}
   */
  function hardcodePostFromVietnamconstruction(input) {
    var id = parseInt(String(input && input.id), 10);
    if (!id) return Promise.resolve({ post: null, meta: { source: 'hardcode', id: NaN } });
    var base = scriptBaseDir();
    return fetch(base + 'data-event-en.json', { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('event json ' + r.status);
      return r.json();
    }).then(function (arr) {
      if (!Array.isArray(arr)) throw new Error('Invalid event JSON');
      var found = null;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          found = arr[i];
          break;
        }
      }
      return { post: found, meta: { source: 'hardcode', id: id } };
    });
  }

  /**
   * Same shape as API: Market (EN) dump only — data-market-en.json, client-side pagination.
   * Defaults to Vietnam Construction "Market" category when `categories` omitted.
   * @param {VietnamConstructionFeedInput} input
   * @returns {Promise<VietnamConstructionFeedResult>}
   */
  function hardcodeMarketFromVietnamconstruction(input) {
    input = input || {};
    if (!Array.isArray(input.categories) || !input.categories.length) {
      input = Object.assign({}, input, { categories: [3879] });
    }
    var n = normalizeInput(input);
    var base = scriptBaseDir();
    var uMarket = base + 'data-market-en.json';
    return fetch(uMarket, { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('market json ' + r.status);
      return r.json();
    }).then(function (arr) {
      if (!Array.isArray(arr)) throw new Error('Invalid market JSON');
      var merged = mergePostsByDateDesc([arr]);
      var filtered = filterByCategories(merged, n.categories);
      var total = filtered.length;
      var slice = filtered.slice(n.offset, n.offset + n.perPage);
      return {
        posts: slice,
        meta: {
          source: 'hardcode',
          page: n.page,
          perPage: n.perPage,
          offset: n.offset,
          categories: n.categories,
          totalAvailable: total
        }
      };
    });
  }

  /**
   * Single post by ID from data-market-en.json (EN Market feed only).
   * @param {{ id: number }} input
   * @returns {Promise<{ post: object | null, meta: { source: 'hardcode', id: number } }>}
   */
  function hardcodeMarketPostFromVietnamconstruction(input) {
    var id = parseInt(String(input && input.id), 10);
    if (!id) return Promise.resolve({ post: null, meta: { source: 'hardcode', id: NaN } });
    var base = scriptBaseDir();
    return fetch(base + 'data-market-en.json', { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('market json ' + r.status);
      return r.json();
    }).then(function (arr) {
      if (!Array.isArray(arr)) throw new Error('Invalid market JSON');
      var found = null;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          found = arr[i];
          break;
        }
      }
      return { post: found, meta: { source: 'hardcode', id: id } };
    });
  }

  /**
   * Event (VI) dump — data-event-vi.json. Defaults to VC Vietnamese "Sự kiện" category.
   * @param {VietnamConstructionFeedInput} input
   * @returns {Promise<VietnamConstructionFeedResult>}
   */
  function hardcodeEventViFromVietnamconstruction(input) {
    input = input || {};
    if (!Array.isArray(input.categories) || !input.categories.length) {
      input = Object.assign({}, input, { categories: [66] });
    }
    var n = normalizeInput(input);
    var base = scriptBaseDir();
    return fetch(base + 'data-event-vi.json', { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('event-vi json ' + r.status);
      return r.json();
    }).then(function (arr) {
      if (!Array.isArray(arr)) throw new Error('Invalid event VI JSON');
      var merged = mergePostsByDateDesc([arr]);
      var filtered = filterByCategories(merged, n.categories);
      var total = filtered.length;
      var slice = filtered.slice(n.offset, n.offset + n.perPage);
      return {
        posts: slice,
        meta: {
          source: 'hardcode',
          page: n.page,
          perPage: n.perPage,
          offset: n.offset,
          categories: n.categories,
          totalAvailable: total
        }
      };
    });
  }

  /**
   * Single post from data-event-vi.json.
   * @param {{ id: number }} input
   * @returns {Promise<{ post: object | null, meta: { source: 'hardcode', id: number } }>}
   */
  function hardcodeEventViPostFromVietnamconstruction(input) {
    var id = parseInt(String(input && input.id), 10);
    if (!id) return Promise.resolve({ post: null, meta: { source: 'hardcode', id: NaN } });
    var base = scriptBaseDir();
    return fetch(base + 'data-event-vi.json', { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('event-vi json ' + r.status);
      return r.json();
    }).then(function (arr) {
      if (!Array.isArray(arr)) throw new Error('Invalid event VI JSON');
      var found = null;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          found = arr[i];
          break;
        }
      }
      return { post: found, meta: { source: 'hardcode', id: id } };
    });
  }

  /**
   * Market (VI) dump — data-market-vi.json. Defaults to VC Vietnamese "Thị trường" category.
   * @param {VietnamConstructionFeedInput} input
   * @returns {Promise<VietnamConstructionFeedResult>}
   */
  function hardcodeMarketViFromVietnamconstruction(input) {
    input = input || {};
    if (!Array.isArray(input.categories) || !input.categories.length) {
      input = Object.assign({}, input, { categories: [3813] });
    }
    var n = normalizeInput(input);
    var base = scriptBaseDir();
    return fetch(base + 'data-market-vi.json', { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('market-vi json ' + r.status);
      return r.json();
    }).then(function (arr) {
      if (!Array.isArray(arr)) throw new Error('Invalid market VI JSON');
      var merged = mergePostsByDateDesc([arr]);
      var filtered = filterByCategories(merged, n.categories);
      var total = filtered.length;
      var slice = filtered.slice(n.offset, n.offset + n.perPage);
      return {
        posts: slice,
        meta: {
          source: 'hardcode',
          page: n.page,
          perPage: n.perPage,
          offset: n.offset,
          categories: n.categories,
          totalAvailable: total
        }
      };
    });
  }

  /**
   * Single post from data-market-vi.json.
   * @param {{ id: number }} input
   * @returns {Promise<{ post: object | null, meta: { source: 'hardcode', id: number } }>}
   */
  function hardcodeMarketViPostFromVietnamconstruction(input) {
    var id = parseInt(String(input && input.id), 10);
    if (!id) return Promise.resolve({ post: null, meta: { source: 'hardcode', id: NaN } });
    var base = scriptBaseDir();
    return fetch(base + 'data-market-vi.json', { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('market-vi json ' + r.status);
      return r.json();
    }).then(function (arr) {
      if (!Array.isArray(arr)) throw new Error('Invalid market VI JSON');
      var found = null;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          found = arr[i];
          break;
        }
      }
      return { post: found, meta: { source: 'hardcode', id: id } };
    });
  }

  global.HL_VietnamConstruction = {
    fetchFromVietnamconstruction: fetchFromVietnamconstruction,
    hardcodeFromVietnamconstruction: hardcodeFromVietnamconstruction,
    hardcodeMarketFromVietnamconstruction: hardcodeMarketFromVietnamconstruction,
    hardcodeEventViFromVietnamconstruction: hardcodeEventViFromVietnamconstruction,
    hardcodeMarketViFromVietnamconstruction: hardcodeMarketViFromVietnamconstruction,
    fetchPostFromVietnamconstruction: fetchPostFromVietnamconstruction,
    hardcodePostFromVietnamconstruction: hardcodePostFromVietnamconstruction,
    hardcodeMarketPostFromVietnamconstruction: hardcodeMarketPostFromVietnamconstruction,
    hardcodeEventViPostFromVietnamconstruction: hardcodeEventViPostFromVietnamconstruction,
    hardcodeMarketViPostFromVietnamconstruction: hardcodeMarketViPostFromVietnamconstruction,
    /** Default EN news feed: Event category only */
    defaultEnCategories: [6],
    /** Default EN Market / Insights feed */
    defaultMarketCategories: [3879],
    /** Default VI Event (Sự kiện) */
    defaultViEventCategories: [66],
    /** Default VI Market (Thị trường) */
    defaultViMarketCategories: [3813]
  };
})(typeof window !== 'undefined' ? window : this);
