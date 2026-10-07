/* =========================================================
   contact.js — 联系方式区块（首页和橱窗页共用一份）
   在 data/content.json 的 contact 里加/减字段，页面自动跟着变
   ========================================================= */

function escHtml(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderContact(boxId, qrId, contact) {
  contact = contact || {};

  /* 联系方式卡片 */
  var box = document.getElementById(boxId);
  if (box) {
    var items = [];

    if (contact.wechat) {
      items.push({
        icon: "fab fa-weixin", label: "微信", value: contact.wechat,
        note: contact.wechatNote || "加我时备注「约稿」"
      });
    }
    if (contact.qq) {
      items.push({
        icon: "fab fa-qq", label: "QQ", value: contact.qq,
        note: contact.qqNote || "也可以直接加 QQ 找我"
      });
    }
    if (contact.xiaohongshu) {
      items.push({
        icon: "fas fa-book", label: "小红书", value: "点这里私信",
        href: contact.xiaohongshu, note: "主页私信最快"
      });
    }
    if (contact.email) {
      items.push({
        icon: "fas fa-envelope", label: "邮箱", value: contact.email,
        href: "mailto:" + contact.email, note: contact.emailNote || "适合商单"
      });
    }

    box.innerHTML = items.map(function (item) {
      return '<div class="contact-box">' +
        '<p class="cb-label"><i class="' + item.icon + '"></i> ' + escHtml(item.label) + "</p>" +
        '<p class="cb-value">' +
          (item.href
            ? '<a href="' + escHtml(item.href) + '" target="_blank" rel="noopener">' + escHtml(item.value) + "</a>"
            : escHtml(item.value)) +
        "</p>" +
        (item.note ? '<p class="cb-note">' + escHtml(item.note) + "</p>" : "") +
      "</div>";
    }).join("");
  }

  /* 二维码 */
  var qrBox = document.getElementById(qrId);
  if (qrBox) {
    var figures = [];
    if (contact.wechatQr) figures.push({ src: contact.wechatQr, label: contact.wechatLabel || "微信二维码" });
    if (contact.payQr) figures.push({ src: contact.payQr, label: contact.payLabel || "收款码" });

    qrBox.innerHTML = figures.map(function (figure) {
      return '<figure><img src="' + escHtml(figure.src) + '" alt="' + escHtml(figure.label) + '">' +
        "<figcaption>" + escHtml(figure.label) + "</figcaption></figure>";
    }).join("");
  }
}
