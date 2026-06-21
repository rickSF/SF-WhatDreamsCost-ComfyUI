// 测试：1) 剥离"正面词："前缀  2) 用户实际提示词解析（第一个镜头提示词应不含"正面词："）
let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { console.log(`  [PASS] ${name}`); pass++; }
  else { console.log(`  [FAIL] ${name} ${detail}`); fail++; }
}

// 与 ltx_director.js 的 prParseGridPositionText 完全一致
function prParseGridPositionText(text) {
  text = String(text || "").trim();
  if (!text) return { prompts: [], lengths: [] };
  if (text.startsWith("```")) text = text.replace(/^```(?:json|JSON)?\s*/, "").replace(/\s*``$/, "");
  text = text.trim();
  if (!text) return { prompts: [], lengths: [] };

  // SF 扩展：剥离"正面词："前缀
  text = text.replace(/^[\s]*正面词[:：][\s]*/, "");

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
      let duration = null;
      const head = segment.substring(0, Math.min(30, segment.length));
      const durMatch = DURATION_RE.exec(head);
      if (durMatch) {
        duration = parseFloat(durMatch[1]);
        segment = segment.substring(0, durMatch.index) + segment.substring(durMatch.index + durMatch[0].length);
        segment = segment.replace(/[,，]{2,}/, "，").trim();
      }
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
    let duration = null;
    const head = segment.substring(0, Math.min(30, segment.length));
    const durMatch = DURATION_RE.exec(head);
    if (durMatch) {
      duration = parseFloat(durMatch[1]);
      segment = segment.substring(0, durMatch.index) + segment.substring(durMatch.index + durMatch[0].length);
      segment = segment.replace(/[,，]{2,}/, "，").trim();
    }
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

console.log("========== 测试 1：用户实际提示词（含'正面词：'前缀） ==========");
const userPrompt = `正面词：电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。第一个镜头，左上，中景，2秒，李强穿蓝色旧T恤坐在单人床边，一手握着彩票一手拿着手机，台灯暖黄光照亮简陋出租屋，镜头以定镜开场静静记录他的背影和侧脸，纸张沙沙声和窗外远处车流声让空间显得安静。第二个镜头，右上，近景，5秒，李强的手指移向彩票，指向上面的数字，瞳孔微缩，表情从专注转为震惊，镜头缓慢推近聚焦他的眼睛和微张的嘴巴，急促呼吸声变得明显。李强用中文标准普通话（惊喜）：这是真的吗？网页版。第三个镜头，左下，特写，2秒，彩票特写置于掌心，红蓝双色印刷的数字清晰可见，李强的手指微微发抖，指尖停在某一组数字旁，镜头以俯视机位定格，纸张边缘在灯光下微微颤动。第四个镜头，右下，近景，3秒，李强猛地抬头，嘴巴张开，脸上从震惊转为坚定，右手缓缓握拳，彩票被攥在掌心，镜头定格在他的侧脸和握拳的手上，彩票纸张声渐弱为下一镜头切入街道环境声的声音桥过渡做准备。`;
const result1 = prParseGridPositionText(userPrompt);
console.log(`  prompts数量: ${result1.prompts.length}`);
console.log(`  时长: ${JSON.stringify(result1.lengths)}`);
console.log(`  第一个prompt前60字: ${result1.prompts[0].substring(0, 60)}...`);
check("拆出4个prompts", result1.prompts.length === 4);
check("时长 [2,5,2,3]", JSON.stringify(result1.lengths) === JSON.stringify([2, 5, 2, 3]));
check("第一个prompt不含'正面词'", !result1.prompts[0].includes("正面词"));
check("第一个prompt以'电影感'开头", result1.prompts[0].startsWith("电影感真人摄影"));
check("第一个prompt包含第一个镜头描述", result1.prompts[0].includes("李强穿蓝色旧T恤"));
check("第一个prompt不含第二个镜头内容", !result1.prompts[0].includes("第二个镜头"));
check("第一个prompt不含第三个镜头内容", !result1.prompts[0].includes("第三个镜头"));
check("第二个prompt不含'正面词'", !result1.prompts[1].includes("正面词"));
check("第二个prompt含台词", result1.prompts[1].includes("这是真的吗"));
console.log("");

console.log("========== 测试 2：第一个prompt内容验证（去掉'正面词：'和'2秒，'） ==========");
// 用户核心诉求：去掉"正面词："前缀。时长标注"2秒，"也会被解析时提取掉。
// 当前解析逻辑按"第N个镜头，"切分，切分后序号被消耗，第一个prompt为"风格提示词。左上，中景，[描述]"
// 注意：末尾句号会被代码中的 replace(/[。，.,\s]+$/, "") 去掉
const expectedFirst = "电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。左上，中景，李强穿蓝色旧T恤坐在单人床边，一手握着彩票一手拿着手机，台灯暖黄光照亮简陋出租屋，镜头以定镜开场静静记录他的背影和侧脸，纸张沙沙声和窗外远处车流声让空间显得安静";
console.log(`  期望: ${expectedFirst.substring(0, 60)}...`);
console.log(`  实际: ${result1.prompts[0].substring(0, 60)}...`);
check("第一个prompt与期望内容完全匹配（去掉'正面词：'和时长标注）", result1.prompts[0] === expectedFirst, `(实际: ${result1.prompts[0].substring(0, 100)})`);
console.log("");

console.log("========== 测试 3：不含'正面词：'前缀的提示词正常解析 ==========");
const noPrefix = "电影感真人摄影，现代都市剧照。第一个镜头，左上，中景，3秒，场景A。第二个镜头，右上，近景，4秒，场景B。第三个镜头，左下，特写，3秒，场景C。第四个镜头，右下，近景，2秒，场景D。";
const result3 = prParseGridPositionText(noPrefix);
console.log(`  prompts数量: ${result3.prompts.length}`);
check("不含'正面词：'也能正常解析", result3.prompts.length === 4);
check("时长 [3,4,3,2]", JSON.stringify(result3.lengths) === JSON.stringify([3, 4, 3, 2]));
console.log("");

console.log("========== 测试 4：'正面词：'后紧跟内容（无空格） ==========");
const noSpace = "正面词：电影感摄影。第一个镜头，左上，中景，3秒，A。第二个镜头，右上，近景，4秒，B。";
const result4 = prParseGridPositionText(noSpace);
console.log(`  prompts数量: ${result4.prompts.length}`);
check("无空格的'正面词：'也能剥离", result4.prompts.length === 2);
check("第一个prompt不含'正面词'", !result4.prompts[0].includes("正面词"));
check("第一个prompt以'电影感'开头", result4.prompts[0].startsWith("电影感摄影"));
console.log("");

console.log("========== 测试 5：'正面词：'用英文冒号 ==========");
const engColon = "正面词:电影感摄影。第一个镜头，左上，中景，3秒，A。第二个镜头，右上，近景，4秒，B。";
const result5 = prParseGridPositionText(engColon);
console.log(`  prompts数量: ${result5.prompts.length}`);
check("英文冒号的'正面词:'也能剥离", result5.prompts.length === 2);
check("第一个prompt不含'正面词'", !result5.prompts[0].includes("正面词"));
console.log("");

console.log("========================================");
console.log(`测试结果：${pass} 通过, ${fail} 失败`);
console.log("========================================");
process.exit(fail > 0 ? 1 : 0);
