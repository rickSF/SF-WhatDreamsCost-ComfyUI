// 验证新格式(V2.4)和旧格式(V2.3)的双兼容解析
// 新格式：第一个镜头，左上，中景，3秒，...第二个镜头，右上，近景，4秒，...
// 旧格式：第一个镜头（对应...）：左上，中景，3秒，...右上，近景，4秒，...

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { console.log(`  [PASS] ${name}`); pass++; }
  else { console.log(`  [FAIL] ${name} ${detail}`); fail++; }
}

// ============ 新格式解析函数（与 ltx_director.js 完全一致） ============
function parseGridPositionText(text) {
  text = String(text || "").trim();
  if (!text) return { prompts: [], lengths: [] };
  if (text.startsWith("```")) text = text.replace(/^```(?:json|JSON)?\s*/, "").replace(/\s*``$/, "");
  text = text.trim();
  if (!text) return { prompts: [], lengths: [] };

  const DURATION_RE = /(\d+(?:\.\d+)?)\s*(?:秒|s|S)/;
  const GRID_WORDS = ["左上", "中上", "右上", "左中", "中中", "右中", "左下", "中下", "右下"];

  // 方案1：按"第N个镜头，"切分（新格式 V2.4）
  const lensMarkerRe = /第[一二三四五六七八九十\d]+个镜头\s*[,，]\s*/g;
  const lensMatches = [...text.matchAll(lensMarkerRe)];
  if (lensMatches.length >= 2) {
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
  if (oldLensIdx >= 0) {
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
    prompts.push(segment);
    lengths.push(duration);
  }
  const nonEmpty = prompts.filter(Boolean);
  if (!nonEmpty.length) return { prompts: [], lengths: [] };
  return { prompts, lengths };
}

// ============ 测试 ============

console.log("========== 测试 1：新格式 V2.4（4宫格12秒） ==========");
const newFormatPrompt = `电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。第一个镜头，左上，中景，3秒，李强穿蓝色旧T恤坐在单人床边，一手握着彩票一手拿着手机，台灯暖黄光照亮简陋出租屋，镜头以定镜开场静静记录他的背影和侧脸，纸张沙沙声和窗外远处车流声让空间显得安静。第二个镜头，右上，近景，4秒，李强的手指移向彩票，指向上面的数字，瞳孔微缩，表情从专注转为震惊，镜头缓慢推近聚焦他的眼睛和微张的嘴巴，急促呼吸声变得明显。第三个镜头，左下，特写，3秒，彩票特写置于掌心，红蓝双色印刷的数字清晰可见，李强的手指微微发抖，指尖停在某一组数字旁，镜头以俯视机位定格，纸张边缘在灯光下微微颤动。第四个镜头，右下，近景，2秒，李强猛地抬头，嘴巴张开，脸上从震惊转为坚定，右手缓缓握拳，彩票被攥在掌心，镜头定格在他的侧脸和握拳的手上，彩票纸张声渐弱为下一镜头的声音桥过渡做准备。`;
const result1 = parseGridPositionText(newFormatPrompt);
console.log(`  prompts=${result1.prompts.length}, lengths=${JSON.stringify(result1.lengths)}`);
check("新格式拆出 4 个 prompts", result1.prompts.length === 4);
check("新格式时长 [3,4,3,2]", JSON.stringify(result1.lengths) === JSON.stringify([3, 4, 3, 2]));
check("新格式每个 prompt 不为空", result1.prompts.every(p => p && p.length > 0));
console.log("");

console.log("========== 测试 2：旧格式 V2.3 向后兼容（4宫格12秒） ==========");
const oldFormatPrompt = `电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。第一个镜头（对应2x2四宫格从左上至右下区域）：左上，中景，3秒，李强穿蓝色旧T恤坐在单人床边。右上，近景，4秒，李强的手指移向彩票。左下，特写，3秒，彩票特写置于掌心。右下，近景，2秒，李强猛地抬头。`;
const result2 = parseGridPositionText(oldFormatPrompt);
console.log(`  prompts=${result2.prompts.length}, lengths=${JSON.stringify(result2.lengths)}`);
check("旧格式拆出 4 个 prompts", result2.prompts.length === 4);
check("旧格式时长 [3,4,3,2]", JSON.stringify(result2.lengths) === JSON.stringify([3, 4, 3, 2]));
console.log("");

console.log("========== 测试 3：新格式 6宫格18秒 ==========");
const sixGridPrompt = `电影感摄影。第一个镜头，左上，中景，3秒，场景A。第二个镜头，中上，近景，3秒，场景B。第三个镜头，右上，特写，3秒，场景C。第四个镜头，左下，近景，3秒，场景D。第五个镜头，中下，中景，3秒，场景E。第六个镜头，右下，特写，3秒，场景F。`;
const result3 = parseGridPositionText(sixGridPrompt);
console.log(`  prompts=${result3.prompts.length}, lengths=${JSON.stringify(result3.lengths)}`);
check("新格式6宫格拆出 6 个 prompts", result3.prompts.length === 6);
check("新格式6宫格时长全为3", result3.lengths.every(v => v === 3));
console.log("");

console.log("========== 测试 4：新格式 9宫格27秒 ==========");
const nineGridPrompt = `电影感摄影。第一个镜头，左上，中景，3秒，场景A。第二个镜头，中上，近景，3秒，场景B。第三个镜头，右上，特写，3秒，场景C。第四个镜头，左中，近景，3秒，场景D。第五个镜头，中中，中景，3秒，场景E。第六个镜头，右中，特写，3秒，场景F。第七个镜头，左下，近景，3秒，场景G。第八个镜头，中下，中景，3秒，场景H。第九个镜头，右下，特写，3秒，场景I。`;
const result4 = parseGridPositionText(nineGridPrompt);
console.log(`  prompts=${result4.prompts.length}, lengths=${JSON.stringify(result4.lengths)}`);
check("新格式9宫格拆出 9 个 prompts", result4.prompts.length === 9);
check("新格式9宫格时长全为3", result4.lengths.every(v => v === 3));
console.log("");

console.log("========== 测试 5：新格式包含对白 ==========");
const dialoguePrompt = `电影感摄影。第一个镜头，左上，中景，3秒，李强坐在床边看彩票。第二个镜头，右上，近景，4秒，李强震惊地看着彩票。[李强："全对上了！"]第三个镜头，左下，特写，3秒，彩票特写。第四个镜头，右下，近景，2秒，李强握拳。`;
const result5 = parseGridPositionText(dialoguePrompt);
console.log(`  prompts=${result5.prompts.length}, lengths=${JSON.stringify(result5.lengths)}`);
check("含对白拆出 4 个 prompts", result5.prompts.length === 4);
check("含对白时长 [3,4,3,2]", JSON.stringify(result5.lengths) === JSON.stringify([3, 4, 3, 2]));
check("第二个prompt包含对白", result5.prompts[1].includes("全对上了"));
console.log("");

console.log("========== 测试 6：新格式第二个prompt开头无多余逗号 ==========");
const commaPrompt = `风格提示词。第一个镜头，左上，中景，3秒，场景A。第二个镜头，右上，近景，4秒，场景B。第三个镜头，左下，特写，3秒，场景C。第四个镜头，右下，近景，2秒，场景D。`;
const result6 = parseGridPositionText(commaPrompt);
console.log(`  prompts=${JSON.stringify(result6.prompts)}`);
check("4个prompt全部拆出", result6.prompts.length === 4);
check("每个prompt开头无逗号", result6.prompts.every(p => !p.startsWith("，") && !p.startsWith(",")));
check("每个prompt不含位置标注前缀", result6.prompts.every(p => !p.startsWith("左上") && !p.startsWith("右上") && !p.startsWith("左下") && !p.startsWith("右下")));
console.log("");

console.log("========== 测试 7：无宫格标注的普通文本返回空 ==========");
const plainPrompt = `这是一段普通的视频描述，没有宫格位置标注，也没有镜头序号。`;
const result7 = parseGridPositionText(plainPrompt);
console.log(`  prompts=${result7.prompts.length}`);
check("普通文本返回空", result7.prompts.length === 0);
console.log("");

console.log("========== 测试 8：中文数字序号 ==========");
const chineseNumPrompt = `风格提示词。第一个镜头，左上，中景，3秒，场景A。第二个镜头，右上，近景，4秒，场景B。第三个镜头，左下，特写，3秒，场景C。第四个镜头，右下，近景，2秒，场景D。`;
const result8 = parseGridPositionText(chineseNumPrompt);
console.log(`  prompts=${result8.prompts.length}`);
check("中文数字序号拆出4个", result8.prompts.length === 4);
console.log("");

console.log("========================================");
console.log(`测试结果：${pass} 通过, ${fail} 失败`);
console.log("========================================");
process.exit(fail > 0 ? 1 : 0);
