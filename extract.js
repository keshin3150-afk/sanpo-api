<<<<<<< HEAD
import { parseHTML } from "linkedom";

// HTML を受け取り、透明化レポートの「素体」を返す関数
export function extract(html) {
  const { document } = parseHTML(html);

  // --- 1. 基本情報抽出 ---
  const title = document.querySelector("title")?.textContent?.trim() || null;

  const h1 = [...document.querySelectorAll("h1")].map(el =>
    el.textContent.trim()
  );

  const h2 = [...document.querySelectorAll("h2")].map(el =>
    el.textContent.trim()
  );

  const paragraphs = [...document.querySelectorAll("p")].map(el =>
    el.textContent.trim()
  );

  // --- 2. 意味抽出（キーワードベースのMVP版） ---
  const text = document.body.textContent;

  const riskKeywords = ["注意", "リスク", "デメリット", "トラブル", "危険"];
  const costKeywords = ["費用", "料金", "初期費用", "手数料", "価格"];
  const operatorKeywords = ["会社", "運営", "管理", "事業者", "法人"];

  function findSentences(keywords) {
    return paragraphs.filter(p =>
      keywords.some(k => p.includes(k))
    );
  }

  const riskSentences = findSentences(riskKeywords);
  const costSentences = findSentences(costKeywords);
  const operatorSentences = findSentences(operatorKeywords);

  // --- 3. メタ情報抽出 ---
  const updatedAt =
    document.querySelector("time")?.getAttribute("datetime") ||
    document.querySelector("meta[property='article:modified_time']")?.content ||
    null;

  const operatorName =
    operatorSentences.length > 0 ? operatorSentences[0] : null;

  // --- 4. 透明化レポートの素体を返す ---
  return {
    meta: {
      title,
      updatedAt,
      operatorName
    },
    structure: {
      h1,
      h2,
      paragraphs
    },
    semantic: {
      risks: riskSentences,
      costs: costSentences,
      operatorInfo: operatorSentences
    }
  };
}

// 単体テスト用：node extract.js で動かせるように
if (process.argv[1].endsWith("extract.js")) {
  const fs = await import("fs");
  const html = fs.readFileSync("./sample.html", "utf8");
  console.log(JSON.stringify(extract(html), null, 2));
=======
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
>>>>>>> 5bc66e7ed30720487f7101e2bc41210fa63a8fab
}
