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
}
