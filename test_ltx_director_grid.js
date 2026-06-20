// 验证 ltx_director.js 中新增的 prParseGridPositionText / prParsePrompts / prResolveSegmentLengths
// 直接复制函数代码（与源文件完全一致），独立运行测试
const fs = require("fs");
const path = require("path");

// ============ 从 ltx_director.js 复制的函数（与源文件完全一致） ============

function prStripFence(text) {
  return String(text || "").replace(/^```(?:json|JSON)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

function prCleanPrompt(text) {
  return String(text || "").replace(/^[\s，,。:：;；]+|[\s，,。:：;；]+$/g, "").trim();
}

function prFirstJson(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) return null;
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    try { return JSON.parse(cleaned); } catch (e) { }
  }
  const fenced = cleaned.match(/```(?:json|JSON)?\s*([\s\S]+?)\s*```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch (e) { }
  }
  const start = cleaned.search(/[{[]/);
  if (start < 0) return null;
  const sub = cleaned.substring(start);
  try { return JSON.parse(sub); } catch (e) { }
  for (let end = sub.length; end > 0; end--) {
    try { return JSON.parse(sub.substring(0, end)); } catch (e) { }
  }
  return null;
}

function prPromptFromObject(item) {
  const keys = ["prompt", "description", "text", "content", "scene", "action", "动态描述", "描述", "提示词", "画面"];
  for (const key of keys) {
    if (item?.[key]) return String(item[key]).trim();
  }
  return Object.entries(item || {})
    .filter(([key, value]) => value && !["shot", "shot_id", "index", "id", "number", "frames", "duration_frames", "length", "seconds", "duration"].includes(key))
    .map(([, value]) => String(value).trim())
    .join("，");
}

function prShotKeyIndex(key) {
  const digit = String(key).match(/\d+/);
  if (digit) return Number(digit[0]);
  const numerals = "一二三四五六七八九";
  for (let i = 0; i < numerals.length; i++) {
    if (String(key).includes(numerals[i])) return i + 1;
  }
  return null;
}

function prMappingToList(data) {
  const numbered = [];
  for (const [key, value] of Object.entries(data || {})) {
    const idx = prShotKeyIndex(key);
    if (idx != null) numbered.push([idx, value]);
  }
  if (numbered.length) return numbered.sort((a, b) => a[0] - b[0]).map((item) => item[1]);
  const values = Object.values(data || {});
  if (values.length && values.every((value) => typeof value === "string" || typeof value === "object")) return values;
  return null;
}

function prParseNumberList(text) {
  return String(text || "")
    .split(/[,\uFF0C|/\n]+/)
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function prEvenLengths(totalFrames, count) {
  const base = Math.floor(totalFrames / count);
  const lengths = Array(count).fill(base);
  for (let i = 0; i < totalFrames - base * count; i++) lengths[i % count] += 1;
  return lengths.map((v) => Math.max(1, v));
}

function prGetWidget(node, name) {
  return node.widgets?.find((w) => w.name === name);
}

function prGetWidgetValue(node, name, fallback = "") {
  const widget = prGetWidget(node, name);
  return widget?.value ?? fallback;
}

// ============ 新增的 prParseGridPositionText（与源文件完全一致） ============
function prParseGridPositionText(text) {
  text = String(text || "").trim();
  if (!text) return { prompts: [], lengths: [] };

  if (text.startsWith("```")) text = text.replace(/^```(?:json|JSON)?\s*/, "").replace(/\s*``$/, "");
  text = text.trim();
  if (!text) return { prompts: [], lengths: [] };

  const lensMarker = /第[一二三四五六七八九十\d]+个镜头(?:[\uff08(][^\uff09)]*[\uff09)]|[(][^)]*[)])?\s*[\uff1a:：]\s*/;
  const lensIdx = text.search(lensMarker);
  if (lensIdx >= 0) {
    const m = text.match(lensMarker);
    if (m) text = text.substring(lensIdx + m[0].length);
  }

  const GRID_WORDS = ["左上", "中上", "右上", "左中", "中中", "右中", "左下", "中下", "右下"];
  const gridRe = new RegExp("(?:" + GRID_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\s*[,\\uff0c:：]\\s*", "g");
  const DURATION_RE = /(\d+(?:\.\d+)?)\s*(?:秒|s|S)/;

  const matches = [...text.matchAll(gridRe)];
  if (!matches.length) return { prompts: [], lengths: [] };

  const prompts = [];
  const lengths = [];
  for (let idx = 0; idx < matches.length; idx++) {
    const start = matches[idx][0].length + matches[idx].index;
    const end = idx + 1 < matches.length ? matches[idx + 1].index : text.length;
    let segment = text.substring(start, end).trim();

    segment = segment.replace(/[\u3002.]+\s*$/, "").trim();
    if (!segment) {
      prompts.push("");
      lengths.push(null);
      continue;
    }

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

// ============ 修改后的 prParsePrompts（与源文件完全一致） ============
function prParsePrompts(text) {
  const gridParsed = prParseGridPositionText(text);
  if (gridParsed.prompts.length > 1) {
    return gridParsed.prompts;
  }

  const data = prFirstJson(text);
  if (data) {
    let items = data;
    if (!Array.isArray(items) && typeof items === "object") {
      let found = null;
      for (const key of ["segments", "shots", "scenes", "storyboard", "分镜", "镜头"]) {
        if (Array.isArray(items[key])) found = items[key];
        else if (items[key] && typeof items[key] === "object") found = prMappingToList(items[key]);
        if (found) break;
      }
      items = found || prMappingToList(items) || [items];
    }
    if (Array.isArray(items)) {
      return items.map((item) => prCleanPrompt(typeof item === "string" ? item : prPromptFromObject(item))).filter(Boolean);
    }
  }

  const stripped = prStripFence(text);
  const numerals = "一二三四五六七八九十";
  const marker = new RegExp(`(?:^|\\n)\\s*(?:分镜|镜头|画面|shot)\\s*[${numerals}\\d]+\\s*[:：.\\-、]\\s*`, "gi");
  const matches = [...stripped.matchAll(marker)];
  if (matches.length) {
    return matches.map((match, idx) => {
      const start = match.index + match[0].length;
      const end = idx + 1 < matches.length ? matches[idx + 1].index : stripped.length;
      return prCleanPrompt(stripped.slice(start, end));
    }).filter(Boolean);
  }
  return stripped.split(/\n+/).map(prCleanPrompt).filter(Boolean);
}

// ============ 修改后的 prResolveSegmentLengths（与源文件完全一致） ============
function prResolveSegmentLengths(node, count, ignoreManual = false, promptText = "") {
  const totalFrames = Math.max(count, Math.round(Number(prGetWidgetValue(node, "duration_frames", 120)) || 120));
  const frameRate = Math.max(1, Math.round(Number(prGetWidgetValue(node, "frame_rate", 24)) || 24));

  if (promptText) {
    const gridParsed = prParseGridPositionText(promptText);
    if (gridParsed.lengths && gridParsed.lengths.length >= count) {
      const secs = gridParsed.lengths.slice(0, count);
      if (secs.some((v) => v && v > 0)) {
        const lengths = secs.map((v) => (v && v > 0 ? Math.max(1, Math.round(v * frameRate)) : 0));
        for (let i = 0; i < lengths.length; i++) if (!lengths[i]) lengths[i] = 0;
        const usedFrames = lengths.reduce((acc, v) => acc + v, 0);
        const remainFrames = Math.max(0, totalFrames - usedFrames);
        const zeroCount = lengths.filter((v) => v === 0).length;
        if (zeroCount > 0 && remainFrames > 0) {
          const base = Math.floor(remainFrames / zeroCount);
          let extra = remainFrames - base * zeroCount;
          for (let i = 0; i < lengths.length; i++) {
            if (lengths[i] === 0) {
              lengths[i] = Math.max(1, base + (extra > 0 ? 1 : 0));
              if (extra > 0) extra -= 1;
            }
          }
        }
        let sum = lengths.reduce((acc, v) => acc + v, 0);
        if (sum !== totalFrames) {
          const diff = totalFrames - sum;
          lengths[lengths.length - 1] = Math.max(1, lengths[lengths.length - 1] + diff);
        }
        return lengths;
      }
    }
  }

  const manual = ignoreManual ? [] : prParseNumberList(prGetWidgetValue(node, "segment_lengths", ""));
  if (manual.length) {
    const lengths = manual.slice(0, count).map((v) => Math.max(1, Math.round(v)));
    while (lengths.length < count) lengths.push(1);
    const diff = totalFrames - lengths.reduce((a, b) => a + b, 0);
    lengths[lengths.length - 1] = Math.max(1, lengths[lengths.length - 1] + diff);
    return lengths;
  }
  return prEvenLengths(totalFrames, count);
}

// ============ 测试用例 ============

// 用户实际提示词（V2.3 格式）
const userPrompt = `电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。第一个镜头（对应2x2四宫格从左上至右下区域）：左上，中景，3秒，李强穿蓝色旧T恤坐在单人床边，一手握着彩票一手拿着手机，台灯暖黄光照亮简陋出租屋，镜头以定镜开场静静记录他的背影和侧脸，纸张沙沙声和窗外远处车流声让空间显得安静。右上，近景，4秒，李强的手指移向彩票，指向上面的数字，瞳孔微缩，表情从专注转为震惊，镜头缓慢推近聚焦他的眼睛和微张的嘴巴，急促呼吸声变得明显。[李强："全对上了，一等奖，五百万！"]左下，特写，3秒，彩票特写置于掌心，红蓝双色印刷的数字清晰可见，李强的手指微微发抖，指尖停在某一组数字旁，镜头以俯视机位定格，纸张边缘在灯光下微微颤动。右下，近景，2秒，李强猛地抬头，嘴巴张开，脸上从震惊转为坚定，右手缓缓握拳，彩票被攥在掌心，镜头定格在他的侧脸和握拳的手上，彩票纸张声渐弱为下一镜头切入街道环境声的声音桥过渡做准备。`;

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { console.log(`  [PASS] ${name}`); pass++; }
  else { console.log(`  [FAIL] ${name} ${detail}`); fail++; }
}

console.log("========== 测试 1：prParseGridPositionText 用户实际提示词 ==========");
const gridResult = prParseGridPositionText(userPrompt);
console.log(`  prompts=${gridResult.prompts.length}, lengths=${JSON.stringify(gridResult.lengths)}`);
check("拆出 4 个 prompts", gridResult.prompts.length === 4);
check("时长 [3,4,3,2] 秒", JSON.stringify(gridResult.lengths) === JSON.stringify([3, 4, 3, 2]));
check("prompts 都不为空", gridResult.prompts.every(p => p && p.length > 0));
console.log("");

console.log("========== 测试 2：prParsePrompts 用户实际提示词 ==========");
const prompts = prParsePrompts(userPrompt);
console.log(`  返回 ${prompts.length} 个 prompts`);
check("返回 4 个 prompts", prompts.length === 4);
check("每个 prompt 不为空", prompts.every(p => p && p.length > 0));
console.log("");

console.log("========== 测试 3：prResolveSegmentLengths 4宫格 12秒=288帧 ==========");
const mockNode = {
  widgets: [
    { name: "frame_rate", value: 24 },
    { name: "duration_frames", value: 288 },
    { name: "segment_lengths", value: "" },
  ],
};
const lengths = prResolveSegmentLengths(mockNode, 4, true, userPrompt);
console.log(`  返回: ${JSON.stringify(lengths)}, 总和=${lengths.reduce((a,b)=>a+b,0)}`);
check("返回 4 个长度", lengths.length === 4);
check("总帧数=288", lengths.reduce((a,b)=>a+b,0) === 288);
check("帧数 [72,96,72,48]", JSON.stringify(lengths) === JSON.stringify([72, 96, 72, 48]));
console.log("");

console.log("========== 测试 4：9 宫格 27 秒（648 帧） ==========");
const nineGridPrompt = `电影感摄影。第一个镜头（对应3x3九宫格从左上至右下区域）：左上，中景，3秒，场景A。中上，近景，3秒，场景B。右上，特写，3秒，场景C。左中，近景，3秒，场景D。中中，中景，3秒，场景E。右中，特写，3秒，场景F。左下，近景，3秒，场景G。中下，中景，3秒，场景H。右下，特写，3秒，场景I。`;
const grid9 = prParseGridPositionText(nineGridPrompt);
console.log(`  prompts=${grid9.prompts.length}, lengths=${JSON.stringify(grid9.lengths)}`);
check("拆出 9 个 prompts", grid9.prompts.length === 9);
const mockNode9 = {
  widgets: [
    { name: "frame_rate", value: 24 },
    { name: "duration_frames", value: 648 },
    { name: "segment_lengths", value: "" },
  ],
};
const lengths9 = prResolveSegmentLengths(mockNode9, 9, true, nineGridPrompt);
console.log(`  帧数: ${JSON.stringify(lengths9)}, 总和=${lengths9.reduce((a,b)=>a+b,0)}`);
check("总帧数=648", lengths9.reduce((a,b)=>a+b,0) === 648);
console.log("");

console.log("========== 测试 5：6 宫格 18 秒（432 帧） ==========");
const sixGridPrompt = `电影感摄影。第一个镜头（对应2x3六宫格从左上至右下区域）：左上，中景，3秒，场景A。中上，近景，3秒，场景B。右上，特写，3秒，场景C。左下，近景，3秒，场景D。中下，中景，3秒，场景E。右下，特写，3秒，场景F。`;
const grid6 = prParseGridPositionText(sixGridPrompt);
console.log(`  prompts=${grid6.prompts.length}, lengths=${JSON.stringify(grid6.lengths)}`);
check("拆出 6 个 prompts", grid6.prompts.length === 6);
const mockNode6 = {
  widgets: [
    { name: "frame_rate", value: 24 },
    { name: "duration_frames", value: 432 },
    { name: "segment_lengths", value: "" },
  ],
};
const lengths6 = prResolveSegmentLengths(mockNode6, 6, true, sixGridPrompt);
console.log(`  帧数: ${JSON.stringify(lengths6)}, 总和=${lengths6.reduce((a,b)=>a+b,0)}`);
check("总帧数=432", lengths6.reduce((a,b)=>a+b,0) === 432);
console.log("");

console.log("========== 测试 6：不带时长 fallback 平均分配 ==========");
const noDurPrompt = `电影感摄影。左上，中景，场景A。右上，近景，场景B。左下，特写，场景C。右下，近景，场景D。`;
const lengthsNoDur = prResolveSegmentLengths(mockNode, 4, true, noDurPrompt);
console.log(`  fallback 帧数: ${JSON.stringify(lengthsNoDur)}, 总和=${lengthsNoDur.reduce((a,b)=>a+b,0)}`);
check("总帧数=288", lengthsNoDur.reduce((a,b)=>a+b,0) === 288);
console.log("");

console.log("========== 测试 7：JSON 格式向后兼容 ==========");
const jsonPrompt = JSON.stringify([
  { shot: 1, prompt: "场景A" },
  { shot: 2, prompt: "场景B" },
  { shot: 3, prompt: "场景C" },
]);
const jsonPrompts = prParsePrompts(jsonPrompt);
console.log(`  JSON 解析：${jsonPrompts.length} 个 prompts`);
check("JSON 返回 3 个", jsonPrompts.length === 3);
console.log("");

console.log("========== 测试 8：分镜N: 格式向后兼容 ==========");
const numberedPrompt = `分镜一：场景A的描述\n分镜二：场景B的描述\n分镜三：场景C的描述`;
const numberedPrompts = prParsePrompts(numberedPrompt);
console.log(`  分镜N: 解析：${numberedPrompts.length} 个 prompts`);
check("分镜N: 返回 3 个", numberedPrompts.length === 3);
console.log("");

console.log("========================================");
console.log(`测试结果：${pass} 通过, ${fail} 失败`);
console.log("========================================");
process.exit(fail > 0 ? 1 : 0);
