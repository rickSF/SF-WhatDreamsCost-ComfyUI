// Node.js 环境下测试修复后的 JS parseGridPositionText 函数
// 运行: node test_js_grid_parse.js

const GRID_WORDS = ["左上","中上","右上","左中","中中","右中","左下","中下","右下"];
const gridRe = new RegExp("(?:" + GRID_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|") + ")\\s*[,\\uff0c:：]\\s*", "g");
const DURATION_RE = /(\d+(?:\.\d+)?)\s*(?:秒|s|S)/;
const LENS_MARKER = /第[一二三四五六七八九十\d]+个镜头(?:[\uff08(][^\uff09)]*[\uff09)]|[(][^)]*[)])?\s*[\uff1a:：]\s*/;

function stripMarkdown(text) {
  text = String(text || "").trim();
  if (text.startsWith("```")) text = text.replace(/^```(?:json|JSON)?\s*/, "").replace(/\s*``$/, "");
  return text.trim();
}

function parseGridPositionText(text) {
  text = stripMarkdown(text);
  if (!text) return { prompts: [], lengths: [] };

  let lensMatch = text.search(LENS_MARKER);
  if (lensMatch >= 0) text = text.substring(text.match(LENS_MARKER)[0].length);

  const matches = [...text.matchAll(gridRe)];
  if (!matches.length) return { prompts: [], lengths: [] };

  const prompts = [];
  const lengths = [];
  for (let idx = 0; idx < matches.length; idx++) {
    let start = matches[idx][0].length + matches[idx].index;
    let end = idx + 1 < matches.length ? matches[idx + 1].index : text.length;
    let segment = text.substring(start, end).trim();
    segment = segment.replace(/[\u3002.]+\s*$/, "").trim();
    if (!segment) continue;

    let duration = null;
    const durMatch = DURATION_RE.exec(segment.substring(0, 30));
    if (durMatch) {
      duration = parseFloat(durMatch[1]);
      segment = segment.substring(0, durMatch.index) + segment.substring(durMatch.index + durMatch[0].length);
      segment = segment.replace(/[,\\uFF0c]{2,}/, "\uFF0C").trim();
    }
    if (segment) { prompts.push(segment); lengths.push(duration); }
  }
  return { prompts, lengths };
}

function parseNumberedText(text) {
  text = stripMarkdown(text);
  // 按第N个镜头切分
  const numeral = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  const markerRe = new RegExp(
    "(?:^|\\n)\\s*(?:(?:\\d+[\\.、)]\\s*)|(?:shot|scene|镜头|分镜)\\s*[-_]?\\s*\\d+\\s*[:：]\\s*)" +
    "|(?:第\\s*(?:" + numeral.join("|") + ")\\s*(?:个)?\\s*(?:镜头|分镜|场景)\\s*[:：，,\\s]*)",
    "gi"
  );
  const ms = [...text.matchAll(markerRe)];
  if (ms.length > 1) {
    const results = [];
    for (let i = 0; i < ms.length; i++) {
      const start = ms[i][0].length + ms[i].index;
      const end = i + 1 < ms.length ? ms[i + 1].index : text.length;
      let p = text.substring(start, end).replace(/^\s*/, "").replace(/\s+$/, "");
      p = p.replace(new RegExp("^" + markerRe.source.slice(3), "i"), "").trim().replace(/\s+/g, " ");
      if (p) results.push(p);
    }
    return results;
  }
  return text.split(/\n+/).map(l => l.trim()).filter(Boolean);
}

function firstJson(text) {
  text = stripMarkdown(text);
  for (let i = 0; i < text.length; i++) {
    if ("[{".includes(text[i])) {
      try { return JSON.parse(text.substring(i)); } catch(e) {}
    }
  }
  return null;
}

function parsePrompts(text, mode) {
  if (mode === "auto" || mode === "numbered_text") {
    const gridParsed = parseGridPositionText(text);
    if (gridParsed.prompts.length > 0) return gridParsed;
  }
  if (mode === "auto" || mode === "json") {
    const data = firstJson(text);
    if (data) {
      // simplified - just check it's an array
      if (Array.isArray(data)) {
        const prompts = data.map(item => typeof item === "string" ? item : (item && item.prompt ? item.prompt : "")).trim().filter(Boolean);
        if (prompts.length) return { prompts };
      }
    }
  }
  return { prompts: parseNumberedText(text), lengths: [] };
}

// ========== 用户实际提示词 ==========
const USER_PROMPT = '电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。第一个镜头（对应2x2四宫格从左上至右下区域）：左上，中景，3秒，李强穿蓝色旧T恤坐在单人床边，一手握着彩票一手拿着手机，台灯暖黄光照亮简陋出租屋，镜头以定镜开场静静记录他的背影和侧脸，纸张沙沙声和窗外远处车流声让空间显得安静。右上，近景，4秒，李强的手指移向彩票，指向上面的数字，瞳孔微缩，表情从专注转为震惊，镜头缓慢推近聚焦他的眼睛和微张的嘴巴，急促呼吸声变得明显。[李强："全对上了，一等奖，五百万！"]左下，特写，3秒，彩票特写置于掌心，红蓝双色印刷的数字清晰可见，李强的手指微微发抖，指尖停在某一组数字旁，镜头以俯视机位定格，纸张边缘在灯光下微微颤动。右下，近景，2秒，李强猛地抬头，嘴巴张开，脸上从震惊转为坚定，右手缓缓握拳，彩票被攥在掌心，镜头定格在他的侧脸和握拳的手上，彩票纸张声渐弱为下一镜头切入街道环境声的声音桥过渡做准备。';

console.log("=".repeat(70));
console.log("JS 前端 parsePrompts 修复验证");
console.log("=".repeat(70));

console.log("\n【1】parseGridPositionText 直接调用（新增的函数）:");
let result1 = parseGridPositionText(USER_PROMPT);
console.log("   prompts 数量:", result1.prompts.length);
console.log("   lengths:", result1.lengths);
for (let i = 0; i < result1.prompts.length; i++) {
  console.log(`   [${i}] ${result1.prompts[i].substring(0, 50)}...`);
}

console.log("\n【2】parsePrompts('auto') 实际入口（修复后）:");
let result2 = parsePrompts(USER_PROMPT, "auto");
console.log("   prompts 数量:", result2.prompts.length);
console.log("   lengths:", result2.lengths);
for (let i = 0; i < result2.prompts.length; i++) {
  console.log(`   [${i}] ${result2.prompts[i].substring(0, 50)}...`);
}

// 验证
const checks = [
  ["grid解析=4个prompt", result1.prompts.length === 4],
  ["grid时长=[3,4,3,2]", JSON.stringify(result1.lengths) === "[3,4,3,2]"],
  ["auto入口=4个prompt", result2.prompts.length === 4],
  ["auto时长=[3,4,3,2]", JSON.stringify(result2.lengths) === "[3,4,3,2]"],
];
let allPass = true;
for (const [desc, ok] of checks) {
  console.log(`   ${ok ? '✓' : '✗'} ${desc}`);
  if (!ok) allPass = false;
}
console.log("\n" + "=".repeat(70));
if (allPass) console.log("🎉 JS前端修复验证通过！parseGridPositionText 能正确拆分。");
else console.log("❌ 有检查未通过");
