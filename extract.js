// extract.js
// GitHub 側（Node）で動く「抽出レイヤー」の完全版
// - URL を受け取って HTML を取得
// - DOMParser（linkedom）でパース
// - リンク抽出（href + text）
// - 重複除去
// - 将来の段落抽出・SUUMO 特化にもそのまま拡張できる構造

import { parseHTML } from "linkedom";

// Node 18+ 前提（fetch 標準搭載）
// それ以前なら node-fetch を import して使う

export async function extractFromUrl(targetUrl) {
  const res = await fetch(targetUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  return extractFromHtml(html, targetUrl);
}

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

    // 絶対 URL 化（必要な場合）
    if (baseUrl && isRelative(href)) {
      try {
        href = new URL(href, baseUrl).toString();
      } catch {
        // 無効な URL はスキップ
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

// a 要素内の「見えるテキスト」だけを取る
function getVisibleText(node) {
  // script / style / noscript などは無視
  const IGNORE = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

  let text = "";

  function walk(n) {
    if (n.nodeType === 3) {
      // Text node
      text += n.textContent;
      return;
    }
    if (n.nodeType === 1) {
      const el = n;
      if (IGNORE.has(el.tagName)) return;
      for (const child of el.childNodes) {
        walk(child);
      }
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
// CLI 用（node extract.js <URL>）
// -----------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: node extract.js <URL>");
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
