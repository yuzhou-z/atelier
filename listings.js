/* =========================================================
   listings.js — 委托橱窗 · 奶茶店式配置器
   选规格 → 加料 → 数量 → 实时出总价 → 复制配置去私信
   没有订单、没有服务器，纯静态。
   ========================================================= */

var LISTINGS = null;   // data/listings.json
var CONTENT = null;    // data/content.json（只为拿联系方式）
var CURRENT = null;    // 当前打开的橱窗

function $(id) { return document.getElementById(id); }

/* ---------- 深浅色 ---------- */
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
   价格计算
   规格价 → 按顺序套用加料 → 乘以数量
   ========================================================= */
function optionById(listing, id) {
  return (listing.options || []).find(function (option) { return option.id === id; });
}

function pickedOptionId() {
  var input = document.querySelector('input[name="option"]:checked');
  return input ? input.value : null;
}

function pickedAddonIds() {
  return Array.prototype.slice.call(document.querySelectorAll('input[name="addon"]:checked'))
    .map(function (input) { return input.value; });
}

function priceBreakdown() {
  var option = optionById(CURRENT, pickedOptionId());
  if (!option) return { perItem: 0, total: 0, extras: 0, count: 0 };

  var picture = Number(option.price) || 0;
  var extras = 0;
  var picked = pickedAddonIds();

  (CURRENT.addons || []).forEach(function (addon) {
    if (picked.indexOf(addon.id) < 0) return;
    var value = Number(addon.value) || 0;
    if (addon.mode === "percent") picture *= 1 + value / 100;
    else if (addon.mode === "multiply") picture *= value;
    else extras += value;
  });

  var perItem = Math.round(picture + extras);
  var quantity = Math.max(1, parseInt($("qty").value, 10) || 1);

  return { perItem: perItem, total: perItem * quantity, extras: picked.length, count: quantity };
}

function addonLabel(addon) {
  var value = Number(addon.value) || 0;
  if (addon.mode === "percent") return "+" + value + "%";
  if (addon.mode === "multiply") return "×" + value;
  return "+¥" + value;
}

/* =========================================================
   橱窗列表
   ========================================================= */
function renderList() {
  var intro = LISTINGS.intro || {};
  $("intro-eyebrow").textContent = intro.eyebrow || "";
  $("intro-title").textContent = intro.title || "委托橱窗";
  $("intro-sub").textContent = intro.sub || "";

  var grid = $("listing-grid");
  grid.innerHTML = "";

  var items = LISTINGS.items || [];
  if (!items.length) {
    grid.innerHTML = '<p class="e-empty">还没有橱窗，请到编辑器里添加。</p>';
    return;
  }

  items.forEach(function (listing) {
    var prices = (listing.options || []).map(function (o) { return Number(o.price) || 0; });
    var minPrice = prices.length ? Math.min.apply(null, prices) : 0;
    var closed = !listing.open;

    var card = document.createElement("article");
    card.className = "listing";

    var tags = (listing.tags || []).map(function (t) { return "<li>" + escHtml(t) + "</li>"; }).join("");

    card.innerHTML =
      (listing.cover ? '<img class="listing-cover" src="' + escHtml(listing.cover) + '" alt="' + escHtml(listing.title) + '" loading="lazy">' : "") +
      '<div class="listing-body">' +
        "<h3>" + escHtml(listing.title) + "</h3>" +
        '<p class="listing-desc">' + escHtml(listing.desc) + "</p>" +
        (tags ? '<ul class="listing-tags">' + tags + "</ul>" : "") +
        '<div class="listing-foot">' +
          "<div>" +
            '<p class="listing-price">¥' + minPrice + "<span>起</span></p>" +
            '<p class="listing-slots">' + (closed ? "暂停接单" : "工期 " + escHtml(listing.delivery || "面议")) + "</p>" +
          "</div>" +
          '<button class="btn ' + (closed ? "btn-ghost" : "btn-solid") + '" type="button">' +
            (closed ? "暂停接单" : "自己配一份") +
          "</button>" +
        "</div>" +
      "</div>";

    card.querySelector("button").addEventListener("click", function () {
      if (closed) return;
      openDetail(listing);
    });

    grid.appendChild(card);
  });
}

/* =========================================================
   打开配置器
   ========================================================= */
function openDetail(listing) {
  CURRENT = listing;

  $("list-view").hidden = true;
  $("detail-view").hidden = false;

  $("d-cover").src = listing.cover || "";
  $("d-cover").alt = listing.title;
  $("d-title").textContent = listing.title;
  $("d-desc").textContent = (listing.desc || "") +
    "　工期 " + (listing.delivery || "面议") + " · 含 " + (listing.revisions || 2) + " 次修改";

  /* 规格（单选，价格直接标在旁边） */
  var optionList = $("d-options");
  optionList.innerHTML = "";
  (listing.options || []).forEach(function (option, index) {
    var li = document.createElement("li");
    li.innerHTML =
      '<label class="choice' + (index === 0 ? " is-picked" : "") + '">' +
        '<input type="radio" name="option" value="' + escHtml(option.id) + '"' + (index === 0 ? " checked" : "") + ">" +
        '<span class="choice-name">' + escHtml(option.name) + "</span>" +
        '<span class="choice-price">¥' + (Number(option.price) || 0) + "</span>" +
      "</label>";
    optionList.appendChild(li);
  });

  /* 加料（多选） */
  var addonList = $("d-addons");
  addonList.innerHTML = "";
  (listing.addons || []).forEach(function (addon) {
    var li = document.createElement("li");
    li.innerHTML =
      '<label class="choice">' +
        '<input type="checkbox" name="addon" value="' + escHtml(addon.id) + '">' +
        '<span class="choice-name">' + escHtml(addon.name) + "</span>" +
        '<span class="choice-price choice-addon">' + addonLabel(addon) + "</span>" +
      "</label>";
    addonList.appendChild(li);
  });

  $("qty").value = 1;

  optionList.onchange = refresh;
  addonList.onchange = refresh;
  refresh();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* 重新算价并刷新界面 */
function refresh() {
  if (!CURRENT) return;

  /* 选中的规格高亮 */
  Array.prototype.slice.call(document.querySelectorAll(".option-list .choice")).forEach(function (label) {
    label.classList.toggle("is-picked", label.querySelector("input").checked);
  });

  /* 选中的加料高亮 */
  Array.prototype.slice.call(document.querySelectorAll(".addon-list .choice")).forEach(function (label) {
    label.classList.toggle("is-picked", label.querySelector("input").checked);
  });

  var result = priceBreakdown();
  $("d-total").textContent = "¥" + result.total;

  var parts = [];
  parts.push("¥" + result.perItem + " / 件");
  if (result.count > 1) parts.push("× " + result.count + " 件");
  if (result.extras) parts.push("含 " + result.extras + " 项加料");
  $("d-detail").textContent = parts.join("　·　");
}

/* =========================================================
   复制配置
   ========================================================= */
function buildConfigText() {
  var option = optionById(CURRENT, pickedOptionId()) || { name: "", price: 0 };
  var picked = pickedAddonIds();
  var addonNames = (CURRENT.addons || [])
    .filter(function (a) { return picked.indexOf(a.id) >= 0; })
    .map(function (a) { return a.name + "（" + addonLabel(a) + "）"; });

  var result = priceBreakdown();
  var contact = (CONTENT && CONTENT.contact) || {};
  var ways = [];
  if (contact.wechat) ways.push("微信 " + contact.wechat);
  if (contact.qq) ways.push("QQ " + contact.qq);

  return [
    "【委托配置】",
    "橱窗：" + CURRENT.title,
    "规格：" + option.name + "（¥" + option.price + "）",
    "加料：" + (addonNames.length ? addonNames.join("、") : "无"),
    "数量：" + result.count,
    "预估合计：¥" + result.total,
    "—————————",
    "（发到 " + (ways.join(" 或 ") || "我的微信/QQ") + " 就行）"
  ].join("\n");
}

function initCopy() {
  var button = $("copy-config");

  button.addEventListener("click", function () {
    var text = buildConfigText();

    function done() {
      var old = button.textContent;
      button.textContent = "已复制 ✓ 去粘贴给我";
      window.setTimeout(function () { button.textContent = old; }, 2400);
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
      try { document.execCommand("copy"); done(); } catch (error) { button.textContent = "复制失败，请手动选择"; }
      document.body.removeChild(area);
    }
  });
}

/* =========================================================
   返回列表 / 数量加减
   ========================================================= */
function initEvents() {
  $("back").addEventListener("click", function (event) {
    event.preventDefault();
    $("detail-view").hidden = true;
    $("list-view").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("qty-minus").addEventListener("click", function () {
    var input = $("qty");
    input.value = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
    refresh();
  });

  $("qty-plus").addEventListener("click", function () {
    var input = $("qty");
    input.value = Math.min(99, (parseInt(input.value, 10) || 1) + 1);
    refresh();
  });

  $("qty").addEventListener("input", refresh);
}

/* =========================================================
   启动
   ========================================================= */
function loadJson(path) {
  return fetch(path, { cache: "no-store" }).then(function (res) {
    if (!res.ok) throw new Error("读不到 " + path);
    return res.json();
  });
}

initEvents();
initCopy();

Promise.all([loadJson("data/listings.json"), loadJson("data/content.json")])
  .then(function (result) {
    LISTINGS = result[0];
    CONTENT = result[1];

    renderList();
    renderContact("d-contact", "d-qr", CONTENT.contact || {});
  })
  .catch(function (error) {
    $("listing-grid").innerHTML =
      '<p class="notice notice-error">橱窗加载失败：' + escHtml(error.message) +
      "（请用 start.bat 启动本地预览，或把网站上传后再看）</p>";
  });

/* =========================================================
   橱窗例图：封面之外的图，客户点进详情才看到，点一下可放大
   ========================================================= */
/* 例图默认最多显示这么多张，其余折叠起来，避免客户要滚很久才能到配置器 */
var GALLERY_LIMIT = 4;
var galleryExpanded = false;

function renderGallery(listing) {
  var box = $("d-gallery");
  var moreBtn = $("gallery-more");
  var title = $("d-gallery-title");
  if (!box) return;

  var items = listing.gallery || [];
  galleryExpanded = false;

  if (!items.length) {
    if (title) title.textContent = "";
    if (moreBtn) moreBtn.hidden = true;
    box.innerHTML = '<p class="locked">这个橱窗的例图还在整理中。想看更多可以直接私信我，我发你现成的作品。</p>';
    return;
  }

  if (title) {
    title.textContent = "这个橱窗的例图（" + items.length + " 张）· 点图片可放大";
  }

  box.innerHTML = items.map(function (item, index) {
    var folded = index >= GALLERY_LIMIT ? " is-folded" : "";
    return '<figure class="work' + folded + '" data-index="' + index + '">' +
      '<img src="' + escHtml(item.image || item.full) + '" data-full="' + escHtml(item.full || item.image) +
        '" alt="' + escHtml(item.caption || listing.title) + '" loading="lazy">' +
      "<figcaption>" + escHtml(item.caption || "") + "</figcaption>" +
      "</figure>";
  }).join("");

  if (!moreBtn) return;

  var rest = items.length - GALLERY_LIMIT;

  if (rest <= 0) {
    moreBtn.hidden = true;
    return;
  }

  moreBtn.hidden = false;
  moreBtn.textContent = "展开全部例图（还有 " + rest + " 张）↓";

  moreBtn.onclick = function () {
    galleryExpanded = !galleryExpanded;
    Array.prototype.slice.call(box.querySelectorAll(".work")).forEach(function (figure, index) {
      figure.classList.toggle("is-folded", !galleryExpanded && index >= GALLERY_LIMIT);
    });
    moreBtn.textContent = galleryExpanded
      ? "收起例图 ↑（上面就能直接去选规格）"
      : "展开全部例图（还有 " + rest + " 张）↓";
  };
}

/* 灯箱 + 把 openDetail 包一层（这样打开橱窗时自动渲染例图） */
(function initGallery() {
  var box = $("lightbox");
  if (box) {
    var boxImg = $("lb-img");
    var boxCaption = $("lb-caption");
    var btnPrev = $("lb-prev");
    var btnNext = $("lb-next");
    var index = 0;

    var figures = function () {
      return Array.prototype.slice.call(document.querySelectorAll("#d-gallery .work"));
    };

    var open = function (position) {
      var list = figures();
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
    };

    var close = function () {
      box.hidden = true;
      boxImg.src = "";
      document.body.style.overflow = "";
    };

    document.addEventListener("click", function (event) {
      var img = event.target.closest ? event.target.closest("#d-gallery .work img") : null;
      if (!img) return;
      open(figures().indexOf(img.closest(".work")));
    });

    $("lb-close").addEventListener("click", close);
    btnPrev.addEventListener("click", function () { open(index - 1); });
    btnNext.addEventListener("click", function () { open(index + 1); });
    box.addEventListener("click", function (event) { if (event.target === box) close(); });
    document.addEventListener("keydown", function (event) {
      if (box.hidden) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") open(index - 1);
      if (event.key === "ArrowRight") open(index + 1);
    });
  }

  var originalOpenDetail = openDetail;
  openDetail = function (listing) {
    originalOpenDetail(listing);
    renderGallery(listing);
  };
})();
