import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const STYLE_ID = "ltx-auto-director-styles";
const MAX_SHOTS = 6;

const SHOT_WORDS = ["\u5206\u955c", "\u955c\u5934", "\u753b\u9762", "shot"];
const CHINESE_NUMERALS = "\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341";

const INPUT_LABELS = {
  model: "\u6a21\u578b",
  clip: "\u6587\u672c\u7f16\u7801\u5668",
  storyboard_images: "\u516d\u5bab\u683c\u62c6\u5206\u56fe",
  llm_response: "GPT \u5206\u955c\u6587\u672c",
  audio_vae: "\u97f3\u9891 VAE",
  optional_latent: "\u53ef\u9009\u6f5c\u7a7a\u95f4",
  global_prompt: "\u5168\u5c40\u63d0\u793a\u8bcd",
  segment_count: "\u5206\u955c\u6570\u91cf",
  duration_frames: "\u603b\u5e27\u6570",
  duration_seconds: "\u603b\u79d2\u6570",
  segment_lengths: "\u6bcf\u6bb5\u5e27\u6570",
  guide_strength: "\u56fe\u50cf\u5f15\u5bfc\u5f3a\u5ea6",
  epsilon: "\u5206\u6bb5\u8fb9\u754c\u9510\u5ea6",
  frame_rate: "\u5e27\u7387",
  parse_mode: "\u6587\u672c\u89e3\u6790\u65b9\u5f0f",
  custom_width: "\u8f93\u51fa\u5bbd\u5ea6",
  custom_height: "\u8f93\u51fa\u9ad8\u5ea6",
  resize_method: "\u56fe\u50cf\u9002\u914d\u65b9\u5f0f",
  divisible_by: "\u5c3a\u5bf8\u6574\u9664",
  img_compression: "\u56fe\u50cf\u538b\u7f29",
};

const OUTPUT_LABELS = {
  model: "\u6a21\u578b",
  positive: "\u6b63\u5411\u6761\u4ef6",
  video_latent: "\u89c6\u9891\u6f5c\u7a7a\u95f4",
  audio_latent: "\u97f3\u9891\u6f5c\u7a7a\u95f4",
  guide_data: "\u5f15\u5bfc\u6570\u636e",
  frame_rate: "\u5e27\u7387",
  combined_audio: "\u5408\u6210\u97f3\u9891",
};

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .ltx-auto-preview {
      box-sizing: border-box;
      width: 100%;
      padding: 10px;
      border: 1px solid #171717;
      border-radius: 6px;
      background: #202020;
      color: #e8e8e8;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: auto;
    }
    .ltx-auto-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      min-height: 24px;
    }
    .ltx-auto-title {
      font-size: 12px;
      font-weight: 650;
      color: #f2f2f2;
      white-space: nowrap;
    }
    .ltx-auto-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .ltx-auto-chip {
      min-height: 20px;
      border: 1px solid #353535;
      background: #292929;
      border-radius: 4px;
      padding: 2px 6px;
      color: #bfbfbf;
      font-size: 10px;
      line-height: 15px;
      box-sizing: border-box;
      white-space: nowrap;
    }
    .ltx-auto-toggle {
      border: 1px solid #3d3d3d;
      background: #262626;
      color: #d7d7d7;
      border-radius: 4px;
      font-size: 10px;
      padding: 3px 7px;
      cursor: pointer;
      min-height: 22px;
    }
    .ltx-auto-toggle:hover {
      background: #323232;
      border-color: #555;
    }
    .ltx-auto-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      width: 100%;
    }
    .ltx-auto-shot {
      min-width: 0;
      min-height: 122px;
      border: 1px solid #141414;
      border-radius: 5px;
      background: #151515;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .ltx-auto-thumb {
      height: 74px;
      background-color: #101010;
      background-repeat: no-repeat;
      border-bottom: 1px solid #111;
      position: relative;
    }
    .ltx-auto-thumb::after {
      content: attr(data-index);
      position: absolute;
      top: 5px;
      left: 6px;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      background: rgba(0, 0, 0, 0.68);
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #fff;
      font-size: 10px;
      line-height: 17px;
      text-align: center;
    }
    .ltx-auto-placeholder {
      height: 74px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #676767;
      font-size: 10px;
      background: #111;
      border-bottom: 1px solid #111;
    }
    .ltx-auto-shot-body {
      padding: 7px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-height: 48px;
    }
    .ltx-auto-shot-head {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      color: #cfcfcf;
      font-size: 10px;
      line-height: 13px;
    }
    .ltx-auto-prompt {
      color: #a9a9a9;
      font-size: 10px;
      line-height: 13px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .ltx-auto-empty {
      border: 1px dashed #3a3a3a;
      border-radius: 5px;
      padding: 12px;
      color: #878787;
      font-size: 11px;
      line-height: 16px;
      background: #171717;
    }
    .ltx-auto-timeline {
      height: 24px;
      display: flex;
      overflow: hidden;
      border: 1px solid #151515;
      border-radius: 4px;
      background: #111;
    }
    .ltx-auto-segment {
      min-width: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #f2f2f2;
      font-size: 10px;
      border-right: 1px solid rgba(0, 0, 0, 0.45);
      box-sizing: border-box;
      overflow: hidden;
      white-space: nowrap;
    }
    .ltx-auto-segment:last-child {
      border-right: none;
    }
  `;
  document.head.appendChild(style);
}

function getWidget(node, name) {
  return node.widgets?.find((widget) => widget.name === name);
}

function getWidgetValue(node, name, fallback = "") {
  const widget = getWidget(node, name);
  return widget?.value ?? fallback;
}

function getNumberValue(node, name, fallback) {
  const value = Number(getWidgetValue(node, name, fallback));
  return Number.isFinite(value) ? value : fallback;
}

function applyChineseLabels(node) {
  for (const input of node.inputs || []) {
    if (INPUT_LABELS[input.name]) input.label = INPUT_LABELS[input.name];
  }
  for (const output of node.outputs || []) {
    if (OUTPUT_LABELS[output.name]) output.label = OUTPUT_LABELS[output.name];
  }
  for (const widget of node.widgets || []) {
    if (INPUT_LABELS[widget.name]) widget.label = INPUT_LABELS[widget.name];
  }
}

function hideWidget(widget, hidden) {
  if (!widget) return;
  if (hidden) {
    if (!widget._ltxAutoOrigType) widget._ltxAutoOrigType = widget.type;
    if (!widget._ltxAutoOrigComputeSize) widget._ltxAutoOrigComputeSize = widget.computeSize;
    widget.hidden = true;
    widget.type = "hidden";
    widget.computeSize = () => [0, -4];
    if (widget.element) widget.element.style.display = "none";
  } else {
    if (widget._ltxAutoOrigType) widget.type = widget._ltxAutoOrigType;
    if (widget._ltxAutoOrigComputeSize) widget.computeSize = widget._ltxAutoOrigComputeSize;
    widget.hidden = false;
    if (widget.element) widget.element.style.display = "";
  }
}

function getGraphLink(linkId) {
  if (linkId == null) return null;
  const links = app.graph?.links;
  if (!links) return null;
  if (links[linkId]) return links[linkId];
  if (Array.isArray(links)) {
    return links.find((link) => link?.id === linkId || link?.[0] === linkId) || null;
  }
  return null;
}

function getOriginNodeFromInput(node, inputName) {
  const input = node.inputs?.find((item) => item.name === inputName);
  const link = getGraphLink(input?.link);
  if (!link) return null;
  const originId = link.origin_id ?? link.originId ?? link[1];
  return app.graph?.getNodeById?.(originId) || null;
}

function getLoadImageUrl(loadNode) {
  const filename = getWidgetValue(loadNode, "image", "");
  if (!filename || filename === "undefined") return "";
  const parts = String(filename).split(/[\\/]/);
  const base = parts.pop();
  const subfolder = parts.join("/");
  return api.apiURL(`/view?filename=${encodeURIComponent(base)}&type=input&subfolder=${encodeURIComponent(subfolder)}`);
}

function getStoryboardPreview(node) {
  const splitNode = getOriginNodeFromInput(node, "storyboard_images");
  if (!splitNode) return null;

  let cols = Number(getWidgetValue(splitNode, "\u6c34\u5e73\u5f20\u6570", NaN));
  let rows = Number(getWidgetValue(splitNode, "\u5782\u76f4\u5f20\u6570", NaN));
  if (!Number.isFinite(cols)) cols = Number(splitNode.widgets?.[1]?.value ?? 3);
  if (!Number.isFinite(rows)) rows = Number(splitNode.widgets?.[2]?.value ?? 2);
  cols = Math.max(1, Math.round(cols || 3));
  rows = Math.max(1, Math.round(rows || 2));

  const inputLink = splitNode.inputs?.[0]?.link;
  const link = getGraphLink(inputLink);
  if (!link) return { cols, rows, url: "" };

  const originId = link.origin_id ?? link.originId ?? link[1];
  const imageNode = app.graph?.getNodeById?.(originId);
  if (!imageNode) return { cols, rows, url: "" };

  return { cols, rows, url: getLoadImageUrl(imageNode) };
}

function stripFence(text) {
  text = String(text || "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json|JSON)?\s*/, "").replace(/\s*```$/, "");
  }
  return text.trim();
}

function firstJson(text) {
  text = stripFence(text);
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "[" && text[i] !== "{") continue;
    try {
      return JSON.parse(text.slice(i));
    } catch (_) {
      continue;
    }
  }
  return null;
}

function shotKeyIndex(key) {
  const digit = String(key).match(/\d+/);
  if (digit) return Number(digit[0]);
  for (let i = 0; i < CHINESE_NUMERALS.length && i < 9; i++) {
    if (String(key).includes(CHINESE_NUMERALS[i])) return i + 1;
  }
  return null;
}

function mappingToList(data) {
  const numbered = [];
  for (const [key, value] of Object.entries(data || {})) {
    const idx = shotKeyIndex(key);
    if (idx != null) numbered.push([idx, value]);
  }
  if (numbered.length) {
    return numbered.sort((a, b) => a[0] - b[0]).map((item) => item[1]);
  }
  const values = Object.values(data || {});
  if (values.length && values.every((value) => typeof value === "string" || typeof value === "object")) return values;
  return null;
}

function promptFromObject(item) {
  const keys = [
    "prompt",
    "description",
    "text",
    "content",
    "scene",
    "action",
    "\u52a8\u6001\u63cf\u8ff0",
    "\u63cf\u8ff0",
    "\u63d0\u793a\u8bcd",
    "\u753b\u9762",
  ];
  for (const key of keys) {
    if (item?.[key]) return String(item[key]).trim();
  }
  return Object.entries(item || {})
    .filter(([key, value]) => value && !["shot", "shot_id", "index", "id", "number", "frames", "duration_frames", "length", "seconds", "duration"].includes(key))
    .map(([, value]) => String(value).trim())
    .join("\uff0c");
}

function frameLengthFromObject(item) {
  const frameKeys = ["frames", "duration_frames", "length", "\u65f6\u957f\u5e27\u6570", "\u5e27\u6570"];
  for (const key of frameKeys) {
    const value = Number(item?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function cleanPrompt(prompt) {
  const words = SHOT_WORDS.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`^\\s*(?:${words})\\s*[${CHINESE_NUMERALS}\\d]+\\s*[:\\uff1a.\\-\\u3001]\\s*`, "i");
  return String(prompt || "").replace(re, "").replace(/\s+/g, " ").trim();
}

function parseJsonPrompts(data) {
  if (data && !Array.isArray(data) && typeof data === "object") {
    let found = null;
    for (const key of ["segments", "shots", "scenes", "storyboard", "\u5206\u955c", "\u955c\u5934"]) {
      if (Array.isArray(data[key])) found = data[key];
      else if (data[key] && typeof data[key] === "object") found = mappingToList(data[key]);
      if (found) break;
    }
    data = found || mappingToList(data) || [data];
  }
  if (!Array.isArray(data)) return { prompts: [], lengths: [] };
  const prompts = [];
  const lengths = [];
  for (const item of data) {
    let prompt = "";
    let length = null;
    if (typeof item === "string") prompt = item;
    else if (item && typeof item === "object") {
      prompt = promptFromObject(item);
      length = frameLengthFromObject(item);
    }
    if (prompt) {
      prompts.push(cleanPrompt(prompt));
      lengths.push(length);
    }
  }
  return { prompts, lengths };
}

function parseNumberedText(text) {
  text = stripFence(text);
  const words = SHOT_WORDS.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const marker = new RegExp(`(?:^|\\n)\\s*(?:${words})\\s*[${CHINESE_NUMERALS}\\d]+\\s*[:\\uff1a.\\-\\u3001]\\s*`, "gi");
  const matches = [...text.matchAll(marker)];
  if (matches.length) {
    return matches.map((match, idx) => {
      const start = match.index + match[0].length;
      const end = idx + 1 < matches.length ? matches[idx + 1].index : text.length;
      return cleanPrompt(text.slice(start, end));
    }).filter(Boolean);
  }
  return text.split(/\n+/).map(cleanPrompt).filter(Boolean);
}

function parsePrompts(text, mode) {
  // SF 扩展：优先尝试宫格位置标注解析（"左上，中景，4秒，..."格式）
  if (mode === "auto" || mode === "numbered_text") {
    const gridParsed = parseGridPositionText(text);
    if (gridParsed.prompts.length > 0) return gridParsed;
  }
  if (mode === "auto" || mode === "json") {
    const data = firstJson(text);
    if (data) {
      const parsed = parseJsonPrompts(data);
      if (parsed.prompts.length || mode === "json") return parsed;
    }
  }
  return { prompts: parseNumberedText(text), lengths: [] };
}

// SF 扩展：解析带宫格位置标注+时长标注的单段连续文字
// 新格式(V2.4)：[风格提示词]。第一个镜头，左上，中景，4秒，[描述]。第二个镜头，右上，近景，3秒，[描述]...
// 旧格式(V2.3)：[风格提示词]。第一个镜头（对应...）：左上，中景，4秒，[描述]。右上，近景，3秒，[描述]...
// 注意：风格提示词会保留到第一个镜头的 prompt 前面，不被切掉
function parseGridPositionText(text) {
  text = String(text || "").trim();
  if (!text) return { prompts: [], lengths: [] };

  // 剥离 markdown 围栏
  if (text.startsWith("```")) text = text.replace(/^```(?:json|JSON)?\s*/, "").replace(/\s*``$/, "");
  text = text.trim();
  if (!text) return { prompts: [], lengths: [] };

  // SF 扩展：剥离"正面词："前缀（用户从 ComfyUI 正面词输入框粘贴时可能带上）
  text = text.replace(/^[\s]*正面词[:：][\s]*/, "");

  const DURATION_RE = /(\d+(?:\.\d+)?)\s*(?:秒|s|S)/;
  const GRID_WORDS = ["左上","中上","右上","左中","中中","右中","左下","中下","右下"];

  // 提取风格提示词的辅助函数：确保不以句号结尾时补一个句号分隔
  function joinStylePrefix(prefix, rest) {
    prefix = String(prefix || "").trim();
    rest = String(rest || "").trim();
    if (!prefix) return rest;
    if (!rest) return prefix;
    if (/[。.]$/.test(prefix)) return prefix + rest;
    return prefix + "。" + rest;
  }

  // 方案1：按"第N个镜头，"切分（新格式 V2.4，每格独立序号）
  const lensMarkerRe = /第[一二三四五六七八九十\d]+个镜头\s*[,，]\s*/g;
  const lensMatches = [...text.matchAll(lensMarkerRe)];
  if (lensMatches.length >= 2) {
    // 风格提示词 = 第一个"第N个镜头，"之前的全部内容
    const stylePrefix = text.substring(0, lensMatches[0].index).trim();

    const prompts = [];
    const lengths = [];
    for (let idx = 0; idx < lensMatches.length; idx++) {
      const start = lensMatches[idx][0].length + lensMatches[idx].index;
      const end = idx + 1 < lensMatches.length ? lensMatches[idx + 1].index : text.length;
      let segment = text.substring(start, end).trim();

      segment = segment.replace(/[。，.,\s]+$/, "").trim();
      if (!segment) { prompts.push(""); lengths.push(null); continue; }

      // 先提取时长标记（必须在拼接风格提示词之前）
      let duration = null;
      const head = segment.substring(0, Math.min(30, segment.length));
      const durMatch = DURATION_RE.exec(head);
      if (durMatch) {
        duration = parseFloat(durMatch[1]);
        segment = segment.substring(0, durMatch.index) + segment.substring(durMatch.index + durMatch[0].length);
        segment = segment.replace(/[,，]{2,}/, "，").trim();
      }

      // 第一个镜头：时长提取完成后再把风格提示词拼到前面
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

  // 方案2：旧格式兼容 - 剥离"第N个镜头（对应...）："前缀后按宫格位置标注切分
  let lensMarker = /第[一二三四五六七八九十\d]+个镜头(?:[\uff08(][^\uff09)]*[\uff09)]|[(][^)]*[)])?\s*[\uff1a:：]\s*/;
  let lensMatchIdx = text.search(lensMarker);
  let stylePrefixV2 = "";  // 旧格式下保存风格提示词
  if (lensMatchIdx >= 0) {
    stylePrefixV2 = text.substring(0, lensMatchIdx).trim();  // 保存风格提示词
    text = text.substring(text.match(lensMarker)[0].length);
  }

  const gridRe = new RegExp("(?:" + GRID_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|") + ")\\s*[,\\uff0c:：]\\s*", "g");

  const matches = [...text.matchAll(gridRe)];
  if (!matches.length) return { prompts: [], lengths: [] };

  const prompts = [];
  const lengths = [];
  for (let idx = 0; idx < matches.length; idx++) {
    let start = matches[idx][0].length + matches[idx].index;
    let end = idx + 1 < matches.length ? matches[idx + 1].index : text.length;
    let segment = text.substring(start, end).trim();

    segment = segment.replace(/[\u3002.]+\s*$/, "").trim();
    if (!segment) { prompts.push(""); lengths.push(null); continue; }

    // 先提取时长标记（必须在拼接风格提示词之前）
    let duration = null;
    const durMatch = DURATION_RE.exec(segment.substring(0, 30));
    if (durMatch) {
      duration = parseFloat(durMatch[1]);
      segment = segment.substring(0, durMatch.index) + segment.substring(durMatch.index + durMatch[0].length);
      segment = segment.replace(/[,\\uFF0c]{2,}/, "\uFF0C").trim();
    }

    // 第一个格子：时长提取完成后再把风格提示词拼到前面
    if (idx === 0 && stylePrefixV2) {
      segment = joinStylePrefix(stylePrefixV2, segment);
    }

    if (segment) { prompts.push(segment); lengths.push(duration); }
  }

  return { prompts, lengths };
}

function parseNumberList(text) {
  return String(text || "")
    .split(/[,\\uFF0C|/\n]+/)
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function distributeLengths(weights, totalFrames, count) {
  if (!count) return [];
  weights = weights.slice(0, count);
  while (weights.length < count) weights.push(0);
  const sum = weights.reduce((acc, value) => acc + Math.max(0, value), 0);
  if (sum <= 0) {
    const base = Math.floor(totalFrames / count);
    const lengths = Array(count).fill(base);
    for (let i = 0; i < totalFrames - base * count; i++) lengths[i % count] += 1;
    return lengths.map((value) => Math.max(1, value));
  }
  const exact = weights.map((value) => Math.max(0, value) * totalFrames / sum);
  const lengths = exact.map((value) => Math.max(1, Math.floor(value)));
  let diff = totalFrames - lengths.reduce((acc, value) => acc + value, 0);
  if (diff > 0) {
    const order = exact.map((value, idx) => [idx, value - Math.floor(value)]).sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < diff; i++) lengths[order[i % count][0]] += 1;
  } else if (diff < 0) {
    const order = lengths.map((value, idx) => [idx, value]).sort((a, b) => b[1] - a[1]);
    while (diff < 0) {
      let changed = false;
      for (const [idx] of order) {
        if (lengths[idx] > 1) {
          lengths[idx] -= 1;
          diff += 1;
          changed = true;
          if (diff === 0) break;
        }
      }
      if (!changed) break;
    }
  }
  return lengths;
}

function resolveLengths(node, jsonLengths, count) {
  const totalFrames = Math.max(count, Math.round(getNumberValue(node, "duration_frames", 120) || 120));
  const manual = parseNumberList(getWidgetValue(node, "segment_lengths", ""));
  let lengths = manual.length ? manual.slice(0, count) : distributeLengths(jsonLengths.filter(Boolean), totalFrames, count);
  if (!lengths.length) lengths = distributeLengths([], totalFrames, count);
  while (lengths.length < count) lengths.push(1);
  lengths = lengths.slice(0, count).map((value) => Math.max(1, Math.round(value)));
  const diff = totalFrames - lengths.reduce((acc, value) => acc + value, 0);
  lengths[lengths.length - 1] = Math.max(1, lengths[lengths.length - 1] + diff);
  return lengths;
}

function backgroundPosition(col, row, cols, rows) {
  const x = cols <= 1 ? 50 : (col / (cols - 1)) * 100;
  const y = rows <= 1 ? 50 : (row / (rows - 1)) * 100;
  return `${x}% ${y}%`;
}

function renderPreview(node, container) {
  const mode = getWidgetValue(node, "parse_mode", "auto");
  const rawResponse = getWidgetValue(node, "llm_response", "");
  const parsed = parsePrompts(rawResponse, mode);
  const preview = getStoryboardPreview(node);
  const gridCap = preview?.cols && preview?.rows ? preview.cols * preview.rows : MAX_SHOTS;
  const countCap = Math.max(1, Math.min(MAX_SHOTS, gridCap));
  const count = Math.max(1, Math.min(countCap, Math.round(getNumberValue(node, "segment_count", 6) || 6)));
  const lengths = resolveLengths(node, parsed.lengths, count);
  const totalFrames = lengths.reduce((acc, value) => acc + value, 0);
  const fps = getNumberValue(node, "frame_rate", 24) || 24;

  container.innerHTML = "";
  const toolbar = document.createElement("div");
  toolbar.className = "ltx-auto-toolbar";

  const title = document.createElement("div");
  title.className = "ltx-auto-title";
  title.textContent = "\u81ea\u52a8\u65f6\u95f4\u7ebf\u9884\u89c8";
  toolbar.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "ltx-auto-meta";

  const chips = [
    `${count} \u4e2a\u5206\u955c`,
    `${totalFrames} \u5e27`,
    `${fps} fps`,
    preview?.url ? `${preview.cols}x${preview.rows} \u516d\u5bab\u683c` : "\u6682\u65e0\u56fe\u50cf\u9884\u89c8",
  ];
  for (const text of chips) {
    const chip = document.createElement("div");
    chip.className = "ltx-auto-chip";
    chip.textContent = text;
    meta.appendChild(chip);
  }

  const toggle = document.createElement("button");
  toggle.className = "ltx-auto-toggle";
  toggle.textContent = node._ltxAutoTextVisible ? "\u9690\u85cf\u6587\u672c" : "\u663e\u793a\u6587\u672c";
  toggle.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    node._ltxAutoTextVisible = !node._ltxAutoTextVisible;
    updateTextWidgetVisibility(node);
    renderPreview(node, container);
    node.setDirtyCanvas?.(true, true);
  };
  meta.appendChild(toggle);
  toolbar.appendChild(meta);
  container.appendChild(toolbar);

  const timeline = document.createElement("div");
  timeline.className = "ltx-auto-timeline";
  const colors = ["#4f6f9f", "#7a6aa8", "#9a5f75", "#8a6c38", "#4d7b61", "#4e787e"];
  lengths.forEach((length, idx) => {
    const segment = document.createElement("div");
    segment.className = "ltx-auto-segment";
    segment.style.flex = `${Math.max(1, length)} 1 0`;
    segment.style.background = colors[idx % colors.length];
    segment.textContent = `${idx + 1} / ${length}`;
    timeline.appendChild(segment);
  });
  container.appendChild(timeline);

  if (!rawResponse && getOriginNodeFromInput(node, "llm_response")) {
    const empty = document.createElement("div");
    empty.className = "ltx-auto-empty";
    empty.textContent = "GPT \u5206\u955c\u6587\u672c\u5df2\u8fde\u63a5\u3002\u771f\u6b63\u8fd0\u884c\u65f6\u4f1a\u89e3\u6790\u5b83\uff1b\u5982\u679c\u60f3\u5728\u7f16\u8f91\u65f6\u9884\u89c8\u6587\u5b57\uff0c\u53ef\u4ee5\u70b9\u51fb\u201c\u663e\u793a\u6587\u672c\u201d\u540e\u7c98\u8d34\u4e00\u6bb5\u793a\u4f8b JSON\u3002";
    container.appendChild(empty);
  }

  const grid = document.createElement("div");
  grid.className = "ltx-auto-grid";
  for (let idx = 0; idx < count; idx++) {
    const shot = document.createElement("div");
    shot.className = "ltx-auto-shot";

    if (preview?.url) {
      const thumb = document.createElement("div");
      thumb.className = "ltx-auto-thumb";
      thumb.dataset.index = String(idx + 1);
      const col = idx % preview.cols;
      const row = Math.floor(idx / preview.cols);
      thumb.style.backgroundImage = `url("${preview.url}")`;
      thumb.style.backgroundSize = `${preview.cols * 100}% ${preview.rows * 100}%`;
      thumb.style.backgroundPosition = backgroundPosition(col, row, preview.cols, preview.rows);
      shot.appendChild(thumb);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "ltx-auto-placeholder";
      placeholder.textContent = `\u5206\u955c ${idx + 1}`;
      shot.appendChild(placeholder);
    }

    const body = document.createElement("div");
    body.className = "ltx-auto-shot-body";
    const head = document.createElement("div");
    head.className = "ltx-auto-shot-head";
    const name = document.createElement("span");
    name.textContent = `\u5206\u955c ${idx + 1}`;
    const len = document.createElement("span");
    len.textContent = `${lengths[idx] || 0}f`;
    head.appendChild(name);
    head.appendChild(len);
    body.appendChild(head);

    const prompt = document.createElement("div");
    prompt.className = "ltx-auto-prompt";
    prompt.textContent = parsed.prompts[idx] || "\u5c1a\u672a\u89e3\u6790\u5230\u63d0\u793a\u8bcd\u3002";
    body.appendChild(prompt);
    shot.appendChild(body);
    grid.appendChild(shot);
  }
  container.appendChild(grid);
}

function updateTextWidgetVisibility(node) {
  hideWidget(getWidget(node, "llm_response"), !node._ltxAutoTextVisible);
  hideWidget(getWidget(node, "global_prompt"), !node._ltxAutoTextVisible);
}

function hookWidget(node, name, render) {
  const widget = getWidget(node, name);
  if (!widget || widget._ltxAutoHooked) return;
  const original = widget.callback;
  widget.callback = (...args) => {
    const result = original?.apply(widget, args);
    render();
    return result;
  };
  widget._ltxAutoHooked = true;
}

app.registerExtension({
  name: "Comfy.SF-LTXAutoDirector.Preview",
  async nodeCreated(node) {
    if (node.comfyClass !== "SF-LTXAutoDirector") return;

    ensureStyles();
    node._ltxAutoTextVisible = false;
    node.size[0] = Math.max(node.size[0] || 0, 920);
    applyChineseLabels(node);

    const countWidget = getWidget(node, "segment_count");
    if (countWidget) {
      countWidget.value = Math.max(1, Math.min(MAX_SHOTS, Math.round(Number(countWidget.value) || 6)));
      countWidget.max = MAX_SHOTS;
      if (countWidget.options) countWidget.options.max = MAX_SHOTS;
    }

    const container = document.createElement("div");
    container.className = "ltx-auto-preview";

    const widget = node.addDOMWidget("auto_director_preview", "auto_director_preview", container, {
      serialize: false,
      getValue: () => "",
      setValue: () => {},
    });
    widget.computeSize = function(width) {
      const count = Math.max(1, Math.min(MAX_SHOTS, Math.round(getNumberValue(node, "segment_count", 6) || 6)));
      const rows = Math.ceil(count / 3);
      return [width, 104 + rows * 132];
    };

    const widgetIdx = node.widgets.indexOf(widget);
    if (widgetIdx > 0) {
      node.widgets.splice(widgetIdx, 1);
      node.widgets.unshift(widget);
    }

    const render = () => {
      try {
        applyChineseLabels(node);
        updateTextWidgetVisibility(node);
        renderPreview(node, container);
        node.setDirtyCanvas?.(true, false);
      } catch (err) {
        console.error("[LTX Auto Director] preview render failed:", err);
      }
    };

    [
      "llm_response",
      "global_prompt",
      "segment_count",
      "duration_frames",
      "segment_lengths",
      "guide_strength",
      "frame_rate",
      "parse_mode",
      "custom_width",
      "custom_height",
    ].forEach((name) => hookWidget(node, name, render));

    const originalOnConnectionsChange = node.onConnectionsChange;
    node.onConnectionsChange = function(...args) {
      const result = originalOnConnectionsChange?.apply(this, args);
      setTimeout(render, 0);
      return result;
    };

    const originalOnConfigure = node.onConfigure;
    node.onConfigure = function(info) {
      const result = originalOnConfigure?.apply(this, arguments);
      setTimeout(render, 0);
      return result;
    };

    setTimeout(render, 0);
  },
});
