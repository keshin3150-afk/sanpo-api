// extract-links.js
// URL → HTML → リンク抽出 のユーティリティレイヤー
// - URL を受け取って HTML を取得
// - linkedom でパース
// - aタグの href + text を抽出
// - 重複除去
// - CLI からも使える

import { parseHTML } from "linkedom";

// -----------------------------
// URL から抽出
// -----------------------------
export async function extractFromUrl(targetUrl) {
  const res = await fetch(targetUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  return extractFromHtml(html, targetUrl);
}

// -----------------------------
// HTML から抽出
// -----------------------------
export function extractFromHtml(html, baseUrl = "") {
  const { document } = parseHTML(html);

  const links = extractLinks(document, baseUrl);

  return {
    ok: true,
    meta: {
      baseUrl,
      linkCount: links.length
    },
    links
  };
}

// -----------------------------
// リンク抽出ロジック
// -----------------------------
function extractLinks(document, baseUrl) {
  const anchors = Array.from(document.querySelectorAll("a"));
  const seen = new Set();
  const results = [];

  for (const a of anchors) {
    let href = a.getAttribute("href") || "";
    let text = getVisibleText(a);

    href = href.trim();
    text = text.trim();

    if (!href || !text) continue;

    // 相対パス → 絶対URL
    if (baseUrl && isRelative(href)) {
      try {
        href = new URL(href, baseUrl).toString();
      } catch {
        continue;
      }
    }

    const key = href + "||" + text;
    if (seen.has(key)) continue;

    seen.add(key);
    results.push({ href, text });
  }

  return results;
}

// -----------------------------
// aタグ内の「見えるテキスト」だけ抽出
// -----------------------------
function getVisibleText(node) {
  const IGNORE = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
  let text = "";

  function walk(n) {
    if (n.nodeType === 3) {
      text += n.textContent;
      return;
    }
    if (n.nodeType === 1) {
      if (IGNORE.has(n.tagName)) return;
      for (const child of n.childNodes) walk(child);
    }
  }

  walk(node);
  return normalizeWhitespace(text);
}

function normalizeWhitespace(str) {
  return str.replace(/\s+/g, " ").trim();
}

function isRelative(href) {
  return !/^([a-zA-Z][a-zA-Z0-9+\-.]*:)?\/\//.test(href);
}

// -----------------------------
// CLI 用（node extract-links.js <URL>）
// -----------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: node extract-links.js <URL>");
    process.exit(1);
  }

  extractFromUrl(url)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
