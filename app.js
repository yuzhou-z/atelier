/* =========================================================
   app.js — 前台渲染 + 实时同步
   页面本身只是一副空壳，所有内容都从 /api/content 读出来填进去。
   后台一保存，服务器会通过 SSE 推消息过来，这里立刻重新渲染 ——
   访客不用刷新就能看到新价格、新例图。
   ========================================================= */

var CONTENT = null;

/* ---------- 小工具 ---------- */
function $(id) { return document.getElementById(id); }

function setText(id, value) {
  var el = $(id);
  if (el) el.textContent = value == null ? "" : value;
}

function setHtml(id, value) {
  var el = $(id);
  if (el) el.innerHTML = value == null ? "" : value;
}

/* 转义，防止内容里的尖括号把页面搞坏 */
function esc(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* =========================================================
   渲染
   ========================================================= */
function render(data) {
  CONTENT = data;
  var site = data.site || {};

  /* 页面元信息 */
  if (site.title) document.title = site.title;
  var desc = document.querySelector('meta[name="description"]');
  if (desc && site.description) desc.setAttribute("content", site.description);
  var ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && site.title) ogTitle.setAttribute("content", site.title);
  var ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && site.description) ogDesc.setAttribute("content", site.description);
  if (site.lang) document.documentElement.setAttribute("lang", site.lang);

  /* 顶栏 */
  setHtml("brand", esc(site.brand) + ' <span>' + esc(site.brandSuffix || "") + "</span>");

  /* 首屏 */
  var avatar = $("site-avatar");
  if (avatar) {
    if (site.avatar) {
      avatar.src = site.avatar;
      avatar.alt = (site.brand || "") + " 的头像";
      avatar.hidden = false;
    } else {
      avatar.hidden = true;
    }
  }

  setHtml("hero-title", esc(site.heroLine1) + "<br>" + esc(site.heroLine2));
  setText("hero-tagline", site.tagline);
  setText("hero-note", site.heroNote);

  var badge = $("status-badge");
  if (badge) {
    badge.dataset.status = site.status || "open";
    setText("status-text", (site.statusText || {})[site.status] || "");
  }

  /* 01 业务类型 */
  var services = data.services || {};
  setText("services-eyebrow", services.eyebrow);
  setText("services-title", services.title);
  setText("services-sub", services.sub);
  setHtml("services-grid", (services.items || []).map(function (item) {
    var meta = (item.meta || []).map(function (line) {
      return "<li>" + esc(line) + "</li>";
    }).join("");
    return '<article class="card service reveal">' +
      "<h3><i class=\"" + esc(item.icon) + "\"></i> " + esc(item.title) + "</h3>" +
      "<p>" + esc(item.text) + "</p>" +
      (meta ? '<ul class="meta">' + meta + "</ul>" : "") +
      "</article>";
  }).join(""));

  /* 02 例图 */
  var works = data.works || {};
  setText("works-eyebrow", works.eyebrow);
  setText("works-title", works.title);
  setText("works-sub", works.sub);
  setHtml("gallery", (works.items || []).map(function (item) {
    return '<figure class="work reveal" data-cat="' + esc(item.cat || "illustration") + '">' +
      '<img src="' + esc(item.image) + '" data-full="' + esc(item.full || item.image) + '" alt="' + esc(item.caption) + '" loading="lazy">' +
      "<figcaption>" + esc(item.caption) + "</figcaption>" +
      "</figure>";
  }).join(""));

  /* 03 价格 */
  var prices = data.prices || {};
  setText("prices-eyebrow", prices.eyebrow);
  setText("prices-title", prices.title);
  setText("prices-sub", prices.sub);
  var currency = (data.calculator || {}).currency || "¥";
  setHtml("prices-grid", (prices.items || []).map(function (item) {
    var meta = (item.items || []).map(function (line) {
      return "<li>" + esc(line) + "</li>";
    }).join("");
    return '<article class="card price reveal' + (item.featured ? " price-featured" : "") + '">' +
      (item.tag ? '<p class="price-tag">' + esc(item.tag) + "</p>" : "") +
      '<p class="price-name">' + esc(item.name) + "</p>" +
      '<p class="price-num">' + esc(currency) + esc(item.amount) + "<span>起</span></p>" +
      (meta ? '<ul class="meta">' + meta + "</ul>" : "") +
      "</article>";
  }).join(""));

  /* 附加费用 */
  var extras = data.extras || {};
  setText("extras-title", extras.title);
  setHtml("extras-list", (extras.items || []).map(function (line) {
    return "<li>" + esc(line) + "</li>";
  }).join(""));
  setText("extras-note", extras.note);

  /* 估价器：把类型选项填进去 */
  var calc = data.calculator || {};
  var typeSelect = $("calc-type");
  if (typeSelect) {
    var current = typeSelect.value;
    typeSelect.innerHTML = Object.keys(calc.types || {}).map(function (key) {
      var t = calc.types[key];
      return '<option value="' + esc(key) + '">' + esc(t.label) + "</option>";
    }).join("");
    if (current && calc.types && calc.types[current]) typeSelect.value = current;
  }

  /* 04 流程 */
  var process = data.process || {};
  setText("process-eyebrow", process.eyebrow);
  setText("process-title", process.title);
  setHtml("process-grid", (process.items || []).map(function (item, i) {
    var num = String(i + 1);
    if (num.length < 2) num = "0" + num;
    return '<article class="step reveal">' +
      '<span class="step-num">' + num + "</span>" +
      "<h3>" + esc(item.title) + "</h3>" +
      "<p>" + esc(item.text) + "</p>" +
      "</article>";
  }).join(""));

  /* 05 问答 */
  var faq = data.faq || {};
  setText("faq-eyebrow", faq.eyebrow);
  setText("faq-title", faq.title);
  setHtml("faq-list", (faq.items || []).map(function (item) {
    return "<details><summary>" + esc(item.q) + "</summary><p>" + esc(item.a) + "</p></details>";
  }).join(""));

  /* 06 联系方式（微信 / QQ / 小红书 / 邮箱，哪几个填了就连哪几个） */
  var contact = data.contact || {};
  setText("contact-eyebrow", contact.eyebrow);
  setText("contact-title", contact.title);
  setText("contact-sub", contact.sub);
  setText("contact-terms", contact.terms);

  if (typeof renderContact === "function") {
    renderContact("contact-boxes", "qr-inline", contact);
  }

  /* 页脚 */
  var footer = data.footer || {};
  setText("footer-line1", footer.line1);
  setText("footer-line2", footer.line2);

  /* 内容变了，重新挂一次交互 */
  setupFilters();
  setupReveal();
  if (window.updateCalculator) window.updateCalculator();
}

/* =========================================================
   数据来源：优先走后端接口，没有后端就读本地 JSON
   这样同一套页面既能跑在服务器上（可实时改），
   也能直接放进 GitHub Pages 这类静态托管（读 data/content.json）
   ========================================================= */
var STATIC_MODE = false;   // true = 当前没有后端，纯静态运行

function fetchData(apiPath, filePath) {
  return fetch(apiPath, { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("no-api");
      return res.json();
    })
    .catch(function () {
      STATIC_MODE = true;
      return fetch(filePath, { cache: "no-store" }).then(function (res) {
        if (!res.ok) throw new Error("读不到 " + filePath);
        return res.json();
      });
    });
}

/* =========================================================
   载入内容
   ========================================================= */
function loadContent(showToast) {
  return fetchData("/api/content", "data/content.json")
    .then(function (data) {
      render(data);
      if (showToast) showLiveToast();
    })
    .catch(function (error) {
      console.error("读取内容失败：", error);
    });
}

/* =========================================================
   实时同步：后台一保存，这里立刻更新
   ========================================================= */
function connectLive() {
  if (!window.EventSource) return;

  var source = new EventSource("/api/events");

  source.addEventListener("message", function (event) {
    var data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      return;
    }
    if (data.type === "content") {
      loadContent(true);
    }
  });

  /* 断线时浏览器会自动重连，这里不用额外处理 */
}

/* =========================================================
   深浅色切换
   ========================================================= */
(function initTheme() {
  var root = document.documentElement;
  var button = $("theme-toggle");
  var saved = localStorage.getItem("theme");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var icon = button && button.querySelector("i");
    if (icon) icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }

  apply(saved || (systemDark ? "dark" : "light"));

  if (button) {
    button.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next);
      localStorage.setItem("theme", next);
    });
  }
})();

/* =========================================================
   作品灯箱
   ========================================================= */
function setupLightbox() {
  var box = $("lightbox");
  if (!box || box.dataset.ready) return;
  box.dataset.ready = "1";

  var boxImg = $("lb-img");
  var boxCaption = $("lb-caption");
  var btnPrev = $("lb-prev");
  var btnNext = $("lb-next");
  var index = 0;

  function visibleFigures() {
    return Array.prototype.slice.call(document.querySelectorAll(".work"))
      .filter(function (f) { return !f.hidden; });
  }

  function open(position) {
    var list = visibleFigures();
    if (!list.length) return;

    index = (position + list.length) % list.length;
    var figure = list[index];
    var img = figure.querySelector("img");

    boxImg.src = img.dataset.full || img.src;
    boxImg.alt = img.alt;
    boxCaption.textContent = (figure.querySelector("figcaption") || {}).textContent || "";

    var single = list.length < 2;
    btnPrev.hidden = single;
    btnNext.hidden = single;

    box.hidden = false;
    document.body.style.overflow = "hidden";
    $("lb-close").focus();
  }

  function close() {
    box.hidden = true;
    boxImg.src = "";
    document.body.style.overflow = "";
  }

  /* 事件委托：内容重新渲染后依然有效 */
  document.addEventListener("click", function (event) {
    var img = event.target.closest ? event.target.closest(".work img") : null;
    if (!img) return;
    var figure = img.closest(".work");
    var list = visibleFigures();
    var position = list.indexOf(figure);
    open(position >= 0 ? position : 0);
  });

  $("lb-close").addEventListener("click", close);
  btnPrev.addEventListener("click", function () { open(index - 1); });
  btnNext.addEventListener("click", function () { open(index + 1); });

  box.addEventListener("click", function (event) {
    if (event.target === box) close();
  });

  document.addEventListener("keydown", function (event) {
    if (box.hidden) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") open(index - 1);
    if (event.key === "ArrowRight") open(index + 1);
  });
}

/* =========================================================
   作品分类筛选（图少于 2 张时自动隐藏筛选栏）
   ========================================================= */
function setupFilters() {
  var bar = $("filters");
  var gallery = $("gallery");
  if (!bar || !gallery) return;

  var figures = Array.prototype.slice.call(gallery.querySelectorAll(".work"));
  bar.hidden = figures.length < 2;

  if (bar.dataset.ready) {
    /* 已经挂过事件，只需把当前选中的分类重新应用一次 */
    var active = bar.querySelector(".filter.is-active");
    applyFilter(active ? active.dataset.filter : "all");
    return;
  }
  bar.dataset.ready = "1";

  function applyFilter(category) {
    figures.forEach(function (figure) {
      figure.hidden = !(category === "all" || figure.dataset.cat === category);
    });
  }

  Array.prototype.slice.call(bar.querySelectorAll(".filter")).forEach(function (button) {
    button.addEventListener("click", function () {
      Array.prototype.slice.call(bar.querySelectorAll(".filter")).forEach(function (b) {
        b.classList.remove("is-active");
      });
      button.classList.add("is-active");
      applyFilter(button.dataset.filter);
    });
  });
}

/* =========================================================
   滚动淡入
   ========================================================= */
function setupReveal() {
  var elements = Array.prototype.slice.call(document.querySelectorAll(".reveal:not(.reveal-init)"));
  if (!elements.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || reduceMotion) return;

  elements.forEach(function (el) { el.classList.add("reveal-init"); });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  elements.forEach(function (el) { observer.observe(el); });
}

/* =========================================================
   估价器（价格参数来自后台的 calculator 配置）
   ========================================================= */
function setupCalculator() {
  var typeEl = $("calc-type");
  var countEl = $("calc-count");
  var revEl = $("calc-revisions");
  var rushEl = $("calc-rush");
  var licenseEl = $("calc-license");
  var resultEl = $("calc-result");
  var copyBtn = $("calc-copy");
  var copiedEl = $("calc-copied");

  if (!typeEl || !resultEl) return;

  function config() {
    return (CONTENT && CONTENT.calculator) || {};
  }

  function price() {
    var calc = config();
    var types = calc.types || {};
    var type = types[typeEl.value] || { base: 0, label: "" };
    var count = Math.max(1, parseInt(countEl.value, 10) || 1);
    var revisions = Math.max(0, parseInt(revEl.value, 10) || 0);

    var picture = Number(type.base) || 0;
    if (count > 1) picture += Number(type.base) * (Number(calc.extraCharacter) || 0) * (count - 1);
    if (rushEl.checked) picture *= 1 + (Number(calc.rush) || 0);
    if (licenseEl.checked) picture *= 1 + (Number(calc.license) || 0);

    var total = picture + revisions * (Number(calc.extraRevision) || 0);
    return Math.round(total / 10) * 10;
  }

  function buildBrief() {
    var calc = config();
    var types = calc.types || {};
    var type = types[typeEl.value] || { base: 0, label: "" };
    var count = Math.max(1, parseInt(countEl.value, 10) || 1);
    var revisions = Math.max(0, parseInt(revEl.value, 10) || 0);
    var currency = calc.currency || "¥";

    return [
      "【约稿需求】",
      "类型：" + type.label + "（" + currency + type.base + " 起）",
      "角色 / 主体数量：" + count + " 个",
      "加急（3 天内）：" + (rushEl.checked ? "是" : "否"),
      "商用授权：" + (licenseEl.checked ? "是" : "否"),
      "额外修改：" + revisions + " 次",
      "预估价格：约 " + currency + price() + "（最终以确认为准）",
      "—————————",
      "用途：",
      "尺寸 / 比例：",
      "参考图：",
      "期望交付时间："
    ].join("\n");
  }

  function update() {
    resultEl.textContent = (config().currency || "¥") + price();
  }

  window.updateCalculator = update;

  [typeEl, countEl, revEl, rushEl, licenseEl].forEach(function (el) {
    el.addEventListener("input", update);
    el.addEventListener("change", update);
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = buildBrief();

      function done() {
        copiedEl.classList.add("is-visible");
        window.setTimeout(function () { copiedEl.classList.remove("is-visible"); }, 2200);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else {
        fallback();
      }

      function fallback() {
        var area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.top = "-1000px";
        document.body.appendChild(area);
        area.select();
        try { document.execCommand("copy"); done(); } catch (error) {
          copiedEl.textContent = "复制失败，请手动选择文字";
          copiedEl.classList.add("is-visible");
        }
        document.body.removeChild(area);
      }
    });
  }

  update();
}

/* =========================================================
   回到顶部
   ========================================================= */
(function initToTop() {
  var button = $("to-top");
  if (!button) return;

  window.addEventListener("scroll", function () {
    button.classList.toggle("is-visible", window.scrollY > 600);
  }, { passive: true });

  button.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

/* =========================================================
   "内容已更新"提示
   ========================================================= */
function showLiveToast() {
  var toast = $("live-toast");
  if (!toast) return;
  toast.hidden = false;
  window.setTimeout(function () { toast.hidden = true; }, 2600);
}

/* =========================================================
   启动
   ========================================================= */
setupLightbox();
setupCalculator();

loadContent(false).then(function () {
  /* 静态托管（GitHub Pages 等）没有实时接口，跳过 SSE，避免无意义的报错 */
  if (!STATIC_MODE) connectLive();
});
