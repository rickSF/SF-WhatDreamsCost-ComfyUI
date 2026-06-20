// 验证风格提示词保留到第一个镜头的 prompt 中
let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { console.log(`  [PASS] ${name}`); pass++; }
  else { console.log(`  [FAIL] ${name} ${detail}`); fail++; }
}

// 与 ltx_director.js 的 prParseGridPositionText 完全一致的实现
function prParseGridPositionText(text) {
  text = String(text || "").trim();
  if (!text) return { prompts: [], lengths: [] };
  if (text.startsWith("```")) text = text.replace(/^```(?:json|JSON)?\s*/, "").replace(/\s*``$/, "");
  text = text.trim();
  if (!text) return { prompts: [], lengths: [] };

  const DURATION_RE = /(\d+(?:\.\d+)?)\s*(?:秒|s|S)/;
  const GRID_WORDS = ["左上", "中上", "右上", "左中", "中中", "右中", "左下", "中下", "右下"];

  function joinStylePrefix(prefix, rest) {
    prefix = String(prefix || "").trim();
    rest = String(rest || "").trim();
    if (!prefix) return rest;
    if (!rest) return prefix;
    if (/[。.]$/.test(prefix)) return prefix + rest;
    return prefix + "。" + rest;
  }

  // 方案1：按"第N个镜头，"切分
  const lensMarkerRe = /第[一二三四五六七八九十\d]+个镜头\s*[,，]\s*/g;
  const lensMatches = [...text.matchAll(lensMarkerRe)];
  if (lensMatches.length >= 2) {
    const stylePrefix = text.substring(0, lensMatches[0].index).trim();
    const prompts = [];
    const lengths = [];
    for (let idx = 0; idx < lensMatches.length; idx++) {
      const start = lensMatches[idx][0].length + lensMatches[idx].index;
      const end = idx + 1 < lensMatches.length ? lensMatches[idx + 1].index : text.length;
      let segment = text.substring(start, end).trim();
      segment = segment.replace(/[。，.,\s]+$/, "").trim();
      if (!segment) { prompts.push(""); lengths.push(null); continue; }
      // 先提取时长（拼接风格提示词之前）
      let duration = null;
      const head = segment.substring(0, Math.min(30, segment.length));
      const durMatch = DURATION_RE.exec(head);
      if (durMatch) {
        duration = parseFloat(durMatch[1]);
        segment = segment.substring(0, durMatch.index) + segment.substring(durMatch.index + durMatch[0].length);
        segment = segment.replace(/[,，]{2,}/, "，").trim();
      }
      // 再拼接风格提示词
      if (idx === 0 && stylePrefix) {
        segment = joinStylePrefix(stylePrefix, segment);
      }
      prompts.push(segment);
      lengths.push(duration);
    }
    const nonEmpty = prompts.filter(Boolean);
    if (!nonEmpty.length) return { prompts: [], lengths: [] };
    return { prompts, lengths };
  }

  // 方案2：旧格式兼容
  const oldLensMarker = /第[一二三四五六七八九十\d]+个镜头(?:[\uff08(][^\uff09)]*[\uff09)]|[(][^)]*[)])?\s*[\uff1a:：]\s*/;
  const oldLensIdx = text.search(oldLensMarker);
  let stylePrefixV2 = "";
  if (oldLensIdx >= 0) {
    stylePrefixV2 = text.substring(0, oldLensIdx).trim();
    const m = text.match(oldLensMarker);
    if (m) text = text.substring(oldLensIdx + m[0].length);
  }
  const gridRe = new RegExp("(?:" + GRID_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\s*[,\\uff0c:：]\\s*", "g");
  const matches = [...text.matchAll(gridRe)];
  if (!matches.length) return { prompts: [], lengths: [] };
  const prompts = [];
  const lengths = [];
  for (let idx = 0; idx < matches.length; idx++) {
    const start = matches[idx][0].length + matches[idx].index;
    const end = idx + 1 < matches.length ? matches[idx + 1].index : text.length;
    let segment = text.substring(start, end).trim();
    segment = segment.replace(/[\u3002.]+\s*$/, "").trim();
    if (!segment) { prompts.push(""); lengths.push(null); continue; }
    // 先提取时长（拼接风格提示词之前）
    let duration = null;
    const head = segment.substring(0, Math.min(30, segment.length));
    const durMatch = DURATION_RE.exec(head);
    if (durMatch) {
      duration = parseFloat(durMatch[1]);
      segment = segment.substring(0, durMatch.index) + segment.substring(durMatch.index + durMatch[0].length);
      segment = segment.replace(/[,，]{2,}/, "，").trim();
    }
    // 再拼接风格提示词
    if (idx === 0 && stylePrefixV2) {
      segment = joinStylePrefix(stylePrefixV2, segment);
    }
    prompts.push(segment);
    lengths.push(duration);
  }
  const nonEmpty = prompts.filter(Boolean);
  if (!nonEmpty.length) return { prompts: [], lengths: [] };
  return { prompts, lengths };
}

// ============ 测试 ============

console.log("========== 测试 1：新格式风格提示词保留到第一个镜头 ==========");
const stylePrompt = "电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框";
const newFormat = `${stylePrompt}。第一个镜头，左上，中景，3秒，李强坐在床边看彩票。第二个镜头，右上，近景，4秒，李强震惊地看着彩票。第三个镜头，左下，特写，3秒，彩票特写。第四个镜头，右下，近景，2秒，李强握拳。`;
const result1 = prParseGridPositionText(newFormat);
console.log(`  prompts数量: ${result1.prompts.length}`);
console.log(`  第一个prompt前60字: ${result1.prompts[0].substring(0, 60)}...`);
console.log(`  第二个prompt前60字: ${result1.prompts[1].substring(0, 60)}...`);
check("拆出4个prompts", result1.prompts.length === 4);
check("第一个prompt包含风格提示词", result1.prompts[0].includes("电影感真人摄影"));
check("第一个prompt包含第一个镜头描述", result1.prompts[0].includes("李强坐在床边"));
check("第二个prompt不含风格提示词", !result1.prompts[1].includes("电影感真人摄影"));
check("第二个prompt只含第二个镜头描述", result1.prompts[1].includes("李强震惊"));
check("时长 [3,4,3,2]", JSON.stringify(result1.lengths) === JSON.stringify([3, 4, 3, 2]));
console.log("");

console.log("========== 测试 2：旧格式风格提示词保留到第一个镜头 ==========");
const oldFormat = `${stylePrompt}。第一个镜头（对应2x2四宫格从左上至右下区域）：左上，中景，3秒，李强坐在床边。右上，近景，4秒，李强震惊。左下，特写，3秒，彩票特写。右下，近景，2秒，李强握拳。`;
const result2 = prParseGridPositionText(oldFormat);
console.log(`  prompts数量: ${result2.prompts.length}`);
console.log(`  第一个prompt前60字: ${result2.prompts[0].substring(0, 60)}...`);
check("旧格式拆出4个prompts", result2.prompts.length === 4);
check("旧格式第一个prompt包含风格提示词", result2.prompts[0].includes("电影感真人摄影"));
check("旧格式第一个prompt包含第一个镜头描述", result2.prompts[0].includes("李强坐在床边"));
check("旧格式第二个prompt不含风格提示词", !result2.prompts[1].includes("电影感真人摄影"));
console.log("");

console.log("========== 测试 3：风格提示词不以句号结尾时自动补句号 ==========");
const noPeriodStyle = "电影感摄影，古装剧照，汉服";  // 不以句号结尾
const noPeriodPrompt = `${noPeriodStyle}。第一个镜头，左上，中景，3秒，场景A。第二个镜头，右上，近景，4秒，场景B。`;
const result3 = prParseGridPositionText(noPeriodPrompt);
console.log(`  第一个prompt: ${result3.prompts[0]}`);
check("风格提示词正确拼接到第一个prompt", result3.prompts[0].includes("电影感摄影") && result3.prompts[0].includes("场景A"));
// 风格提示词后面有句号（原文中的"。"），所以拼接时不会重复加句号
check("拼接后没有连续句号", !result3.prompts[0].includes("。。"));
console.log("");

console.log("========== 测试 4：6宫格风格提示词保留 ==========");
const sixGrid = `${stylePrompt}。第一个镜头，左上，中景，3秒，场景A。第二个镜头，中上，近景，3秒，场景B。第三个镜头，右上，特写，3秒，场景C。第四个镜头，左下，近景，3秒，场景D。第五个镜头，中下，中景，3秒，场景E。第六个镜头，右下，特写，3秒，场景F。`;
const result4 = prParseGridPositionText(sixGrid);
console.log(`  prompts数量: ${result4.prompts.length}`);
check("6宫格拆出6个prompts", result4.prompts.length === 6);
check("6宫格第一个prompt含风格提示词", result4.prompts[0].includes("电影感真人摄影"));
check("6宫格其他prompt不含风格提示词", !result4.prompts[1].includes("电影感真人摄影") && !result4.prompts[5].includes("电影感真人摄影"));
console.log("");

console.log("========== 测试 5：9宫格风格提示词保留 ==========");
const nineGrid = `${stylePrompt}。第一个镜头，左上，中景，3秒，A。第二个镜头，中上，近景，3秒，B。第三个镜头，右上，特写，3秒，C。第四个镜头，左中，近景，3秒，D。第五个镜头，中中，中景，3秒，E。第六个镜头，右中，特写，3秒，F。第七个镜头，左下，近景，3秒，G。第八个镜头，中下，中景，3秒，H。第九个镜头，右下，特写，3秒，I。`;
const result5 = prParseGridPositionText(nineGrid);
console.log(`  prompts数量: ${result5.prompts.length}`);
check("9宫格拆出9个prompts", result5.prompts.length === 9);
check("9宫格第一个prompt含风格提示词", result5.prompts[0].includes("电影感真人摄影"));
check("9宫格最后一个prompt不含风格提示词", !result5.prompts[8].includes("电影感真人摄影"));
console.log("");

console.log("========== 测试 6：无风格提示词的纯镜头描述 ==========");
const noStyle = "第一个镜头，左上，中景，3秒，场景A。第二个镜头，右上，近景，4秒，场景B。";
const result6 = prParseGridPositionText(noStyle);
console.log(`  prompts数量: ${result6.prompts.length}`);
console.log(`  第一个prompt: ${result6.prompts[0]}`);
check("无风格提示词也能正确拆分", result6.prompts.length === 2);
check("第一个prompt正常包含描述", result6.prompts[0].includes("场景A"));
console.log("");

console.log("========================================");
console.log(`测试结果：${pass} 通过, ${fail} 失败`);
console.log("========================================");
process.exit(fail > 0 ? 1 : 0);
