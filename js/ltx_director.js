const { app } = window.comfyAPI.app;
const { api } = window.comfyAPI.api;

// --- UI Constants & Configuration ---
const RULER_HEIGHT = 24;
const BLOCK_HEIGHT = 160; // Increased to make the image timeline area much taller
const AUDIO_TRACK_HEIGHT = 80;
const CANVAS_HEIGHT = RULER_HEIGHT + BLOCK_HEIGHT + AUDIO_TRACK_HEIGHT;
const HANDLE_HIT_PX = 14;
const MIN_SEGMENT_LENGTH = 6;
const MAX_THUMBNAIL_DIM = 512; // Increased to maintain quality for taller images

const HIDDEN_WIDGET_NAMES = ["timeline_data", "local_prompts", "segment_lengths", "guide_strength", "audio_data", "use_custom_audio", "resize_method"];

const ZH = {
  addImage: "\u6dfb\u52a0\u56fe\u7247",
  autoFillGrid: "\u81ea\u52a8\u586b\u5145\u5bab\u683c",
  autoFillGridTitle: "\u4ece\u5df2\u8fde\u63a5\u7684\u5bab\u683c\u5206\u955c\u56fe\u521b\u5efa 4/6/9 \u4e2a\u53ef\u7f16\u8f91\u65f6\u95f4\u7ebf\u7247\u6bb5\u3002",
  syncText: "\u540c\u6b65\u6587\u672c",
  syncTextTitle: "\u5c06\u5df2\u8fd0\u884c\u7684 GPT response \u540c\u6b65\u5230\u5f53\u524d\u5bab\u683c\u5206\u955c\u6587\u672c\uff0c\u4fdd\u7559\u624b\u52a8\u4fee\u6539\u3002",
  addAudio: "\u6dfb\u52a0\u97f3\u9891",
  addText: "\u6dfb\u52a0\u6587\u5b57",
  delete: "\u5220\u9664",
  start: "\u5f00\u59cb",
  end: "\u7ed3\u675f",
  settings: "\u8bbe\u7f6e",
  customAudioOff: "\u81ea\u5b9a\u4e49\u97f3\u9891\uff1a\u5173",
  customAudioOn: "\u81ea\u5b9a\u4e49\u97f3\u9891\uff1a\u5f00",
  toggleCustomAudio: "\u5f00\u5173\u81ea\u5b9a\u4e49\u97f3\u9891\u8f93\u51fa",
  help: "\u5e2e\u52a9 / \u6587\u6863",
  promptPlaceholder: "\u8f93\u5165\u5f53\u524d\u5206\u955c\u63d0\u793a\u8bcd...",
  playPauseAudio: "\u64ad\u653e/\u6682\u505c\u97f3\u9891",
  toggleLoop: "\u5faa\u73af\u64ad\u653e",
  zoomOut: "\u7f29\u5c0f",
  zoomLevel: "\u7f29\u653e\u7ea7\u522b",
  zoomIn: "\u653e\u5927",
  zoomFit: "\u9002\u914d\u6574\u6761\u65f6\u95f4\u7ebf",
  guideStrength: "\u5f15\u5bfc\u5f3a\u5ea6\uff1a",
  frameSuffix: " \u5e27",
  file: "\u6587\u4ef6",
  unknown: "\u672a\u77e5",
  length: "\u957f\u5ea6",
  outputLength: "\u8f93\u51fa\u957f\u5ea6",
  trimIn: "\u88c1\u5165",
  trimOut: "\u88c1\u51fa",
  noPrompt: "(\u65e0\u63d0\u793a\u8bcd)",
  dropToPlace: "\u62d6\u653e\u5230\u6b64\u5904",
  dropAudio: "\u62d6\u653e\u97f3\u9891",
  audioTrack: "\u97f3\u9891\u8f68\u9053",
  copyImage: "\u590d\u5236\u56fe\u7247",
  saveImage: "\u4fdd\u5b58\u56fe\u7247",
  openImage: "\u65b0\u6807\u7b7e\u6253\u5f00\u56fe\u7247",
  copyPrompt: "\u590d\u5236\u63d0\u793a\u8bcd",
  copySegment: "\u590d\u5236\u7247\u6bb5",
  pasteReplace: "\u7c98\u8d34\u5e76\u66ff\u6362",
  pasteSegment: "\u7c98\u8d34\u7247\u6bb5",
  textSegment: "\u6587\u5b57\u7247\u6bb5",
  imageSegment: "\u56fe\u7247\u7247\u6bb5",
  timelineSettings: "\u65f6\u95f4\u7ebf\u8bbe\u7f6e",
  closeSettings: "\u5173\u95ed\u8bbe\u7f6e",
  frames: "\u5e27",
  seconds: "\u79d2",
  displayMode: "\u65f6\u95f4\u663e\u793a",
  epsilon: "\u5206\u6bb5\u8fb9\u754c\u9510\u5ea6",
  divisibleBy: "\u5c3a\u5bf8\u6574\u9664",
  imgCompression: "\u56fe\u50cf\u538b\u7f29",
  useGlobalPrompt: "\u4f7f\u7528\u5168\u5c40\u63d0\u793a\u8bcd",
  hideWidgets: "\u9690\u85cf\u8282\u70b9\u53c2\u6570",
  showWidgets: "\u663e\u793a\u8282\u70b9\u53c2\u6570",
};

function prNormalizeDisplayMode(value) {
  return value === "frames" || value === ZH.frames ? "frames" : "seconds";
}

function prDisplayModeValue(mode) {
  return mode === "frames" ? ZH.frames : ZH.seconds;
}

const SIX_GRID_INPUT_LABELS = {
  model: "\u6a21\u578b",
  clip: "\u6587\u672c\u7f16\u7801\u5668",
  storyboard_images: "\u5bab\u683c\u56fe\u50cf",
  grid_mode: "\u5bab\u683c\u6a21\u5f0f",
  shot_aspect: "\u5206\u955c\u6bd4\u4f8b",
  border_crop: "\u767d\u8fb9\u88c1\u526a\u5f3a\u5ea6",
  llm_response: "GPT \u5206\u955c\u6587\u672c",
  audio_vae: "\u97f3\u9891 VAE",
  optional_latent: "\u53ef\u9009\u6f5c\u7a7a\u95f4",
  global_prompt: "\u5168\u5c40\u63d0\u793a\u8bcd",
  duration_frames: "\u603b\u5e27\u6570",
  duration_seconds: "\u603b\u79d2\u6570",
  timeline_data: "\u65f6\u95f4\u7ebf\u6570\u636e",
  use_custom_audio: "\u4f7f\u7528\u81ea\u5b9a\u4e49\u97f3\u9891",
  local_prompts: "\u5206\u955c\u63d0\u793a\u8bcd",
  segment_lengths: "\u6bcf\u6bb5\u5e27\u6570",
  epsilon: "\u5206\u6bb5\u8fb9\u754c\u9510\u5ea6",
  frame_rate: "\u5e27\u7387",
  display_mode: "\u65f6\u95f4\u663e\u793a",
  guide_strength: "\u56fe\u50cf\u5f15\u5bfc\u5f3a\u5ea6",
  parse_mode: "\u6587\u672c\u89e3\u6790\u65b9\u5f0f",
  custom_width: "\u8f93\u51fa\u5bbd\u5ea6",
  custom_height: "\u8f93\u51fa\u9ad8\u5ea6",
  resize_method: "\u56fe\u50cf\u9002\u914d\u65b9\u5f0f",
  divisible_by: "\u5c3a\u5bf8\u6574\u9664",
  img_compression: "\u56fe\u50cf\u538b\u7f29",
};

const SIX_GRID_OUTPUT_LABELS = {
  model: "\u6a21\u578b",
  positive: "\u6b63\u5411\u6761\u4ef6",
  video_latent: "\u89c6\u9891\u6f5c\u7a7a\u95f4",
  audio_latent: "\u97f3\u9891\u6f5c\u7a7a\u95f4",
  guide_data: "\u5f15\u5bfc\u6570\u636e",
  frame_rate: "\u5e27\u7387",
  combined_audio: "\u5408\u6210\u97f3\u9891",
};

const SIX_GRID_COMBO_VALUE_LABELS = {
  grid_mode: {
    "2x2": "2x2 \u56db\u5bab\u683c",
    "2x2 \u56db\u5bab\u683c": "2x2 \u56db\u5bab\u683c",
    "\u56db\u5bab\u683c": "2x2 \u56db\u5bab\u683c",
    "3x2": "3x2 \u516d\u5bab\u683c",
    "2x3": "3x2 \u516d\u5bab\u683c",
    "3x2 \u516d\u5bab\u683c": "3x2 \u516d\u5bab\u683c",
    "2x3 \u516d\u5bab\u683c": "3x2 \u516d\u5bab\u683c",
    "\u516d\u5bab\u683c": "3x2 \u516d\u5bab\u683c",
    "3x3": "3x3 \u4e5d\u5bab\u683c",
    "3x3 \u4e5d\u5bab\u683c": "3x3 \u4e5d\u5bab\u683c",
    "\u4e5d\u5bab\u683c": "3x3 \u4e5d\u5bab\u683c",
  },
  shot_aspect: {
    auto: "\u81ea\u52a8 / \u4fdd\u6301\u5355\u683c\u6bd4\u4f8b",
    "\u81ea\u52a8": "\u81ea\u52a8 / \u4fdd\u6301\u5355\u683c\u6bd4\u4f8b",
    "\u81ea\u52a8 / \u4fdd\u6301\u5355\u683c\u6bd4\u4f8b": "\u81ea\u52a8 / \u4fdd\u6301\u5355\u683c\u6bd4\u4f8b",
    "16:9": "16:9 \u6a2a\u5c4f",
    "16:9 \u6a2a\u5c4f": "16:9 \u6a2a\u5c4f",
    "\u6a2a\u5c4f": "16:9 \u6a2a\u5c4f",
    "9:16": "9:16 \u7ad6\u5c4f",
    "9:16 \u7ad6\u5c4f": "9:16 \u7ad6\u5c4f",
    "\u7ad6\u5c4f": "9:16 \u7ad6\u5c4f",
    "1:1": "1:1 \u65b9\u56fe",
    "1:1 \u65b9\u56fe": "1:1 \u65b9\u56fe",
    "\u65b9\u56fe": "1:1 \u65b9\u56fe",
  },
  display_mode: {
    seconds: ZH.seconds,
    frames: ZH.frames,
  },
  parse_mode: {
    auto: "\u81ea\u52a8",
    json: "JSON",
    numbered_text: "\u7f16\u53f7\u6587\u672c",
  },
  resize_method: {
    "maintain aspect ratio": "\u4fdd\u6301\u6bd4\u4f8b",
    "stretch to fit": "\u62c9\u4f38\u586b\u6ee1",
    pad: "\u7559\u767d\u586b\u5145",
    crop: "\u88c1\u526a\u586b\u6ee1",
  },
};

const SIX_GRID_COMBO_CANONICAL_VALUES = {
  grid_mode: ["2x2 \u56db\u5bab\u683c", "3x2 \u516d\u5bab\u683c", "3x3 \u4e5d\u5bab\u683c"],
  shot_aspect: ["\u81ea\u52a8 / \u4fdd\u6301\u5355\u683c\u6bd4\u4f8b", "16:9 \u6a2a\u5c4f", "9:16 \u7ad6\u5c4f", "1:1 \u65b9\u56fe"],
  display_mode: [ZH.seconds, ZH.frames],
  parse_mode: ["\u81ea\u52a8", "JSON", "\u7f16\u53f7\u6587\u672c"],
  resize_method: ["\u4fdd\u6301\u6bd4\u4f8b", "\u62c9\u4f38\u586b\u6ee1", "\u7559\u767d\u586b\u5145", "\u88c1\u526a\u586b\u6ee1"],
};

function hideWidget(w) {
  if (!w) return;
  if (!w._origType && w.type !== "hidden") w._origType = w.type;
  // We don't set w.type = "hidden" anymore because it causes rendering issues in Nodes 2.0.
  // Instead we use the computeSize = () => [0,0] trick which works in both V1 and V2.
  w.hidden = true;
  if (!w.options) w.options = {};
  w.options.hidden = true;
  w.computeSize = () => [0, 0];
  if (w.element) w.element.style.display = "none";
}

function prHideSixGridInternalWidgets(node) {
  if (!prIsSixGridDirector(node)) return;
  for (const w of node.widgets || []) {
    if (HIDDEN_WIDGET_NAMES.includes(w.name)) hideWidget(w);
  }
}

function prRepairNumberWidget(node, name, fallback, min = null, max = null, integer = false) {
  const widget = prGetWidget(node, name);
  if (!widget) return fallback;
  let value = Number(widget.value);
  const invalid =
    !Number.isFinite(value) ||
    (min !== null && value < min) ||
    (max !== null && value > max);
  if (invalid) value = fallback;
  if (integer) value = Math.round(value);
  widget.value = value;
  return value;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// --- Modern Dark/Grey UI CSS (ComfyUI Match) ---
const STYLES = `
  .pr-wrapper {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding-bottom: 4px;
  }
  .pr-wrapper.drag-active {
    outline: 2px dashed #888;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
  }
  .pr-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 0px;
    flex-wrap: wrap;
    gap: 6px;
  }
  .pr-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .pr-btn {
    background: #222;
    color: #e0e0e0;
    border: 1px solid #111;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }
  .pr-btn:hover {
    background: #333;
    border-color: #555;
  }
  .pr-btn-danger:hover {
    background: #4a1515;
    border-color: #cc4444;
    color: #ffaaaa;
  }
  .pr-canvas {
    border-radius: 6px;
    border: 1px solid #111;
    background: #2a2a2a;
    cursor: pointer;
    width: 100%;
    outline: none;
    display: block; /* Ensure no inline baseline gaps */
  }
  .pr-prop-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1; /* Automatically scales to fill node height */
    min-height: 40px;
  }
  .pr-prompt-area {
    width: 100%;
    height: 100%;
    background: #222;
    color: #e0e0e0;
    border: 1px solid #111;
    border-radius: 6px;
    padding: 8px;
    resize: none; /* Removed the manual resize corner handle */
    font-size: 12px;
    line-height: 1.4;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s ease;
  }
  .pr-prompt-area:focus {
    border-color: #888;
  }
  .pr-audio-info {
    width: 100%;
    height: 100%;
    background: #181818;
    color: #aaa;
    border: 1px solid #111;
    border-radius: 6px;
    padding: 10px;
    font-size: 12px;
    line-height: 1.6;
    box-sizing: border-box;
    display: none;
  }
  .pr-audio-info span { color: #fff; font-weight: 500; }
  .pr-controls-group {
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 6px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 4px;
    box-sizing: border-box;
    width: 100%;
  }
  .pr-strength-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
  }
  .pr-height-resizer {
    height: 6px;
    background: #2a2a2a;
    cursor: ns-resize;
    border-radius: 3px;
    margin: 2px 0;
    transition: background 0.15s;
    border: 1px solid #1e1e1e;
  }
  .pr-height-resizer:hover {
    background: #444;
    border-color: #555;
  }
  .pr-strength-label {
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
    margin-left: auto;
  }
  .pr-strength-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 80px;
    height: 4px;
    background: #444;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    border: 1px solid #222;
  }
  .pr-strength-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #aaa;
    cursor: pointer;
  }
  .pr-strength-slider:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .pr-strength-input {
    font-size: 12px;
    color: #fff;
    background: #222;
    border: 1px solid #444;
    border-radius: 4px;
    width: 52px;
    text-align: center;
    padding: 3px;
  }
  .pr-strength-input::-webkit-outer-spin-button,
  .pr-strength-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .pr-strength-input[type=number] {
    -moz-appearance: textfield;
  }
  .pr-strength-input:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .pr-gap-menu {
    position: fixed;
    background: #1e1e1e;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 9999;
    box-shadow: 0 4px 16px rgba(0,0,0,0.6);
  }
  .pr-gap-menu-btn {
    background: #2a2a2a;
    color: #e0e0e0;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 6px 14px;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: background 0.15s ease;
  }
  .pr-gap-menu-btn:hover {
    background: #3a3a3a;
    border-color: #666;
  }
  .pr-player-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 2px 0;
    flex-wrap: wrap;
    width: 100%;
  }
  .pr-icon-btn {
    background: #2a2a2a;
    border: 1px solid #444;
    color: #eee;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .pr-icon-btn * {
    pointer-events: none;
  }
  .pr-icon-btn:hover {
    color: #fff;
    background: #3a3a3a;
    border-color: #666;
  }
  .pr-icon-btn.active {
    color: #4fff8f;
    border-color: #4fff8f;
    background: #1a3a2a;
  }
  .pr-seek-bar {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background: #444;
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    border: 1px solid #222;
  }
  .pr-seek-bar::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ff4444;
    cursor: pointer;
    border: 2px solid #222;
  }
  .pr-timeline-viewport {
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
  }
  .pr-timeline-viewport::-webkit-scrollbar {
    height: 10px;
  }
  .pr-timeline-viewport::-webkit-scrollbar-track {
    background: #151515;
    border-radius: 5px;
  }
  .pr-timeline-viewport::-webkit-scrollbar-thumb {
    background: #444
    border-radius: 5px;
    border: 1px solid #000;
  }
  .pr-timeline-viewport::-webkit-scrollbar-thumb:hover {
    background: #666
    border-color: #000;
  }
  .pr-zoom-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 12px;
  }
  .pr-zoom-slider {
    width: 80px;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: #444;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  .pr-zoom-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #aaa;
    cursor: pointer;
  }
  .pr-right-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .pr-segment-bounds {
    font-size: 12px;
    color: #aaa;
    font-family: monospace;
  }
  .pr-timecode {
    font-size: 14px;
    font-weight: bold;
    color: #e0e0e0;
    font-family: monospace;
  }
  .pr-settings-menu {
    position: fixed;
    background: #1e1e1e;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.7);
    min-width: 220px;
  }
  .pr-settings-title {
    font-size: 11px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding-bottom: 4px;
    border-bottom: 1px solid #333;
    margin-bottom: 2px;
  }
  .pr-settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .pr-settings-label {
    font-size: 12px;
    color: #bbb;
    flex: 1;
    white-space: nowrap;
  }
  .pr-number-control {
    display: flex;
    align-items: center;
    border: 1px solid #444;
    border-radius: 4px;
    background: #2a2a2a;
    overflow: hidden;
  }
  .pr-number-btn {
    background: #333;
    color: #aaa;
    border: none;
    width: 20px;
    height: 22px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    user-select: none;
  }
  .pr-number-btn:hover {
    background: #444;
    color: #fff;
  }
  .pr-settings-input {
    background: transparent;
    color: #e0e0e0;
    border: none;
    padding: 0 4px;
    font-size: 12px;
    width: 50px;
    height: 22px;
    text-align: center;
    font-family: monospace;
    outline: none;
    -moz-appearance: textfield;
  }
  .pr-settings-input::-webkit-outer-spin-button,
  .pr-settings-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .pr-settings-select {
    background: #2a2a2a;
    color: #e0e0e0;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 3px 4px;
    font-size: 12px;
    width: 98px;
    cursor: pointer;
  }
  .pr-settings-divider {
    border: none;
    border-top: 1px solid #2a2a2a;
    margin: 2px 0;
  }
  .pr-settings-toggle-btn {
    width: 100%;
    background: #252525;
    color: #aaa;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 11px;
    cursor: pointer;
    text-align: center;
    transition: all 0.15s;
  }
  .pr-settings-toggle-btn:hover {
    background: #2e2e2e;
    color: #ccc;
    border-color: #555;
  }
  .pr-settings-close-btn {
    background: transparent;
    color: #888;
    border: none;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.15s;
  }
  .pr-settings-close-btn:hover {
    color: #fff;
    background: rgba(255,255,255,0.1);
  }
  .pr-segmented-control {
    display: flex;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 2px;
    width: 110px;
    height: 22px;
    align-items: center;
    box-sizing: border-box;
  }
  .pr-segment {
    flex: 1;
    text-align: center;
    font-size: 10px;
    font-weight: 500;
    line-height: 18px;
    cursor: pointer;
    border-radius: 4px;
    color: #888;
    transition: all 0.15s ease;
  }
  .pr-segment.active {
    background: #333;
    color: #fff;
  }
  .pr-segment:hover:not(.active) {
    color: #ccc;
  }
`;

if (!document.getElementById("prompt-relay-styles")) {
  const styleEl = document.createElement("style");
  styleEl.id = "prompt-relay-styles";
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

// --- Icons ---
const ICONS = {
  upload: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
  audio: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`,
  trash: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  text: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`,
  play: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  pause: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`,
  loop: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path><polyline points="3 3 3 8 8 8"></polyline><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path><polyline points="21 21 21 16 16 16"></polyline></svg>`,
  minus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  fit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><polyline points="8 7 3 12 8 17"></polyline><polyline points="16 7 21 12 16 17"></polyline></svg>`,
  gear: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
  close: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
};

const SIX_GRID_MAX_SEGMENTS = 9;

function prGetWidget(node, name) {
  return node.widgets?.find((w) => w.name === name);
}

function prGetWidgetValue(node, name, fallback = "") {
  const widget = prGetWidget(node, name);
  return widget?.value ?? fallback;
}

function prGetWidgetValueAny(node, names, index, fallback = "") {
  for (const name of names || []) {
    const value = prGetWidgetValue(node, name, undefined);
    if (value !== undefined && value !== null && value !== "") return value;
  }

  const widgetValue = node?.widgets?.[index]?.value;
  if (widgetValue !== undefined && widgetValue !== null && widgetValue !== "") return widgetValue;

  const serializedValues = node?.widgets_values || node?.widgetsValues || node?.widget_values;
  const serializedValue = Array.isArray(serializedValues) ? serializedValues[index] : undefined;
  if (serializedValue !== undefined && serializedValue !== null && serializedValue !== "") return serializedValue;

  return fallback;
}

function prTextValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return "";
  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value || "").trim();
  }
}

function prReadWidgetTextByName(node, names = []) {
  const wanted = new Set(names.map((name) => String(name).toLowerCase()));
  for (const widget of node?.widgets || []) {
    const name = String(widget?.name || "").toLowerCase();
    const label = String(widget?.label || "").toLowerCase();
    if (!wanted.has(name) && !wanted.has(label)) continue;
    const text = prTextValue(widget.value);
    if (text) return text;
  }
  return "";
}

function prReadSerializedWidgetText(node, index = 0) {
  const serializedValues = node?.widgets_values || node?.widgetsValues || node?.widget_values;
  if (!Array.isArray(serializedValues)) return "";
  return prTextValue(serializedValues[index]);
}

function prLooksLikeTextDisplayNode(node) {
  const nodeType = String(node?.type || node?.comfyClass || "").toLowerCase();
  const title = String(node?.title || node?.properties?.["Node name for S&R"] || "").toLowerCase();
  const combined = `${nodeType} ${title}`;
  return /(show|display|preview|anything|note|text|string)/i.test(combined);
}

function prReadTextFromConnectedNode(node) {
  if (!node) return "";
  const preferredNames = [
    "output", "text", "string", "strings", "response", "result", "message",
    "anything", "value", "\u8f93\u51fa", "\u6587\u672c", "\u5185\u5bb9", "\u7ed3\u679c",
  ];
  const namedText = prReadWidgetTextByName(node, preferredNames);
  if (namedText) return namedText;

  if (prLooksLikeTextDisplayNode(node)) {
    for (const widget of node.widgets || []) {
      const text = prTextValue(widget?.value);
      if (text) return text;
    }
    const serializedText = prReadSerializedWidgetText(node, 0);
    if (serializedText) return serializedText;
  }
  return "";
}

function prGetConnectedInputText(node, inputName, fallback = "") {
  const origin = prGetOriginNode(node, inputName);
  const originText = prReadTextFromConnectedNode(origin);
  if (originText) return originText;

  const direct = prTextValue(prGetWidgetValue(node, inputName, ""));
  if (direct) return direct;

  return prTextValue(fallback);
}

function prCloneTimelineForPreview(segments = []) {
  return (segments || []).map((seg) => {
    const {
      imgObj,
      imageB64,
      audioBuffer,
      audioB64,
      decodedAudioBuffer,
      ...rest
    } = seg || {};
    return { ...rest };
  });
}

function prSegmentForTimelineSave(seg = {}) {
  const { imgObj, ...rest } = seg;
  if (rest.source === "storyboard_images") {
    delete rest.imageB64;
  }
  return rest;
}

function prNormalizeImageWidgetValue(value) {
  if (!value) return { filename: "", subfolder: "", type: "" };
  if (typeof value === "object") {
    return {
      filename: value.filename || value.name || value.image || value.path || "",
      subfolder: value.subfolder || "",
      type: value.type || "",
    };
  }
  return { filename: String(value), subfolder: "", type: "" };
}

const SIX_GRID_NODE_TYPES = ["SF-LTXGridDirector"];
const BORDER_CROP_BASE_FRACTION = 0.015;

function prIsSixGridDirector(node) {
  return SIX_GRID_NODE_TYPES.includes(node?.comfyClass) || SIX_GRID_NODE_TYPES.includes(node?.type);
}

function prSetLiteGraphLabel(item, label) {
  if (!item || !label) return;
  item.label = label;
  item.localized_name = label;
  if (item.options) {
    item.options.label = label;
    item.options.display_name = label;
  }
}

function prApplySixGridChineseLabels(node) {
  if (!prIsSixGridDirector(node)) return;
  node.title = node.title || "SF-LTX \u5bab\u683c\u5bfc\u6f14\u53f0";
  for (const input of node.inputs || []) {
    prSetLiteGraphLabel(input, SIX_GRID_INPUT_LABELS[input.name]);
  }
  for (const output of node.outputs || []) {
    prSetLiteGraphLabel(output, SIX_GRID_OUTPUT_LABELS[output.name]);
  }
  for (const widget of node.widgets || []) {
    prSetLiteGraphLabel(widget, SIX_GRID_INPUT_LABELS[widget.name]);
    const valueLabels = SIX_GRID_COMBO_VALUE_LABELS[widget.name];
    if (valueLabels) {
      if (!widget.options) widget.options = {};
      widget.options.values = SIX_GRID_COMBO_CANONICAL_VALUES[widget.name] || Array.from(new Set(Object.values(valueLabels)));
      if (Object.prototype.hasOwnProperty.call(valueLabels, widget.value)) {
        widget.value = valueLabels[widget.value];
      }
    }
  }
  node.setDirtyCanvas?.(true, true);
}

function prRepairSixGridWidgetValues(node) {
  if (!prIsSixGridDirector(node)) return;

  const gridModeWidget = prGetWidget(node, "grid_mode");
  if (gridModeWidget && !SIX_GRID_COMBO_CANONICAL_VALUES.grid_mode.includes(gridModeWidget.value)) {
    gridModeWidget.value = SIX_GRID_COMBO_VALUE_LABELS.grid_mode[gridModeWidget.value] || "3x2 \u516d\u5bab\u683c";
  }

  const shotAspectWidget = prGetWidget(node, "shot_aspect");
  if (shotAspectWidget && !SIX_GRID_COMBO_CANONICAL_VALUES.shot_aspect.includes(shotAspectWidget.value)) {
    shotAspectWidget.value = SIX_GRID_COMBO_VALUE_LABELS.shot_aspect[shotAspectWidget.value] || "\u81ea\u52a8 / \u4fdd\u6301\u5355\u683c\u6bd4\u4f8b";
  }

  const resizeMethodWidget = prGetWidget(node, "resize_method");
  if (resizeMethodWidget && !SIX_GRID_COMBO_CANONICAL_VALUES.resize_method.includes(resizeMethodWidget.value)) {
    resizeMethodWidget.value = SIX_GRID_COMBO_VALUE_LABELS.resize_method[resizeMethodWidget.value] || "\u4fdd\u6301\u6bd4\u4f8b";
  }

  const durationFrames = prRepairNumberWidget(node, "duration_frames", 120, 1, 10000, true);
  const frameRate = prRepairNumberWidget(node, "frame_rate", 24, 1, 240, false);

  const durationSecondsWidget = prGetWidget(node, "duration_seconds");
  const durationSeconds = Number(durationSecondsWidget?.value);
  if (durationSecondsWidget && (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 1000)) {
    durationSecondsWidget.value = parseFloat((durationFrames / frameRate).toFixed(3));
  }

  prRepairNumberWidget(node, "custom_width", 0, 0, 8192, true);
  prRepairNumberWidget(node, "custom_height", 0, 0, 8192, true);
  prRepairNumberWidget(node, "divisible_by", 32, 1, 256, true);
  prRepairNumberWidget(node, "img_compression", 18, 0, 100, true);

  const epsilonWidget = prGetWidget(node, "epsilon");
  const epsilon = Number(epsilonWidget?.value);
  if (epsilonWidget && (!Number.isFinite(epsilon) || epsilon <= 0)) {
    epsilonWidget.value = 0.001;
  }

  const displayModeWidget = prGetWidget(node, "display_mode");
  if (displayModeWidget && !["seconds", "frames", ZH.seconds, ZH.frames].includes(displayModeWidget.value)) {
    displayModeWidget.value = ZH.seconds;
  }

  const guideStrengthWidget = prGetWidget(node, "guide_strength");
  if (guideStrengthWidget && (guideStrengthWidget.value === undefined || guideStrengthWidget.value === null || guideStrengthWidget.value === "")) {
    guideStrengthWidget.value = "1.0";
  }

  prRepairNumberWidget(node, "border_crop", 1.0, 0, 5, false);
}

function prGridDimensionsFromMode(value) {
  const mode = String(value || "");
  if (mode.includes("2x2") || mode.includes("\u56db\u5bab\u683c")) return { cols: 2, rows: 2 };
  if (mode.includes("3x3") || mode.includes("\u4e5d\u5bab\u683c")) return { cols: 3, rows: 3 };
  return { cols: 3, rows: 2 };
}

function prGetGridDimensions(node) {
  return prGridDimensionsFromMode(prGetWidgetValue(node, "grid_mode", "3x2 \u516d\u5bab\u683c"));
}

function prShotAspectRatioFromValue(value) {
  const mode = String(value || "");
  if (mode.includes("16:9") || mode.includes("\u6a2a\u5c4f")) return 16 / 9;
  if (mode.includes("9:16") || mode.includes("\u7ad6\u5c4f")) return 9 / 16;
  if (mode.includes("1:1") || mode.includes("\u65b9\u56fe")) return 1;
  return null;
}

function prGetShotCropOptions(node) {
  const rawStrength = Number(prGetWidgetValue(node, "border_crop", 1.0));
  return {
    targetRatio: prShotAspectRatioFromValue(prGetWidgetValue(node, "shot_aspect", "")),
    borderCropStrength: Math.max(0, Math.min(5, Number.isFinite(rawStrength) ? rawStrength : 1.0)),
  };
}

function prGridCropBounds(width, height, idx, cols, rows, borderCropStrength, targetRatio) {
  cols = Math.max(1, Math.round(Number(cols) || 1));
  rows = Math.max(1, Math.round(Number(rows) || 1));
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  const cellW = Math.max(1, Math.floor(width / cols));
  const cellH = Math.max(1, Math.floor(height / rows));
  let sx = col * cellW;
  let sy = row * cellH;
  let sx2 = sx + cellW;
  let sy2 = sy + cellH;
  const inset = Math.round(Math.min(cellW, cellH) * BORDER_CROP_BASE_FRACTION * borderCropStrength);
  if (inset > 0 && cellW > inset * 2 + 2 && cellH > inset * 2 + 2) {
    sx += inset;
    sx2 -= inset;
    sy += inset;
    sy2 -= inset;
  }

  if (targetRatio && targetRatio > 0) {
    const cropW = Math.max(1, sx2 - sx);
    const cropH = Math.max(1, sy2 - sy);
    const currentRatio = cropW / cropH;
    if (currentRatio > targetRatio) {
      const newW = Math.max(1, Math.round(cropH * targetRatio));
      const offset = Math.max(0, Math.floor((cropW - newW) / 2));
      sx += offset;
      sx2 = sx + newW;
    } else if (currentRatio < targetRatio) {
      const newH = Math.max(1, Math.round(cropW / targetRatio));
      const offset = Math.max(0, Math.floor((cropH - newH) / 2));
      sy += offset;
      sy2 = sy + newH;
    }
  }

  sx = Math.max(0, Math.min(width - 1, sx));
  sy = Math.max(0, Math.min(height - 1, sy));
  sx2 = Math.max(sx + 1, Math.min(width, sx2));
  sy2 = Math.max(sy + 1, Math.min(height, sy2));
  return { sx, sy, sw: Math.max(1, sx2 - sx), sh: Math.max(1, sy2 - sy) };
}

function prGetGraphLink(linkId) {
  if (linkId == null) return null;
  const links = app.graph?.links;
  if (!links) return null;
  if (links[linkId]) return links[linkId];
  if (Array.isArray(links)) return links.find((link) => link?.id === linkId || link?.[0] === linkId) || null;
  return null;
}

function prGetOriginNode(node, inputName) {
  const input = node.inputs?.find((item) => item.name === inputName);
  const link = prGetGraphLink(input?.link);
  if (!link) return null;
  const originId = link.origin_id ?? link.originId ?? link[1];
  return app.graph?.getNodeById?.(originId) || null;
}

function prIsLoadImageNode(node) {
  const nodeType = node?.type || node?.comfyClass || "";
  return nodeType === "LoadImage" || nodeType === "LoadImageMask" || !!prGetWidget(node, "image") || !!prGetWidget(node, "\u56fe\u50cf");
}

function prLoadImageUrl(loadNode) {
  const fileInfo = prNormalizeImageWidgetValue(prGetWidgetValueAny(loadNode, ["image", "\u56fe\u50cf"], 0, ""));
  const filename = fileInfo.filename;
  if (!filename) return "";
  const parts = String(filename).split(/[\\/]/);
  const base = parts.pop();
  const subfolder = fileInfo.subfolder || parts.join("/");
  const rawType = String(fileInfo.type || prGetWidgetValueAny(loadNode, ["type", "\u7c7b\u578b"], 1, "input") || "input").toLowerCase();
  const viewType = ["input", "output", "temp"].includes(rawType) ? rawType : "input";
  return api.apiURL(`/view?filename=${encodeURIComponent(base)}&type=${encodeURIComponent(viewType)}&subfolder=${encodeURIComponent(subfolder)}`);
}

function prGetSixGridSource(node) {
  const splitNode = prGetOriginNode(node, "storyboard_images");
  if (!splitNode) return null;
  const selectedGrid = prGetGridDimensions(node);

  if (prIsLoadImageNode(splitNode)) {
    return { cols: selectedGrid.cols, rows: selectedGrid.rows, url: prLoadImageUrl(splitNode) };
  }

  const imageLink = prGetGraphLink(splitNode.inputs?.[0]?.link);
  if (!imageLink) return { cols: selectedGrid.cols, rows: selectedGrid.rows, url: "" };
  const originId = imageLink.origin_id ?? imageLink.originId ?? imageLink[1];
  const imageNode = app.graph?.getNodeById?.(originId);
  if (!imageNode) return { cols: selectedGrid.cols, rows: selectedGrid.rows, url: "" };

  const url = prIsLoadImageNode(imageNode) ? prLoadImageUrl(imageNode) : "";
  if (!url) {
    console.warn("[LTX Grid Director] Could not resolve source image URL for grid preview.", {
      splitNodeId: splitNode.id,
      imageNodeId: imageNode.id,
      imageNodeType: imageNode.type || imageNode.comfyClass,
      widgets: imageNode.widgets?.map((w) => ({ name: w.name, value: w.value })),
      widgets_values: imageNode.widgets_values,
    });
  }
  return { cols: selectedGrid.cols, rows: selectedGrid.rows, url };
}

function prStripFence(text) {
  text = String(text || "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json|JSON)?\s*/, "").replace(/\s*```$/, "");
  }
  return text.trim();
}

function prFirstJson(text) {
  text = prStripFence(text);
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

function prCleanPrompt(prompt) {
  const numerals = "\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341";
  const marker = new RegExp(`^\\s*(?:\\u5206\\u955c|\\u955c\\u5934|\\u753b\\u9762|shot)\\s*[${numerals}\\d]+\\s*[:\\uff1a.\\-\\u3001]\\s*`, "i");
  return String(prompt || "").replace(marker, "").replace(/\s+/g, " ").trim();
}

function prPromptFromObject(item) {
  const keys = [
    "prompt", "description", "text", "content", "scene", "action",
    "\u52a8\u6001\u63cf\u8ff0", "\u63cf\u8ff0", "\u63d0\u793a\u8bcd", "\u753b\u9762",
  ];
  for (const key of keys) {
    if (item?.[key]) return String(item[key]).trim();
  }
  return Object.entries(item || {})
    .filter(([key, value]) => value && !["shot", "shot_id", "index", "id", "number", "frames", "duration_frames", "length", "seconds", "duration"].includes(key))
    .map(([, value]) => String(value).trim())
    .join("\uff0c");
}

function prShotKeyIndex(key) {
  const digit = String(key).match(/\d+/);
  if (digit) return Number(digit[0]);
  const numerals = "\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d";
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

// SF 扩展：解析带宫格位置标注+时长标注的单段连续文字
// 新格式(V2.4)：[风格提示词]。第一个镜头，左上，中景，4秒，[描述]。第二个镜头，右上，近景，3秒，[描述]...
// 旧格式(V2.3)：[风格提示词]。第一个镜头（对应...）：左上，中景，4秒，[描述]。右上，近景，3秒，[描述]...
// 返回 { prompts: [...], lengths: [帧数或null,...] }
// 注意：风格提示词会保留到第一个镜头的 prompt 前面，不被切掉
function prParseGridPositionText(text) {
  text = String(text || "").trim();
  if (!text) return { prompts: [], lengths: [] };

  // 剥离 markdown 围栏
  if (text.startsWith("```")) text = text.replace(/^```(?:json|JSON)?\s*/, "").replace(/\s*``$/, "");
  text = text.trim();
  if (!text) return { prompts: [], lengths: [] };

  const DURATION_RE = /(\d+(?:\.\d+)?)\s*(?:秒|s|S)/;
  const GRID_WORDS = ["左上", "中上", "右上", "左中", "中中", "右中", "左下", "中下", "右下"];

  // 提取风格提示词的辅助函数：确保不以句号结尾时补一个句号分隔
  function joinStylePrefix(prefix, rest) {
    prefix = String(prefix || "").trim();
    rest = String(rest || "").trim();
    if (!prefix) return rest;
    if (!rest) return prefix;
    // 如果 prefix 已以句号结尾，直接拼接；否则补一个中文句号
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

      // 去掉末尾句号/逗号
      segment = segment.replace(/[。，.,\s]+$/, "").trim();
      if (!segment) { prompts.push(""); lengths.push(null); continue; }

      // 先提取时长标记 "N秒，"（必须在拼接风格提示词之前，否则风格提示词会把时长推到30字符之外）
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
  const oldLensMarker = /第[一二三四五六七八九十\d]+个镜头(?:[\uff08(][^\uff09)]*[\uff09)]|[(][^)]*[)])?\s*[\uff1a:：]\s*/;
  const oldLensIdx = text.search(oldLensMarker);
  let stylePrefixV2 = "";  // 旧格式下保存风格提示词
  if (oldLensIdx >= 0) {
    stylePrefixV2 = text.substring(0, oldLensIdx).trim();  // 保存风格提示词
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

    // 先提取时长标记（必须在拼接风格提示词之前）
    let duration = null;
    const head = segment.substring(0, Math.min(30, segment.length));
    const durMatch = DURATION_RE.exec(head);
    if (durMatch) {
      duration = parseFloat(durMatch[1]);
      segment = segment.substring(0, durMatch.index) + segment.substring(durMatch.index + durMatch[0].length);
      segment = segment.replace(/[,，]{2,}/, "，").trim();
    }

    // 第一个格子：时长提取完成后再把风格提示词拼到前面
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

function prParsePrompts(text) {
  // SF 扩展：优先尝试宫格位置标注解析（"左上，中景，4秒，..."格式）
  const gridParsed = prParseGridPositionText(text);
  if (gridParsed.prompts.length > 1) {
    return gridParsed.prompts;
  }

  const data = prFirstJson(text);
  if (data) {
    let items = data;
    if (!Array.isArray(items) && typeof items === "object") {
      let found = null;
      for (const key of ["segments", "shots", "scenes", "storyboard", "\u5206\u955c", "\u955c\u5934"]) {
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
  const numerals = "\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341";
  const marker = new RegExp(`(?:^|\\n)\\s*(?:\\u5206\\u955c|\\u955c\\u5934|\\u753b\\u9762|shot)\\s*[${numerals}\\d]+\\s*[:\\uff1a.\\-\\u3001]\\s*`, "gi");
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

function prCollectStrings(value, out = []) {
  if (value == null) return out;
  if (typeof value === "string") {
    const text = value.trim();
    if (text) out.push(text);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) prCollectStrings(item, out);
    return out;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) prCollectStrings(item, out);
  }
  return out;
}

function prExtractTextFromExecutionOutput(output) {
  if (!output) return "";
  for (const key of ["response", "text", "string", "strings", "result", "message", "messages", "output"]) {
    const values = prCollectStrings(output[key], []);
    if (values.length) return values.join("\n").trim();
  }
  const values = prCollectStrings(output, [])
    .filter((text) => !/^https?:\/\//i.test(text) && !/\.(png|jpg|jpeg|webp|wav|mp3|mp4)$/i.test(text));
  if (!values.length) return "";
  values.sort((a, b) => b.length - a.length);
  return values[0].trim();
}

function prExecutionNodeId(detail) {
  return String(detail?.node ?? detail?.node_id ?? detail?.nodeId ?? detail?.id ?? "");
}

function prParseNumberList(text) {
  return String(text || "")
    .split(/[,\\uFF0C|/\n]+/)
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function prEvenLengths(totalFrames, count) {
  const base = Math.floor(totalFrames / count);
  const lengths = Array(count).fill(base);
  for (let i = 0; i < totalFrames - base * count; i++) lengths[i % count] += 1;
  return lengths.map((v) => Math.max(1, v));
}

function prResolveSegmentLengths(node, count, ignoreManual = false, promptText = "") {
  const totalFrames = Math.max(count, Math.round(Number(prGetWidgetValue(node, "duration_frames", 120)) || 120));
  const frameRate = Math.max(1, Math.round(Number(prGetWidgetValue(node, "frame_rate", 24)) || 24));

  // SF 扩展：优先从提示词中的"N秒"标注提取时长，转成帧数
  if (promptText) {
    const gridParsed = prParseGridPositionText(promptText);
    if (gridParsed.lengths && gridParsed.lengths.length >= count) {
      const secs = gridParsed.lengths.slice(0, count);
      // 仅当至少有一个非零时长才使用
      if (secs.some((v) => v && v > 0)) {
        const lengths = secs.map((v) => (v && v > 0 ? Math.max(1, Math.round(v * frameRate)) : 0));
        // 补齐缺失项
        for (let i = 0; i < lengths.length; i++) if (!lengths[i]) lengths[i] = 0;
        // 把零时长按平均分配剩余帧数
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
        // 修正总和与 totalFrames 的差值（截断或补齐）
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

function prImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    const sep = String(url).includes("?") ? "&" : "?";
    img.src = `${url}${sep}_ltx_preview=${Date.now()}`;
  });
}

function prSixGridSourceKey(source) {
  if (!source?.url) return "";
  return `${source.cols || 3}x${source.rows || 2}|${source.url}`;
}

// --- Data Models ---
function parseInitial(jsonStr) {
  let parsed = { segments: [], audioSegments: [] };
  try {
    if (jsonStr) {
      const p = JSON.parse(jsonStr);
      if (Array.isArray(p.segments)) parsed.segments = p.segments;
      if (Array.isArray(p.audioSegments)) parsed.audioSegments = p.audioSegments;
    }
  } catch (e) { }

  let currentStart = 0;
  for (let seg of parsed.segments) {
    if (seg.start === undefined) {
      seg.start = currentStart;
      currentStart += seg.length;
    }
    // Guarantee ID assignment to prevent node loading drag breaks
    if (!seg.id) {
      seg.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    }
    if (seg.source === "storyboard_images") {
      delete seg.imageB64;
      delete seg.imgObj;
    }
  }

  for (let seg of parsed.audioSegments) {
    if (!seg.id) {
      seg.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    }
    if (seg.trimStart === undefined) seg.trimStart = 0;
  }

  return parsed;
}

class TimelineEditor {
  constructor(node, container, domWidget) {
    this.node = node;
    this.container = container;
    this.domWidget = domWidget;

    // Track heights (dynamic)
    this.rulerHeight = RULER_HEIGHT;
    this.blockHeight = BLOCK_HEIGHT;
    this.audioTrackHeight = AUDIO_TRACK_HEIGHT;
    this.canvasHeight = CANVAS_HEIGHT;

    // Core data
    this.timeline = { segments: [], audioSegments: [] };
    this.selectionType = "image"; // "image" or "audio"
    this.selectedIndex = -1;

    // Interactions
    this._isDragging = false;
    this._dragType = null;
    this._dragStartX = 0;
    this._dragInitialTimeline = null;
    this.zoomLevel = 1.0;
    this._lastZoom = 1.0;
    this._lastScale = 1.0;
    this._dragTargetId = null;
    this._dragTargetIdRight = null;
    this._previewSegments = null;
    this._lastWidth = 0;
    this._hoveredGapIdx = -1;
    this._isHovering = false;

    // Playback state
    this.currentFrame = 0;
    this.isPlaying = false;
    this.isLooping = false;
    this.audioContext = null;
    this.activeAudioNodes = [];
    this.playbackStartTime = 0;
    this.playbackStartFrame = 0;
    this._playLoopId = null;

    // --- Ghost dragging state ---
    this._ghostSegmentId = null;
    this._ghostTrack = null;
    this._ghostInitialTimeline = null;

    // Attach to Python widgets
    this._gapMenu = null;         // Active gap popup menu element
    this._gapMenuDismisser = null;

    // Attach to Python widgets
    this.durationFramesWidget = this.node.widgets.find(w => w.name === "duration_frames");
    this.durationSecondsWidget = this.node.widgets.find(w => w.name === "duration_seconds");
    this.frameRateWidget = this.node.widgets.find(w => w.name === "frame_rate");
    this.timelineDataWidget = this.node.widgets.find(w => w.name === "timeline_data");
    this.localPromptsWidget = this.node.widgets.find(w => w.name === "local_prompts");
    this.segmentLengthsWidget = this.node.widgets.find(w => w.name === "segment_lengths");
    this.guideStrengthWidget = this.node.widgets.find(w => w.name === "guide_strength");
    this.displayModeWidget = this.node.widgets.find(w => w.name === "display_mode");
    this.llmResponseWidget = this.node.widgets.find(w => w.name === "llm_response");
    this._lastLLMResponse = this.getCurrentLLMText();
    this._lastLLMCheck = 0;
    this._lastSixGridSourceKey = "";
    this._lastSixGridCheck = 0;
    this._lastSixGridInputKey = "";
    this._lastGridCropKey = "";
    this._sixGridAutoRefreshTimer = null;
    this._sixGridAutoRefreshPending = false;
    this._sixGridPendingSource = null;
    this._sixGridPendingSourceKey = "";
    this._sixGridRefreshInFlight = false;
    this._sixGridPreviewImage = null;
    this._sixGridPreviewSource = null;
    this._sixGridPreviewSourceKey = "";
    this._sixGridPreviewLoad = null;

    this.timeline = parseInitial(this.timelineDataWidget?.value);
    this.loadImages();

    this.createDOM();
    if (this.timeline.segments.length > 0) {
      this.selectedIndex = 0;
    }
    this.updateUIFromSelection();
    this.commitChanges(true);
    // Hide settings widgets by default to reduce node clutter.
    // Deferred so all widget types are finalized before we touch them.
    setTimeout(() => this.hideSettingsWidgets(), 0);

    let isSyncing = false;

    const origDurationFramesCallback = this.durationFramesWidget?.callback;
    if (this.durationFramesWidget) {
      this.durationFramesWidget.callback = (...args) => {
        if (origDurationFramesCallback) origDurationFramesCallback.apply(this.durationFramesWidget, args);

        if (!isSyncing && this.durationSecondsWidget) {
          isSyncing = true;
          this.durationSecondsWidget.value = parseFloat((this.getDurationFrames() / this.getFrameRate()).toFixed(3));
          isSyncing = false;
        }

        this.commitChanges();
      };
    }

    const origDurationSecondsCallback = this.durationSecondsWidget?.callback;
    if (this.durationSecondsWidget) {
      this.durationSecondsWidget.callback = (...args) => {
        if (origDurationSecondsCallback) origDurationSecondsCallback.apply(this.durationSecondsWidget, args);

        if (!isSyncing && this.durationFramesWidget) {
          isSyncing = true;
          const newFrames = Math.max(1, Math.round(this.durationSecondsWidget.value * this.getFrameRate()));
          this.durationFramesWidget.value = newFrames;
          if (this.durationFramesWidget.callback) this.durationFramesWidget.callback(newFrames);
          isSyncing = false;
        }
      };
    }

    const origFrameRateCallback = this.frameRateWidget?.callback;
    if (this.frameRateWidget) {
      this.frameRateWidget.callback = (...args) => {
        if (origFrameRateCallback) origFrameRateCallback.apply(this.frameRateWidget, args);
        if (!isSyncing && this.durationSecondsWidget) {
          isSyncing = true;
          this.durationSecondsWidget.value = parseFloat((this.getDurationFrames() / this.getFrameRate()).toFixed(3));
          isSyncing = false;
        }
      };
    }

    const origDisplayModeCallback = this.displayModeWidget?.callback;
    if (this.displayModeWidget) {
      this.displayModeWidget.callback = (...args) => {
        if (origDisplayModeCallback) origDisplayModeCallback.apply(this.displayModeWidget, args);
        this.updateWidgetVisibility();
        this.updateUIFromSelection();
        this.render();
      };
      this.updateWidgetVisibility(); // Initial trigger
    }

    this.attachLLMResponseListeners();

    // Polling is much more reliable in Comfy than ResizeObserver due to scale transforms
    this._renderLoop = requestAnimationFrame(() => this.checkResize());
  }

  destroy() {
    cancelAnimationFrame(this._renderLoop);
    this.pauseAudio();
    if (this._sixGridAutoRefreshTimer) clearTimeout(this._sixGridAutoRefreshTimer);
    window.removeEventListener("keydown", this.handleKeyDown, true);
    window.removeEventListener("paste", this.handlePaste, true);
    if (this._onPromptExecuted) api.removeEventListener?.("executed", this._onPromptExecuted);
    if (this._onExecutionSuccess) api.removeEventListener?.("execution_success", this._onExecutionSuccess);
  }

  attachLLMResponseListeners() {
    if (!prIsSixGridDirector(this.node) || !api.addEventListener) return;
    this._onPromptExecuted = (event) => {
      const origin = prGetOriginNode(this.node, "llm_response");
      if (!origin) return;
      const detail = event?.detail || {};
      if (prExecutionNodeId(detail) !== String(origin.id)) return;
      const text = prExtractTextFromExecutionOutput(detail.output || detail.data?.output || detail);
      if (text) this.receiveLLMResponseText(text);
    };
    this._onExecutionSuccess = async (event) => {
      const origin = prGetOriginNode(this.node, "llm_response");
      const promptId = event?.detail?.prompt_id || event?.detail?.promptId;
      if (!origin || !promptId || !api.fetchApi) return;
      try {
        const response = await api.fetchApi(`/history/${promptId}`);
        const history = await response.json();
        const record = history?.[promptId] || Object.values(history || {})[0];
        const output = record?.outputs?.[String(origin.id)] || record?.outputs?.[origin.id];
        const text = prExtractTextFromExecutionOutput(output);
        if (text) this.receiveLLMResponseText(text);
      } catch (err) {
        console.warn("[LTX Grid Director] Could not read LLM response from history:", err);
      }
    };
    api.addEventListener("executed", this._onPromptExecuted);
    api.addEventListener("execution_success", this._onExecutionSuccess);
  }

  receiveLLMResponseText(text) {
    const cleanText = String(text || "").trim();
    if (!cleanText) return;
    this._lastLLMResponse = cleanText;
    if (this.llmResponseWidget) this.llmResponseWidget.value = cleanText;
    this.syncPromptsFromText(cleanText, { preserveManual: true, createMissing: true });
  }

  getCurrentLLMText() {
    if (!prIsSixGridDirector(this.node)) return String(this.llmResponseWidget?.value || "");
    return prGetConnectedInputText(this.node, "llm_response", this._lastLLMResponse || "");
  }

  checkConnectedLLMTextChange() {
    if (!prIsSixGridDirector(this.node)) return;
    const now = performance.now ? performance.now() : Date.now();
    if (now - this._lastLLMCheck < 1000) return;
    this._lastLLMCheck = now;

    const text = this.getCurrentLLMText();
    if (!text || text === this._lastLLMResponse) return;
    this.receiveLLMResponseText(text);
  }

  getDurationFrames() {
    return parseInt((this.durationFramesWidget && this.durationFramesWidget.value > 0) ? this.durationFramesWidget.value : 24, 10);
  }

  getFrameRate() {
    return parseInt((this.frameRateWidget && this.frameRateWidget.value > 0) ? this.frameRateWidget.value : 24, 10);
  }

  // Grow the timeline duration to fit `requiredFrames` if it is currently shorter.
  // The timeline only ever grows -never shrinks -through this method.
  growTimelineIfNeeded(requiredFrames) {
    const current = this.getDurationFrames();
    if (requiredFrames <= current) return; // already big enough

    const newFrames = Math.ceil(requiredFrames);
    if (this.durationFramesWidget) {
      this.durationFramesWidget.value = newFrames;
    }
    if (this.durationSecondsWidget) {
      this.durationSecondsWidget.value = parseFloat((newFrames / this.getFrameRate()).toFixed(3));
    }
    // Notify ComfyUI that the widget value changed so it serialises correctly.
    if (window.app && window.app.graph) {
      window.app.graph.setDirtyCanvas(true, true);
    }
  }

  // Returns the maximum allowed zoom level, computed so that at max zoom
  // the viewport shows exactly 4 seconds of the visual timeline.
  getMaxZoom() {
    const visualDurationSecs = this.getVisualDurationFrames() / this.getFrameRate();
    const baseMaxZoom = Math.max(1, visualDurationSecs / 4);

    // Limit max zoom to prevent canvas width from exceeding browser limits (causing crash)
    const viewportWidth = this.viewport ? this.viewport.clientWidth : 1000;
    const MAX_CANVAS_WIDTH = 32768; // Extended limit for modern browsers
    const limitMaxZoom = MAX_CANVAS_WIDTH / Math.max(1, viewportWidth);

    return Math.max(1, Math.min(baseMaxZoom, limitMaxZoom));
  }

  // Returns the visual timeline length in frames:
  // the furthest segment end (across both tracks) 脳 1.30, with a floor of getDurationFrames().
  // This is used for all rendering/positioning -the actual output duration is getDurationFrames().
  getVisualDurationFrames() {
    let furthest = 0;
    for (const seg of this.timeline.segments) {
      furthest = Math.max(furthest, seg.start + seg.length);
    }
    for (const seg of this.timeline.audioSegments) {
      furthest = Math.max(furthest, seg.start + seg.length);
    }
    const outputDuration = this.getDurationFrames();
    if (furthest <= 0) return outputDuration;
    return Math.max(outputDuration, Math.ceil(furthest * 1.30));
  }

  // Sync the zoom slider's max attribute to the current getMaxZoom() value,
  // clamping zoomLevel if it now exceeds the new max.
  updateZoomSliderMax() {
    if (!this.zoomSlider) return;
    const maxZoom = this.getMaxZoom();
    this.zoomSlider.max = maxZoom.toFixed(2);
    if (this.zoomLevel > maxZoom) {
      this.zoomLevel = maxZoom;
      this.zoomSlider.value = maxZoom;
      // Resize the canvas to match the clamped zoom
      const viewportWidth = this.viewport ? this.viewport.clientWidth : 0;
      if (viewportWidth > 0) {
        const newCanvasWidth = Math.max(viewportWidth, viewportWidth * this.zoomLevel);
        this.canvas.style.width = newCanvasWidth + "px";
        this.resizeCanvas(newCanvasWidth);
      }
    }
  }

  loadImages() {
    for (const seg of this.timeline.segments) {
      if (seg.imageB64 && !seg.imgObj) {
        seg.imgObj = new Image();
        seg.imgObj.onload = () => this.render();
        seg.imgObj.src = seg.imageB64;
      }
    }
  }

  createDOM() {
    this.wrapper = document.createElement("div");
    this.wrapper.className = "pr-wrapper";

    this.wrapper.addEventListener("mouseenter", () => { this._isHovering = true; });
    this.wrapper.addEventListener("mouseleave", () => { this._isHovering = false; });

    this.handleKeyDown = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName : "";
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

      if ((e.key === "Delete" || e.key === "Backspace") && this.selectedIndex !== -1 && this._isHovering) {
        this.deleteSelectedSegment();
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
      } else if ((e.key === " " || e.code === "Space") && this._isHovering) {
        this.togglePlay();
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", this.handleKeyDown, true);

    this.handlePaste = (e) => {
      if (this._isHovering) {
        const activeTag = document.activeElement ? document.activeElement.tagName : "";
        if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

        if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
          const imageFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith("image/"));
          if (imageFiles.length > 0) {
            this.handleImageUpload(imageFiles, this.currentFrame);
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };
    window.addEventListener("paste", this.handlePaste, true);

    // --- Toolbar ---
    const toolbar = document.createElement("div");
    toolbar.className = "pr-toolbar";

    const actionGroup = document.createElement("div");
    actionGroup.className = "pr-actions";

    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = "image/*";
    this.fileInput.multiple = true;
    this.fileInput.style.display = "none";
    this.fileInput.addEventListener("change", (e) => this.handleImageUpload(e.target.files));

    this.audioFileInput = document.createElement("input");
    this.audioFileInput.type = "file";
    this.audioFileInput.accept = "audio/*";
    this.audioFileInput.multiple = true;
    this.audioFileInput.style.display = "none";
    this.audioFileInput.addEventListener("change", (e) => this.handleAudioUpload(e.target.files));

    const uploadBtn = document.createElement("button");
    uploadBtn.className = "pr-btn";
    uploadBtn.innerHTML = `${ICONS.upload} ${ZH.addImage}`;
    uploadBtn.addEventListener("click", () => this.fileInput.click());

    const autoFillBtn = document.createElement("button");
    autoFillBtn.className = "pr-btn";
    autoFillBtn.innerHTML = `${ICONS.upload} ${ZH.autoFillGrid}`;
    autoFillBtn.title = ZH.autoFillGridTitle;
    autoFillBtn.addEventListener("click", () => this.autoFillFromSixGrid(false));

    const syncTextBtn = document.createElement("button");
    syncTextBtn.className = "pr-btn";
    syncTextBtn.innerHTML = `${ICONS.text} ${ZH.syncText}`;
    syncTextBtn.title = ZH.syncTextTitle;
    syncTextBtn.addEventListener("click", () => this.syncPromptsFromCurrentLLM());

    const uploadAudioBtn = document.createElement("button");
    uploadAudioBtn.className = "pr-btn";
    uploadAudioBtn.innerHTML = `${ICONS.audio} ${ZH.addAudio}`;
    uploadAudioBtn.addEventListener("click", () => this.audioFileInput.click());

    const addTextBtn = document.createElement("button");
    addTextBtn.className = "pr-btn";
    addTextBtn.innerHTML = `${ICONS.text} ${ZH.addText}`;
    addTextBtn.addEventListener("click", () => this.addTextSegmentFreeSpace());

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "pr-btn pr-btn-danger";
    deleteBtn.innerHTML = `${ICONS.trash} ${ZH.delete}`;
    deleteBtn.addEventListener("click", () => this.deleteSelectedSegment());

    actionGroup.appendChild(this.fileInput);
    actionGroup.appendChild(this.audioFileInput);
    actionGroup.appendChild(uploadBtn);
    if (prIsSixGridDirector(this.node)) {
      actionGroup.appendChild(autoFillBtn);
      actionGroup.appendChild(syncTextBtn);
    }
    actionGroup.appendChild(addTextBtn);
    actionGroup.appendChild(uploadAudioBtn);
    actionGroup.appendChild(deleteBtn);
    toolbar.appendChild(actionGroup);

    const rightGroup = document.createElement("div");
    rightGroup.className = "pr-right-group";

    this.segmentBoundsDisplay = document.createElement("div");
    this.segmentBoundsDisplay.className = "pr-segment-bounds";
    this.segmentBoundsDisplay.textContent = `${ZH.start}: - | ${ZH.end}: -`;

    this.timeCodeDisplay = document.createElement("div");
    this.timeCodeDisplay.className = "pr-timecode";
    this.timeCodeDisplay.textContent = this.formatTime(0);

    const settingsBtn = document.createElement("button");
    settingsBtn.className = "pr-btn";
    settingsBtn.style.padding = "6px";
    settingsBtn.style.justifyContent = "center";
    settingsBtn.style.width = "28px";
    settingsBtn.style.height = "28px";
    settingsBtn.style.boxSizing = "border-box";
    settingsBtn.innerHTML = ICONS.gear;
    settingsBtn.title = ZH.settings;
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this._settingsMenu) {
        this.dismissSettingsMenu();
      } else {
        this.showSettingsMenu(settingsBtn);
      }
    });

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "pr-btn";
    toggleBtn.style.padding = "6px 8px";
    toggleBtn.style.fontSize = "11px";
    toggleBtn.style.marginRight = "0px";
    toggleBtn.textContent = ZH.customAudioOff;
    toggleBtn.title = ZH.toggleCustomAudio;

    const updateToggleStyle = (isOn) => {
      toggleBtn.textContent = isOn ? ZH.customAudioOn : ZH.customAudioOff;
      if (isOn) {
        toggleBtn.style.background = "#1c222d";
        toggleBtn.style.borderColor = "#283142";
        toggleBtn.style.color = "#e0e0e0";
      } else {
        toggleBtn.style.background = "#222";
        toggleBtn.style.borderColor = "#111";
        toggleBtn.style.color = "#e0e0e0";
      }
    };

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const widget = this.node.widgets?.find(w => w.name === "use_custom_audio");
      if (widget) {
        widget.value = !widget.value;
        updateToggleStyle(widget.value);
        this.node.setDirtyCanvas(true, true);
      }
    });

    // Initial state check (widgets might not be ready immediately)
    setTimeout(() => {
      const widget = this.node.widgets?.find(w => w.name === "use_custom_audio");
      if (widget) {
        updateToggleStyle(widget.value);
      }
    }, 100);

    const helpBtn = document.createElement("button");
    helpBtn.className = "pr-btn";
    helpBtn.style.padding = "6px";
    helpBtn.style.justifyContent = "center";
    helpBtn.style.width = "28px";
    helpBtn.style.height = "28px";
    helpBtn.style.boxSizing = "border-box";
    helpBtn.innerHTML = "?";
    helpBtn.title = ZH.help;
    helpBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.open("https://github.com/yg496/SF-WhatDreamsCost-ComfyUI", "_blank");
    });

    const btnGroup = document.createElement("div");
    btnGroup.style.display = "flex";
    btnGroup.style.gap = "6px";
    btnGroup.style.alignItems = "center";
    btnGroup.appendChild(toggleBtn);
    btnGroup.appendChild(helpBtn);
    btnGroup.appendChild(settingsBtn);
    rightGroup.appendChild(btnGroup);

    toolbar.appendChild(rightGroup);

    // --- Canvas & Viewport ---
    this.viewport = document.createElement("div");
    this.viewport.className = "pr-timeline-viewport";

    this.viewport.addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        let zoomDelta = e.deltaY > 0 ? -0.5 : 0.5;
        this.zoomLevel = Math.max(1, Math.min(this.getMaxZoom(), this.zoomLevel + zoomDelta));
        if (this.zoomSlider) this.zoomSlider.value = this.zoomLevel;

        const oldWidth = this.canvas.offsetWidth;
        const newWidth = this.viewport.clientWidth * this.zoomLevel;
        const mouseX = e.clientX - this.viewport.getBoundingClientRect().left;
        const scrollRatio = (this.viewport.scrollLeft + mouseX) / oldWidth;

        this.canvas.style.width = newWidth + "px";
        this.viewport.scrollLeft = scrollRatio * newWidth - mouseX;
      }
    }, { passive: false, capture: true });

    this.canvas = document.createElement("canvas");
    this.canvas.className = "pr-canvas";
    this.ctx = this.canvas.getContext("2d");
    this.canvas.style.width = "100%";

    this.viewport.appendChild(this.canvas);

    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.canvas.addEventListener("contextmenu", (e) => this.onContextMenu(e));
    this.canvas.style.height = `${CANVAS_HEIGHT}px`;

    // --- Content Area Container ---
    const propContainer = document.createElement("div");
    propContainer.className = "pr-prop-container";

    // --- Text Area (Image/Text) ---
    this.promptInput = document.createElement("textarea");
    this.promptInput.className = "pr-prompt-area";
    this.promptInput.placeholder = ZH.promptPlaceholder;
    this.promptInput.addEventListener("input", () => {
      if (this.selectionType === "image" && this.timeline.segments[this.selectedIndex]) {
        const seg = this.timeline.segments[this.selectedIndex];
        seg.prompt = this.promptInput.value;
        seg.promptSource = "manual";
        seg.promptEdited = true;
        this.commitChanges();
      }
    });

    // --- Audio Info Area ---
    this.audioInfoArea = document.createElement("div");
    this.audioInfoArea.className = "pr-audio-info";

    propContainer.appendChild(this.promptInput);
    propContainer.appendChild(this.audioInfoArea);

    this.wrapper.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.wrapper.classList.add("drag-active");

      const { x, y } = this.getMousePos(e);
      const logicalWidth = this.canvas.offsetWidth;
      const totalFrames = this.getVisualDurationFrames();
      if (!logicalWidth || totalFrames <= 0) return;

      const isAudioTrack = y > RULER_HEIGHT + this.blockHeight;
      const trackType = isAudioTrack ? "audio" : "image";
      const arrToModify = isAudioTrack ? this.timeline.audioSegments : this.timeline.segments;

      if (!this._ghostSegmentId || this._ghostTrack !== trackType) {
        this._ghostSegmentId = "GHOST_" + Date.now();
        this._ghostTrack = trackType;
        this._ghostInitialTimeline = prCloneTimelineForPreview(arrToModify);

        const frameRate = this.getFrameRate();
        const newLength = Math.max(1, frameRate * 1);

        let mouseFrameX = x * (totalFrames / logicalWidth);
        let startFrame = clamp(Math.round(mouseFrameX - newLength / 2), 0, totalFrames - newLength);

        this._ghostInitialTimeline.push({
          id: this._ghostSegmentId,
          start: startFrame,
          length: newLength,
          type: "ghost"
        });
      }

      let mouseFrameX = x * (totalFrames / logicalWidth);
      const ghost = this._ghostInitialTimeline.find(s => s.id === this._ghostSegmentId);
      let D_mouse_start = mouseFrameX - ghost.length / 2;

      this._previewSegments = this._applyCenterDragPhysics(
        this._ghostInitialTimeline,
        this._ghostSegmentId,
        D_mouse_start,
        mouseFrameX,
        totalFrames,
        totalFrames,
        logicalWidth
      );
      this.render();
    });

    this.wrapper.addEventListener("dragleave", (e) => {
      const rect = this.wrapper.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX >= rect.right ||
        e.clientY < rect.top || e.clientY >= rect.bottom) {
        this.wrapper.classList.remove("drag-active");
        this._ghostSegmentId = null;
        this._ghostTrack = null;
        this._ghostInitialTimeline = null;
        this._previewSegments = null;
        this.render();
      }
    });

    this.wrapper.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.wrapper.classList.remove("drag-active");

      let targetFrameStart = null;
      let targetTrack = this._ghostTrack || "image";

      if (this._ghostSegmentId && this._previewSegments) {
        const ghost = this._previewSegments.find(s => s.id === this._ghostSegmentId);
        if (ghost) {
          targetFrameStart = ghost.resolvedStart !== undefined ? ghost.resolvedStart : ghost.start;
        }
      }
      this._ghostSegmentId = null;
      this._ghostTrack = null;
      this._ghostInitialTimeline = null;
      this._previewSegments = null;
      this.render();

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const imageFiles = [];
        const audioFiles = [];
        for (let file of e.dataTransfer.files) {
          if (file.type.startsWith("audio/")) audioFiles.push(file);
          if (file.type.startsWith("image/")) imageFiles.push(file);
        }

        // Let implicit intent handle mixing drops: use the track we hovered over
        // for the first type we process, or fallback.
        if (audioFiles.length > 0 && (targetTrack === "audio" || imageFiles.length === 0)) {
          this.handleAudioUpload(audioFiles, targetFrameStart);
        } else if (imageFiles.length > 0) {
          this.handleImageUpload(imageFiles, targetFrameStart);
        }
      }
    });

    window.addEventListener("mousemove", (e) => this.onMouseMove(e));
    window.addEventListener("mouseup", (e) => this.onMouseUp(e));

    // --- Player Controls ---
    const playerControls = document.createElement("div");
    playerControls.className = "pr-player-controls";

    this.playBtn = document.createElement("button");
    this.playBtn.className = "pr-icon-btn";
    this.playBtn.style.padding = "4px";
    this.playBtn.innerHTML = ICONS.play;
    this.playBtn.title = ZH.playPauseAudio;
    this.playBtn.addEventListener("click", () => this.togglePlay());

    this.loopBtn = document.createElement("button");
    this.loopBtn.className = "pr-icon-btn";
    this.loopBtn.style.padding = "4px";
    this.loopBtn.innerHTML = ICONS.loop;
    this.loopBtn.title = ZH.toggleLoop;
    this.loopBtn.addEventListener("click", () => this.toggleLoop());

    this.seekBar = document.createElement("input");
    this.seekBar.type = "range";
    this.seekBar.className = "pr-seek-bar";
    this.seekBar.min = "0";
    this.seekBar.value = "0";
    this.seekBar.style.flex = "1"; // take up remaining space
    this.seekBar.addEventListener("input", (e) => {
      this.currentFrame = parseInt(e.target.value, 10);
      this.render();
      if (this.isPlaying) {
        this.playAudio();
      }
    });

    // --- Zoom Controls ---
    const zoomControls = document.createElement("div");
    zoomControls.className = "pr-zoom-controls";

    const zoomOutBtn = document.createElement("button");
    zoomOutBtn.className = "pr-icon-btn";
    zoomOutBtn.style.padding = "4px";
    zoomOutBtn.innerHTML = ICONS.minus;
    zoomOutBtn.title = ZH.zoomOut;
    zoomOutBtn.addEventListener("click", () => {
      const currentZoom = parseFloat(this.zoomSlider.value);
      this.zoomSlider.value = Math.max(1, currentZoom - 0.5);
      this.zoomSlider.dispatchEvent(new Event("input"));
    });

    this.zoomSlider = document.createElement("input");
    this.zoomSlider.type = "range";
    this.zoomSlider.className = "pr-zoom-slider";
    this.zoomSlider.min = "1";
    this.zoomSlider.max = "1"; // Updated dynamically via updateZoomSliderMax()
    this.zoomSlider.step = "0.1";
    this.zoomSlider.value = "1";
    this.zoomSlider.title = ZH.zoomLevel;
    this.zoomSlider.addEventListener("input", (e) => {
      this.zoomLevel = parseFloat(e.target.value);

      const viewportWidth = this.viewport.clientWidth;
      const newCanvasWidth = Math.max(viewportWidth, viewportWidth * this.zoomLevel);

      this.canvas.style.width = newCanvasWidth + "px";
      this.resizeCanvas(newCanvasWidth);
      this._lastWidth = viewportWidth;
      this._lastZoom = this.zoomLevel;

      // Keep playhead centered
      const totalFrames = this.getVisualDurationFrames();
      const playheadRatio = this.currentFrame / totalFrames;
      const newPlayheadX = playheadRatio * newCanvasWidth;
      this.viewport.scrollLeft = newPlayheadX - (viewportWidth / 2);
    });

    const zoomInBtn = document.createElement("button");
    zoomInBtn.className = "pr-icon-btn";
    zoomInBtn.style.padding = "4px";
    zoomInBtn.innerHTML = ICONS.plus;
    zoomInBtn.title = ZH.zoomIn;
    zoomInBtn.addEventListener("click", () => {
      const currentZoom = parseFloat(this.zoomSlider.value);
      this.zoomSlider.value = Math.min(this.getMaxZoom(), currentZoom + 0.5);
      this.zoomSlider.dispatchEvent(new Event("input"));
    });

    const zoomFitBtn = document.createElement("button");
    zoomFitBtn.className = "pr-icon-btn";
    zoomFitBtn.style.padding = "4px";
    zoomFitBtn.style.marginLeft = "4px";
    zoomFitBtn.innerHTML = ICONS.fit;
    zoomFitBtn.title = ZH.zoomFit;
    zoomFitBtn.addEventListener("click", () => {
      this.zoomLevel = 1;
      this.zoomSlider.value = 1;
      const viewportWidth = this.viewport.clientWidth;
      this.canvas.style.width = viewportWidth + "px";
      this.resizeCanvas(viewportWidth);
      this._lastWidth = viewportWidth;
      this._lastZoom = 1;
      this.viewport.scrollLeft = 0;
    });

    zoomControls.appendChild(zoomOutBtn);
    zoomControls.appendChild(this.zoomSlider);
    zoomControls.appendChild(zoomInBtn);
    zoomControls.appendChild(zoomFitBtn);

    playerControls.appendChild(this.playBtn);
    playerControls.appendChild(this.loopBtn);
    playerControls.appendChild(this.seekBar);
    playerControls.appendChild(zoomControls);



    // --- Guide Strength Slider ---
    this.strengthRow = document.createElement("div");
    this.strengthRow.className = "pr-strength-row";

    const strengthLabel = document.createElement("span");
    strengthLabel.className = "pr-strength-label";
    strengthLabel.textContent = ZH.guideStrength;

    this.strengthValue = document.createElement("input");
    this.strengthValue.type = "text";
    this.strengthValue.className = "pr-strength-input";
    this.strengthValue.value = "1.00";
    this.strengthValue.disabled = true;
    this.strengthValue.style.cursor = "ew-resize";

    // Dragging logic for guide strength
    let isDragging = false;
    let startX = 0;
    let startVal = 0;
    let hasMoved = false;

    this.strengthValue.addEventListener("mousedown", (e) => {
      if (this.strengthValue.disabled) return;
      startX = e.clientX;
      startVal = parseFloat(this.strengthValue.value) || 1.0;
      hasMoved = false;

      const onMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        if (Math.abs(deltaX) > 3) {
          hasMoved = true;
          isDragging = true;
        }

        if (isDragging) {
          moveEvent.preventDefault();
          const sensitivity = 0.002;
          let newVal = startVal + deltaX * sensitivity;

          if (newVal < 0) newVal = 0;
          if (newVal > 1) newVal = 1;

          this.strengthValue.value = newVal.toFixed(2);

          if (this.selectionType === "image" && this.timeline.segments[this.selectedIndex]) {
            const seg = this.timeline.segments[this.selectedIndex];
            if (seg.type !== "text") {
              seg.guideStrength = newVal;
              this.commitChanges();
            }
          }
        }
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        if (!hasMoved) {
          this.strengthValue.focus();
          this.strengthValue.select();
        }
        isDragging = false;
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    this.strengthValue.addEventListener("change", (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 1;
      val = Math.max(0, Math.min(1, val));
      this.strengthValue.value = val.toFixed(2);
      if (this.selectionType === "image" && this.timeline.segments[this.selectedIndex]) {
        const seg = this.timeline.segments[this.selectedIndex];
        if (seg.type !== "text") {
          seg.guideStrength = val;
          this.commitChanges();
        }
      }
    });

    this.strengthRow.appendChild(this.timeCodeDisplay);
    this.strengthRow.appendChild(this.segmentBoundsDisplay);
    this.strengthRow.appendChild(strengthLabel);
    this.strengthRow.appendChild(this.strengthValue);


    this.wrapper.appendChild(toolbar);
    this.wrapper.appendChild(this.viewport);

    const controlsGroup = document.createElement("div");
    controlsGroup.className = "pr-controls-group";
    controlsGroup.appendChild(this.strengthRow);
    controlsGroup.appendChild(playerControls);
    this.wrapper.appendChild(controlsGroup);
    this.wrapper.appendChild(propContainer);

    this.container.appendChild(this.wrapper);
  }

  checkResize() {
    const viewportWidth = this.viewport.clientWidth;
    const currentScale = this.getRenderScale();
    this.checkSixGridSourceChange();
    this.checkGridCropOptionChange();
    this.checkConnectedLLMTextChange();

    if (viewportWidth > 0 && (this._lastWidth !== viewportWidth || this._lastZoom !== this.zoomLevel || this._lastScale !== currentScale)) {
      this._lastWidth = viewportWidth;
      this._lastZoom = this.zoomLevel;
      this._lastScale = currentScale;

      const newCanvasWidth = Math.max(viewportWidth, viewportWidth * this.zoomLevel);
      this.canvas.style.width = newCanvasWidth + "px";
      this.resizeCanvas(newCanvasWidth);
    }
    this._renderLoop = requestAnimationFrame(() => this.checkResize());
  }

  checkSixGridSourceChange() {
    if (!prIsSixGridDirector(this.node)) return;
    const now = performance.now ? performance.now() : Date.now();
    if (now - this._lastSixGridCheck < 1000) return;
    this._lastSixGridCheck = now;

    const source = prGetSixGridSource(this.node);
    const sourceKey = prSixGridSourceKey(source);
    if (!sourceKey) return;

    this.ensureSixGridPreviewImage(source, sourceKey);
    this.requestSixGridAutoRefresh("source", source, sourceKey);
  }

  checkGridCropOptionChange() {
    if (!prIsSixGridDirector(this.node)) return;
    const options = prGetShotCropOptions(this.node);
    const key = [
      options.targetRatio || "auto",
      options.borderCropStrength.toFixed(3),
    ].join("|");
    if (key === this._lastGridCropKey) return;
    this._lastGridCropKey = key;
    this.render();
  }

  sixGridInputKey(source = null, sourceKey = "") {
    source = source || prGetSixGridSource(this.node);
    sourceKey = sourceKey || prSixGridSourceKey(source);
    return sourceKey || "";
  }

  sixGridTimelineSourceState(sourceKey = "") {
    const segments = (this.timeline?.segments || []).filter((seg) => seg?.source === "storyboard_images");
    const keys = Array.from(new Set(
      segments
        .map((seg) => String(seg.storyboardPreviewKey || ""))
        .filter(Boolean)
    ));
    return {
      count: segments.length,
      keys,
      hasKnownSource: keys.length > 0,
      matchesCurrent: !!sourceKey && keys.length > 0 && keys.every((key) => key === sourceKey),
    };
  }

  requestSixGridAutoRefresh(reason = "input", source = null, sourceKey = "") {
    if (!prIsSixGridDirector(this.node)) return false;
    source = source || prGetSixGridSource(this.node);
    sourceKey = sourceKey || prSixGridSourceKey(source);
    if (!sourceKey) return false;

    const inputKey = this.sixGridInputKey(source, sourceKey);
    if (!inputKey || inputKey === this._lastSixGridInputKey) return false;

    const sourceState = this.sixGridTimelineSourceState(sourceKey);
    if (sourceState.count > 0 && sourceState.matchesCurrent) {
      this._lastSixGridInputKey = inputKey;
      this._lastSixGridSourceKey = sourceKey;
      this.ensureSixGridPreviewImage(source, sourceKey);
      this.refreshSixGridPreviews(source, sourceKey);
      return false;
    }
    if (sourceState.count > 0 && !sourceState.hasKnownSource && (reason === "init" || reason === "source")) {
      this._lastSixGridInputKey = inputKey;
      this._lastSixGridSourceKey = sourceKey;
      this.refreshSixGridPreviews(source, sourceKey);
      return false;
    }

    this._lastSixGridInputKey = inputKey;
    this._lastSixGridSourceKey = sourceKey;

    if (this._sixGridRefreshInFlight) {
      this._sixGridAutoRefreshPending = true;
      this._sixGridPendingSource = source;
      this._sixGridPendingSourceKey = sourceKey;
      return true;
    }

    if (this._sixGridAutoRefreshTimer) clearTimeout(this._sixGridAutoRefreshTimer);
    this._sixGridAutoRefreshTimer = setTimeout(async () => {
      this._sixGridAutoRefreshTimer = null;
      this._sixGridRefreshInFlight = true;
      try {
        await this.autoFillFromSixGrid(false);
      } finally {
        this._sixGridRefreshInFlight = false;
        if (this._sixGridAutoRefreshPending) {
          const pendingSource = this._sixGridPendingSource;
          const pendingSourceKey = this._sixGridPendingSourceKey;
          this._sixGridAutoRefreshPending = false;
          this._sixGridPendingSource = null;
          this._sixGridPendingSourceKey = "";
          this._lastSixGridInputKey = "";
          this.requestSixGridAutoRefresh(reason, pendingSource || source, pendingSourceKey || sourceKey);
        }
      }
    }, 120);
    return true;
  }

  async ensureSixGridPreviewImage(source = null, sourceKey = "") {
    if (!prIsSixGridDirector(this.node)) return null;
    source = source || prGetSixGridSource(this.node);
    sourceKey = sourceKey || prSixGridSourceKey(source);
    if (!source?.url || !sourceKey) return null;
    if (this._sixGridPreviewImage && this._sixGridPreviewSourceKey === sourceKey) return this._sixGridPreviewImage;
    if (this._sixGridPreviewLoad && this._sixGridPreviewSourceKey === sourceKey) return this._sixGridPreviewLoad;

    this._sixGridPreviewSourceKey = sourceKey;
    this._sixGridPreviewSource = source;
    this._sixGridPreviewImage = null;
    this._sixGridPreviewLoad = prImageFromUrl(source.url)
      .then((img) => {
        if (this._sixGridPreviewSourceKey === sourceKey) {
          this._sixGridPreviewImage = img;
          this._sixGridPreviewSource = source;
          this.render();
        }
        return img;
      })
      .catch((err) => {
        if (this._sixGridPreviewSourceKey === sourceKey) {
          this._sixGridPreviewImage = null;
        }
        console.warn("[LTX Grid Director] Could not load grid preview image:", err);
        return null;
      })
      .finally(() => {
        if (this._sixGridPreviewSourceKey === sourceKey) this._sixGridPreviewLoad = null;
      });
    return this._sixGridPreviewLoad;
  }

  getRenderScale() {
    const dpr = window.devicePixelRatio || 1;
    let graphScale = 1;
    try {
      if (window.app && window.app.canvas && window.app.canvas.ds && window.app.canvas.ds.scale) {
        graphScale = window.app.canvas.ds.scale;
      }
    } catch (e) { }
    // Scale up if zoomed in, but don't drop below 1x DPR if zoomed out
    return dpr * Math.max(1, graphScale);
  }

  resizeCanvas(widthPx) {
    const scale = this.getRenderScale();
    const targetWidth = Math.round(widthPx * scale);
    const targetHeight = Math.round(this.canvasHeight * scale);

    this.canvas.width = targetWidth;
    this.canvas.height = targetHeight;
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.render();
  }

  // Helper to map mouse events accurately regardless of canvas scaling
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();

    const scaleX = this.canvas.offsetWidth / rect.width;
    const scaleY = this.canvas.offsetHeight / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  }

  // --- Async Image Upload Logic (Handles multiple images simultaneously) ---
  async handleImageUpload(files, targetFrameStart = null, explicitLength = null) {
    const frameRate = this.getFrameRate();
    const durationFrames = this.getDurationFrames();
    const newLength = explicitLength !== null ? explicitLength : frameRate * 1; // Default to 1 second long

    for (let file of files) {
      if (!file.type.startsWith("image/")) continue;

      await new Promise(async (resolve) => {
        try {
          const body = new FormData();
          body.append("image", file);
          const resp = await api.fetchApi("/upload/image", { method: "POST", body });
          if (resp.status !== 200) { resolve(); return; }

          const data = await resp.json();
          const filename = data.name;
          const subfolder = data.subfolder || "";
          const imageFile = subfolder ? subfolder + "/" + filename : filename;
          const imgUrl = api.apiURL(`/view?filename=${encodeURIComponent(filename)}&type=input&subfolder=${encodeURIComponent(subfolder)}`);

          const img = new Image();
          img.onload = () => {

            let newStart = targetFrameStart;
            if (newStart === null) {
              // Fallback: find the first free slot, or append past the end
              newStart = 0;
              this.timeline.segments.sort((a, b) => a.start - b.start);
              for (let i = 0; i < this.timeline.segments.length; i++) {
                let seg = this.timeline.segments[i];
                if (newStart + newLength <= seg.start) break;
                newStart = Math.max(newStart, seg.start + seg.length);
              }
            }

            // Use the visual timeline as the physics bound so segments can
            // land anywhere in the padded visual area without touching duration_frames.
            const currentDuration = this.getVisualDurationFrames();

            if (targetFrameStart !== null) {
              // Resolve physics to push existing segments
              let tempId = "TEMP_" + Date.now();
              this.timeline.segments.push({ id: tempId, start: newStart, length: newLength, type: "temp" });
              let result = this._applyCenterDragPhysics(this.timeline.segments, tempId, newStart, newStart + newLength / 2, currentDuration, currentDuration, 1);

              // Update original segments with resolved physics to preserve imgObj
              for (let shiftedSeg of result) {
                let original = this.timeline.segments.find(s => s.id === shiftedSeg.id);
                if (original) {
                  original.start = shiftedSeg.resolvedStart !== undefined ? shiftedSeg.resolvedStart : shiftedSeg.start;
                }
              }

              let tempSeg = this.timeline.segments.find(s => s.id === tempId);
              newStart = tempSeg.start;
              this.timeline.segments = this.timeline.segments.filter(s => s.id !== tempId);
              targetFrameStart = newStart + newLength; // For the next file in batch
            }

            // Use the full intended length -the timeline has already been grown to fit.
            let constrainedLength = newLength;

            const seg = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              start: newStart,
              length: constrainedLength,
              prompt: "",
              type: "image",
              imageFile: imageFile,
              imageB64: imgUrl
            };

            const displayImg = new Image();
            displayImg.onload = () => {
              seg.imgObj = displayImg;
              this.render();
              resolve(); // Resolve promise letting next image process
            };
            displayImg.src = imgUrl;

            this.timeline.segments.push(seg);
            this.timeline.segments.sort((a, b) => a.start - b.start);
            this.selectionType = "image";
            this.selectedIndex = this.timeline.segments.findIndex(s => s.id === seg.id);

            this.updateUIFromSelection();
            this.commitChanges(true);
          };
          img.src = imgUrl;
        } catch (err) {
          console.error("[PromptRelay] Image upload failed", err);
          resolve();
        }
      });
    }
    this.fileInput.value = "";
  }

  // --- Async Audio Upload Logic ---
  async handleAudioUpload(files, targetFrameStart = null) {
    const frameRate = this.getFrameRate();
    const durationFrames = this.getDurationFrames();

    for (let file of files) {
      if (!file.type.startsWith("audio/")) continue;

      await new Promise(async (resolve) => {
        try {
          const body = new FormData();
          body.append("image", file);
          const resp = await api.fetchApi("/upload/image", { method: "POST", body });
          if (resp.status !== 200) { resolve(); return; }

          const data = await resp.json();
          const filename = data.name;
          const subfolder = data.subfolder || "";
          const audioFile = subfolder ? subfolder + "/" + filename : filename;

          const arrayBuffer = await file.arrayBuffer();
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const clipDurationSecs = audioBuffer.duration;
          const clipFrames = Math.max(1, Math.ceil(clipDurationSecs * frameRate));

          const channelData = audioBuffer.getChannelData(0);
          const peaks = [];
          const numPeaks = 200;
          const step = Math.floor(channelData.length / numPeaks);
          for (let i = 0; i < numPeaks; i++) {
            let max = 0;
            for (let j = 0; j < step; j++) {
              const val = Math.abs(channelData[i * step + j]);
              if (val > max) max = val;
            }
            peaks.push(max);
          }

          let newLength = clipFrames;
          let newStart = targetFrameStart;

          if (newStart === null) {
            // Find the first free slot, or place past the end of all existing audio
            newStart = 0;
            this.timeline.audioSegments.sort((a, b) => a.start - b.start);
            for (let i = 0; i < this.timeline.audioSegments.length; i++) {
              let seg = this.timeline.audioSegments[i];
              if (newStart + newLength <= seg.start) break;
              newStart = Math.max(newStart, seg.start + seg.length);
            }
          }

          // Use the visual timeline as the physics bound so segments can
          // land anywhere in the padded visual area without touching duration_frames.
          const currentDuration = this.getVisualDurationFrames();

          if (targetFrameStart !== null) {
            let tempId = "TEMP_" + Date.now();
            this.timeline.audioSegments.push({ id: tempId, start: newStart, length: newLength, type: "temp" });
            let result = this._applyCenterDragPhysics(this.timeline.audioSegments, tempId, newStart, newStart + newLength / 2, currentDuration, currentDuration, 1);

            for (let shiftedSeg of result) {
              let original = this.timeline.audioSegments.find(s => s.id === shiftedSeg.id);
              if (original) original.start = shiftedSeg.resolvedStart !== undefined ? shiftedSeg.resolvedStart : shiftedSeg.start;
            }

            let tempSeg = this.timeline.audioSegments.find(s => s.id === tempId);
            newStart = tempSeg.start;
            this.timeline.audioSegments = this.timeline.audioSegments.filter(s => s.id !== tempId);
            targetFrameStart = newStart + newLength;
          }

          // Use the full clip length -timeline has already grown to fit.
          let constrainedLength = newLength;

          const seg = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            type: "audio",
            start: newStart,
            length: constrainedLength,
            trimStart: 0,
            audioDurationFrames: clipFrames,
            audioFile: audioFile,
            fileName: file.name,
            waveformPeaks: peaks
          };

          this.timeline.audioSegments.push(seg);
          this.timeline.audioSegments.sort((a, b) => a.start - b.start);
          this.selectionType = "audio";
          this.selectedIndex = this.timeline.audioSegments.findIndex(s => s.id === seg.id);

          this.updateUIFromSelection();
          this.commitChanges(true);
          this.render();
          resolve();
        } catch (err) {
          console.error("[PromptRelay] Audio processing failed", err);
          resolve();
        }
      });
    }
    this.audioFileInput.value = "";
  }

  async autoFillFromSixGrid(onlyIfEmpty = false) {
    if (!prIsSixGridDirector(this.node)) return;

    const source = prGetSixGridSource(this.node);
    const sourceKey = prSixGridSourceKey(source);
    const ignoreManualLengths = !onlyIfEmpty || this.timeline.segments.length === 0;
    if (onlyIfEmpty && this.timeline.segments.length > 0) {
      await this.refreshSixGridPreviews(source, sourceKey);
      return;
    }

    const maxFromGrid = source ? Math.min(SIX_GRID_MAX_SEGMENTS, source.cols * source.rows) : SIX_GRID_MAX_SEGMENTS;
    const count = Math.max(1, maxFromGrid);
    const promptText = this.getCurrentLLMText();
    const lengths = prResolveSegmentLengths(this.node, count, ignoreManualLengths, promptText);
    const prompts = prParsePrompts(promptText);

    await this.ensureSixGridPreviewImage(source, sourceKey);

    let cursor = 0;
    this.timeline.segments = [];
    for (let idx = 0; idx < count; idx++) {
      const length = lengths[idx] || 1;
      this.timeline.segments.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        start: cursor,
        length,
        prompt: prompts[idx] || "",
        promptSource: prompts[idx] ? "llm" : "auto",
        promptEdited: false,
        type: "image",
        source: "storyboard_images",
        batch_index: idx,
        guideStrength: 1.0,
        storyboardPreviewKey: sourceKey,
      });
      cursor += length;
    }

    this.selectionType = "image";
    this.selectedIndex = this.timeline.segments.length > 0 ? 0 : -1;
    this.loadImages();
    this.updateUIFromSelection();
    this.commitChanges(true);
    this.render();
  }

  async refreshSixGridPreviews(source = null, sourceKey = "") {
    source = source || prGetSixGridSource(this.node);
    sourceKey = sourceKey || prSixGridSourceKey(source);
    if (!source?.url || !sourceKey) return false;

    try {
      await this.ensureSixGridPreviewImage(source, sourceKey);
      let changed = false;
      for (let idx = 0; idx < this.timeline.segments.length; idx++) {
        const seg = this.timeline.segments[idx];
        if (!seg || seg.source !== "storyboard_images") continue;
        if (seg.imageB64) {
          delete seg.imageB64;
          changed = true;
        }
        if (seg.storyboardPreviewKey !== sourceKey) {
          seg.storyboardPreviewKey = sourceKey;
          changed = true;
        }
      }
      if (changed) {
        this.commitChanges(true);
      }
      this.render();
      return changed;
    } catch (err) {
      console.warn("[LTX Grid Director] Could not refresh grid preview images:", err);
      return false;
    }
  }

  async syncPromptsFromText(text, { preserveManual = true, createMissing = true } = {}) {
    if (!prIsSixGridDirector(this.node)) return false;
    const prompts = prParsePrompts(text);
    if (!prompts.length) return false;

    if (createMissing && this.timeline.segments.length === 0) {
      if (this.llmResponseWidget) this.llmResponseWidget.value = String(text || "");
      await this.autoFillFromSixGrid(true);
    }

    const count = Math.min(prompts.length, this.timeline.segments.length);
    if (!count) return false;

    let changed = false;
    for (let idx = 0; idx < count; idx++) {
      const seg = this.timeline.segments[idx];
      if (!seg) continue;
      const hasManualPrompt = seg.promptEdited || seg.promptSource === "manual";
      const hasUntrackedPrompt = seg.prompt && !seg.promptSource;
      if (preserveManual && (hasManualPrompt || hasUntrackedPrompt)) continue;
      if (seg.prompt !== prompts[idx]) {
        seg.prompt = prompts[idx];
        changed = true;
      }
      seg.promptSource = "llm";
      seg.promptEdited = false;
      seg.llmIndex = idx;
    }

    if (!changed) return false;
    this.loadImages();
    this.updateUIFromSelection();
    this.commitChanges(true);
    this.render();
    return true;
  }

  syncPromptsFromCurrentLLM() {
    const text = this.getCurrentLLMText();
    return this.syncPromptsFromText(text, { preserveManual: true, createMissing: true });
  }

  deleteSelectedSegment() {
    if (this.selectionType === "audio") {
      if (this.timeline.audioSegments.length === 0 || this.selectedIndex === -1) return;
      this.timeline.audioSegments.splice(this.selectedIndex, 1);
      this.selectedIndex = Math.max(-1, this.selectedIndex - 1);
    } else {
      if (this.timeline.segments.length === 0 || this.selectedIndex === -1) return;
      this.timeline.segments.splice(this.selectedIndex, 1);
      this.selectedIndex = Math.max(-1, this.selectedIndex - 1);
    }
    this.updateUIFromSelection();
    this.commitChanges();
    this.render();
  }

  formatTime(frames, dropSuffix = false) {
    const mode = prNormalizeDisplayMode(this.displayModeWidget?.value);
    if (mode === "seconds") {
      const secs = frames / this.getFrameRate();
      return dropSuffix ? secs.toFixed(2) : secs.toFixed(2) + "s";
    }
    return dropSuffix ? Math.round(frames).toString() : Math.round(frames) + ZH.frameSuffix;
  }

  updateWidgetVisibility() {
    const mode = prNormalizeDisplayMode(this.displayModeWidget?.value);

    if (this.durationFramesWidget) {
      // Always visible regardless of display mode
      this.durationFramesWidget.type = "INT";
      if (!this.durationFramesWidget.options) this.durationFramesWidget.options = {};
      this.durationFramesWidget.options.hidden = false;
      this.durationFramesWidget.hidden = false;
      delete this.durationFramesWidget.computeSize;
    }
    if (this.durationSecondsWidget) {
      // Always visible regardless of display mode
      this.durationSecondsWidget.type = "FLOAT";
      if (!this.durationSecondsWidget.options) this.durationSecondsWidget.options = {};
      this.durationSecondsWidget.options.hidden = false;
      this.durationSecondsWidget.hidden = false;
      delete this.durationSecondsWidget.computeSize;
    }

    // Force node resize and redraw deferred to next tick
    setTimeout(() => {
      if (this.node && this.node.computeSize) {
        const sz = this.node.computeSize();
        this.node.size[1] = sz[1];
        if (window.app && window.app.graph) {
          window.app.graph.setDirtyCanvas(true, true);
        }
      }
    }, 0);
  }

  updateUIFromSelection() {
    let seg = null;
    if (this.selectedIndex >= 0) {
      if (this.selectionType === "audio") {
        const origSeg = this.timeline.audioSegments[this.selectedIndex];
        if (origSeg) {
          const previewIsAudio = this._ghostTrack === 'audio' || (this._previewSegments && this._ghostTrack === null && this.selectionType === 'audio');
          const arr = (this._previewSegments && previewIsAudio) ? this._previewSegments : this.timeline.audioSegments;
          seg = arr.find(s => s.id === origSeg.id) || origSeg;
        }
      } else {
        const origSeg = this.timeline.segments[this.selectedIndex];
        if (origSeg) {
          const previewIsImage = this._ghostTrack === 'image' || (this._previewSegments && this._ghostTrack === null && this.selectionType === 'image');
          const arr = (this._previewSegments && previewIsImage) ? this._previewSegments : this.timeline.segments;
          seg = arr.find(s => s.id === origSeg.id) || origSeg;
        }
      }
    }

    if (this.selectionType === "audio" && seg) {
      this.promptInput.style.display = "none";
      this.strengthRow.style.display = "flex";
      this.audioInfoArea.style.display = "block";
      this.audioInfoArea.innerHTML = `
        ${ZH.file}: <span>${seg.fileName || ZH.unknown}</span><br>
        ${ZH.length}: <span>${this.formatTime(seg.audioDurationFrames)}</span> ${ZH.outputLength}: <span>${this.formatTime(seg.length)}</span><br>
        ${ZH.trimIn}: <span>${this.formatTime(Math.round(seg.trimStart))}</span> ${ZH.trimOut}: <span>${this.formatTime(Math.round(seg.audioDurationFrames - (seg.trimStart + seg.length)))}</span>
      `;
      this.strengthValue.value = "1.00";
      this.strengthValue.disabled = true;
    } else {
      this.audioInfoArea.style.display = "none";
      this.promptInput.style.display = "block";
      this.strengthRow.style.display = "flex";

      if (seg) {
        this.promptInput.value = seg.prompt || "";
        this.promptInput.disabled = false;

        const isImage = seg.type !== "text";
        const strength = isImage ? (seg.guideStrength ?? 1.0) : 1.0;
        this.strengthValue.value = strength.toFixed(2);
        this.strengthValue.disabled = !isImage;
      } else {
        this.promptInput.value = "";
        this.promptInput.disabled = true;
        this.strengthValue.value = "1.00";
        this.strengthValue.disabled = true;
      }
    }

    if (this.segmentBoundsDisplay) {
      if (seg) {
        const startStr = this.formatTime(seg.start, true);
        const endStr = this.formatTime(seg.start + seg.length, true);
        this.segmentBoundsDisplay.textContent = `${ZH.start}: ${startStr} | ${ZH.end}: ${endStr}`;
      } else {
        this.segmentBoundsDisplay.textContent = `${ZH.start}: - | ${ZH.end}: -`;
      }
    }
  }

  // --- Rendering logic ---
  drawSixGridStoryboardSegment(seg, startX, pxWidth) {
    if (!prIsSixGridDirector(this.node) || seg?.source !== "storyboard_images") return false;
    const img = this._sixGridPreviewImage;
    const source = this._sixGridPreviewSource;
    if (!img || !img.complete || img.naturalWidth <= 0 || !source?.cols || !source?.rows) {
      this.ensureSixGridPreviewImage();
      return false;
    }

    const idx = Number.isFinite(Number(seg.batch_index)) ? Number(seg.batch_index) : 0;
    const cropOptions = prGetShotCropOptions(this.node);
    const { sx, sy, sw, sh } = prGridCropBounds(
      img.naturalWidth,
      img.naturalHeight,
      idx,
      source.cols,
      source.rows,
      cropOptions.borderCropStrength,
      cropOptions.targetRatio,
    );
    const imgRatio = sw / sh;
    const boxRatio = pxWidth / this.blockHeight;
    let drawW, drawH, drawX, drawY;

    if (imgRatio > boxRatio) {
      drawW = pxWidth;
      drawH = pxWidth / imgRatio;
      drawX = startX;
      drawY = RULER_HEIGHT + (this.blockHeight - drawH) / 2;
    } else {
      drawH = this.blockHeight;
      drawW = this.blockHeight * imgRatio;
      drawY = RULER_HEIGHT;
      drawX = startX + (pxWidth - drawW) / 2;
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(startX, RULER_HEIGHT + 1, pxWidth, this.blockHeight - 2);
    this.ctx.clip();
    this.ctx.drawImage(img, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
    this.ctx.restore();
    return true;
  }

  render() {
    const width = this.canvas.offsetWidth || this._lastWidth;
    const height = this.canvasHeight;
    const totalFrames = this.getVisualDurationFrames();

    if (!width || width <= 0) return;

    this.ctx.clearRect(0, 0, width, height);



    // Render Track Backgrounds
    this.ctx.fillStyle = "#111"; // Image track bg
    this.ctx.fillRect(0, RULER_HEIGHT, width, this.blockHeight);
    this.ctx.fillStyle = "#111"; // Audio track bg
    this.ctx.fillRect(0, RULER_HEIGHT + this.blockHeight, width, this.audioTrackHeight);



    // Determine which track the preview belongs to.
    // _ghostTrack is set during HTML file drag-and-drop.
    // During canvas mouse drags, _ghostTrack is null, so fall back to selectionType.
    const previewIsAudio = this._ghostTrack === 'audio' ||
      (this._previewSegments && this._ghostTrack === null && this.selectionType === 'audio');

    let renderSegments = (this._previewSegments && !previewIsAudio)
      ? this._previewSegments : this.timeline.segments;

    let renderAudioSegments = (this._previewSegments && previewIsAudio)
      ? this._previewSegments : this.timeline.audioSegments;



    const activeSegId = this.timeline.segments[this.selectedIndex]?.id;
    const activeAudioSegId = this.timeline.audioSegments[this.selectedIndex]?.id;

    // Sort segments so that the selected one is drawn last (on top)
    const isImageSelection = this.selectionType === "image";
    const sortedSegments = [...renderSegments].sort((a, b) => {
      const aSel = isImageSelection && a.id === activeSegId;
      const bSel = isImageSelection && b.id === activeSegId;
      return aSel - bSel;
    });

    const isAudioSelection = this.selectionType === "audio";
    const sortedAudioSegments = [...renderAudioSegments].sort((a, b) => {
      const aSel = isAudioSelection && a.id === activeAudioSegId;
      const bSel = isAudioSelection && b.id === activeAudioSegId;
      return aSel - bSel;
    });

    // --- Draw Image/Text Segments ---
    for (let i = 0; i < sortedSegments.length; i++) {
      const seg = sortedSegments[i];
      const startX = (seg.start / totalFrames) * width;
      const pxWidth = (seg.length / totalFrames) * width;
      const isSelected = (this.selectionType === "image" && seg.id === activeSegId);

      const originalSeg = this.timeline.segments.find(s => s.id === seg.id);
      const imgObj = originalSeg ? originalSeg.imgObj : seg.imgObj;

      if ((this._isDragging && this.selectionType === "image" && seg.id === this._dragTargetId) || (this._ghostSegmentId && seg.id === this._ghostSegmentId)) {
        this.ctx.globalAlpha = 0.65;
      } else {
        this.ctx.globalAlpha = 1.0;
      }

      if (seg.type === "ghost") {
        this.ctx.fillStyle = "#2a2a2a";
        this.ctx.fillRect(startX, RULER_HEIGHT, pxWidth, this.blockHeight);

        this.ctx.strokeStyle = "#777";
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(startX, RULER_HEIGHT + 1, pxWidth, this.blockHeight - 2);
        this.ctx.setLineDash([]);

        this.ctx.fillStyle = "#aaa";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.font = "bold 12px sans-serif";
        this.ctx.fillText(ZH.dropToPlace, startX + pxWidth / 2, RULER_HEIGHT + this.blockHeight / 2);
      } else {
        this.ctx.fillStyle = seg.type === "text" ? "#000b12" : "#000";
        this.ctx.fillRect(startX, RULER_HEIGHT + 1, pxWidth, this.blockHeight - 2);
      }

      if (this.drawSixGridStoryboardSegment(seg, startX, pxWidth)) {
        // Drawn directly from the shared grid source image.
      } else if (imgObj && imgObj.complete && imgObj.naturalWidth > 0 && seg.type !== "ghost") {
        const imgRatio = imgObj.naturalWidth / imgObj.naturalHeight;
        const boxRatio = pxWidth / this.blockHeight;
        let drawW, drawH, drawX, drawY;
        if (imgRatio > boxRatio) {
          drawW = pxWidth; drawH = pxWidth / imgRatio;
          drawX = startX; drawY = RULER_HEIGHT + (this.blockHeight - drawH) / 2;
        } else {
          drawH = this.blockHeight; drawW = this.blockHeight * imgRatio;
          drawY = RULER_HEIGHT; drawX = startX + (pxWidth - drawW) / 2;
        }

        // Clip to segment bounds so tiled images don't bleed into adjacent segments
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(startX, RULER_HEIGHT + 1, pxWidth, this.blockHeight - 2);
        this.ctx.clip();

        if (imgRatio > boxRatio) {
          // Fits width, vertical letterboxing (black bars top/bottom) -keep as is
          this.ctx.drawImage(imgObj, drawX, drawY, drawW, drawH);
        } else {
          // Fits height, horizontal letterboxing (black bars left/right) -tile horizontally
          this.ctx.drawImage(imgObj, drawX, drawY, drawW, drawH);

          // Tile left
          let leftX = drawX - drawW;
          while (leftX + drawW > startX) {
            this.ctx.drawImage(imgObj, leftX, drawY, drawW, drawH);
            leftX -= drawW;
          }

          // Tile right
          let rightX = drawX + drawW;
          while (rightX < startX + pxWidth) {
            this.ctx.drawImage(imgObj, rightX, drawY, drawW, drawH);
            rightX += drawW;
          }
        }
        this.ctx.restore();

        // --- Prompt subtitle overlay ---
        if (seg.prompt && seg.type !== "ghost" && pxWidth > 24) {
          const overlayH = Math.round(this.blockHeight * 0.20);
          const overlayY = RULER_HEIGHT + this.blockHeight - overlayH;

          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.rect(startX, overlayY, pxWidth, overlayH);
          this.ctx.clip();

          // Translucent background
          this.ctx.fillStyle = "rgba(0, 0, 0, 0.60)";
          this.ctx.fillRect(startX, overlayY, pxWidth, overlayH);

          // Text
          const fontSize = Math.min(11, overlayH * 0.58);
          this.ctx.font = `${fontSize}px sans-serif`;
          this.ctx.fillStyle = "#e0e3ed";
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";

          // Measure and truncate to single line
          const maxTextW = pxWidth - 10;
          let label = seg.prompt;
          if (this.ctx.measureText(label).width > maxTextW) {
            while (label.length > 0 && this.ctx.measureText(label + "...").width > maxTextW) {
              label = label.slice(0, -1);
            }
            label += "...";
          }

          this.ctx.fillText(label, startX + pxWidth / 2, overlayY + overlayH / 2);
          this.ctx.restore();
        }
      } else if (seg.type === "text") {
        const pad = 8;
        const boxW = pxWidth - pad * 2;
        if (boxW > 12) {
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.rect(startX + pad, RULER_HEIGHT + pad, boxW, this.blockHeight - pad * 2);
          this.ctx.clip();
          this.ctx.fillStyle = "#e0e3ed";
          this.ctx.font = "11px sans-serif";
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "top";
          const label = seg.prompt || ZH.noPrompt;
          const words = label.split(" ");
          const lineH = 15;
          let line = "";
          let lines = [];
          for (const word of words) {
            const test = line ? line + " " + word : word;
            if (this.ctx.measureText(test).width > boxW && line) {
              lines.push(line);
              line = word;
            } else {
              line = test;
            }
          }
          if (line) lines.push(line);

          const maxLines = Math.max(1, Math.floor((this.blockHeight - pad * 2) / lineH));
          if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            lines[lines.length - 1] += "...";
          }

          const totalTextHeight = lines.length * lineH;
          let ty = RULER_HEIGHT + (this.blockHeight - totalTextHeight) / 2 + 2;

          for (const l of lines) {
            this.ctx.fillText(l, startX + pxWidth / 2, ty);
            ty += lineH;
          }
          this.ctx.restore();
        }
      }

      if (isSelected) {
        this.ctx.strokeStyle = "#fff";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(startX, RULER_HEIGHT + 1, pxWidth, this.blockHeight - 2);
        this.ctx.fillStyle = "#fff";
        this.ctx.beginPath();
        this.ctx.roundRect(startX, RULER_HEIGHT + this.blockHeight / 2 - 12, 4, 24, 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.roundRect(startX + pxWidth - 4, RULER_HEIGHT + this.blockHeight / 2 - 12, 4, 24, 2);
        this.ctx.fill();
      } else {
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(startX, RULER_HEIGHT + 1, pxWidth, this.blockHeight - 2);
      }
      this.ctx.globalAlpha = 1.0;
    }

    // --- Draw Audio Segments ---
    for (let i = 0; i < sortedAudioSegments.length; i++) {
      const seg = sortedAudioSegments[i];
      const startX = (seg.start / totalFrames) * width;
      const pxWidth = (seg.length / totalFrames) * width;
      const isSelected = (this.selectionType === "audio" && seg.id === activeAudioSegId);
      const trackY = RULER_HEIGHT + this.blockHeight;

      if ((this._isDragging && this.selectionType === "audio" && seg.id === this._dragTargetId) || (this._ghostSegmentId && seg.id === this._ghostSegmentId)) {
        this.ctx.globalAlpha = 0.65;
      } else {
        this.ctx.globalAlpha = 1.0;
      }

      if (seg.type === "ghost") {
        this.ctx.fillStyle = "#1a1a1a";
        this.ctx.fillRect(startX, trackY, pxWidth, this.audioTrackHeight);
        this.ctx.strokeStyle = "#555";
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(startX, trackY, pxWidth, this.audioTrackHeight);
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = "#888";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.font = "bold 12px sans-serif";
        this.ctx.fillText(ZH.dropAudio, startX + pxWidth / 2, trackY + this.audioTrackHeight / 2);
      } else {
        this.drawAudioSegmentVisuals(this.ctx, seg, isSelected, trackY, this.audioTrackHeight, startX, pxWidth);
      }
      this.ctx.globalAlpha = 1.0;
    }

    // --- Draw Ruler & Divider AFTER segments to prevent overlap ---
    // Ruler Background
    this.ctx.fillStyle = "#1e1e1e";
    this.ctx.fillRect(0, 0, width, RULER_HEIGHT);

    // Crisp Ruler Text
    this.ctx.fillStyle = "#aaa";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.font = "10px sans-serif";

    const frameRate = this.getFrameRate();
    const mode = prNormalizeDisplayMode(this.displayModeWidget?.value);

    // Define logical steps for both modes
    let steps;
    if (mode === "seconds") {
      steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    } else {
      steps = [1, 2, 5, 10, 24, 48, 120, 240, 480, 960, 1920];
    }

    const minSpacingPx = 60;
    let majorStep = steps[steps.length - 1];
    for (let i = 0; i < steps.length; i++) {
      const stepFrames = mode === "seconds" ? steps[i] * frameRate : steps[i];
      const spacingPx = (stepFrames / totalFrames) * width;
      if (spacingPx >= minSpacingPx) {
        majorStep = steps[i];
        break;
      }
    }

    const majorStepFrames = mode === "seconds" ? majorStep * frameRate : majorStep;

    let minorStep;
    if (mode === "seconds") {
      if (majorStep <= 0.2) minorStep = majorStep / 2;
      else if (majorStep <= 1) minorStep = majorStep / 5;
      else if (majorStep <= 5) minorStep = 1;
      else if (majorStep <= 15) minorStep = 5;
      else if (majorStep <= 30) minorStep = 10;
      else if (majorStep <= 60) minorStep = 10;
      else minorStep = majorStep / 5;
    } else {
      if (majorStep <= 5) minorStep = 1;
      else if (majorStep <= 10) minorStep = 2;
      else if (majorStep <= 24) minorStep = 6;
      else if (majorStep <= 48) minorStep = 12;
      else minorStep = majorStep / 5;
    }
    const minorStepFrames = mode === "seconds" ? minorStep * frameRate : minorStep;

    this.ctx.fillStyle = "#444";
    const totalMinorTicks = Math.floor(totalFrames / minorStepFrames);
    for (let i = 0; i <= totalMinorTicks; i++) {
      const frameVal = i * minorStepFrames;
      if (Math.abs(frameVal % majorStepFrames) < 0.1) continue;

      const x = (frameVal / totalFrames) * width;
      this.ctx.fillRect(Math.floor(x), RULER_HEIGHT - 3, 1, 3);
    }

    this.ctx.fillStyle = "#aaa";
    const totalMajorTicks = Math.floor(totalFrames / majorStepFrames);
    for (let i = 0; i <= totalMajorTicks; i++) {
      const frameVal = i * majorStepFrames;
      const x = (frameVal / totalFrames) * width;

      this.ctx.fillStyle = "#aaa";
      this.ctx.fillRect(Math.floor(x), RULER_HEIGHT - 6, 1, 6);

      if (frameVal > 0 && frameVal < totalFrames) {
        this.ctx.textAlign = "center";
        this.ctx.fillText(this.formatTime(frameVal, true), x, RULER_HEIGHT / 2);
      }
    }

    this.ctx.textAlign = "left";
    const zeroLabel = mode === "seconds" ? "0" : this.formatTime(0, true);
    this.ctx.fillText(zeroLabel, 4, RULER_HEIGHT / 2);

    // Divider
    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(0, RULER_HEIGHT + this.blockHeight, width, 1);

    // Draw gap "+" buttons
    if (!this._isDragging) {
      const BTN_R = 12;
      const gapRegions = this.getGapRegions();
      for (let i = 0; i < gapRegions.length; i++) {
        const gap = gapRegions[i];
        if (gap.widthPx < BTN_R * 2 + 8) continue;
        const hov = this._hoveredGapIdx === i;
        const BTN_W = 18;
        const BTN_H = 18;
        this.ctx.beginPath();
        this.ctx.roundRect(gap.centerX - BTN_W / 2, gap.centerY - BTN_H / 2, BTN_W, BTN_H, 4);
        this.ctx.fillStyle = hov ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)";
        this.ctx.fill();
        this.ctx.fillStyle = hov ? "#fff" : "#888";
        this.ctx.font = "14px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("+", gap.centerX, gap.centerY + 1);
      }
    }

    // --- Out-of-duration shadow overlay ---
    // Draw a translucent black mask over the region beyond the actual output duration
    // so the user can clearly see which content will be included in the render.
    const outputFrames = this.getDurationFrames();
    if (outputFrames < totalFrames) {
      const cutoffX = (outputFrames / totalFrames) * width;
      // Semi-transparent black overlay on both tracks
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      this.ctx.fillRect(cutoffX, RULER_HEIGHT, width - cutoffX, this.blockHeight + this.audioTrackHeight);
      // Subtle tinted ruler overlay
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      this.ctx.fillRect(cutoffX, 0, width - cutoffX, RULER_HEIGHT);
      /*
      // Dashed boundary line at the output duration cutoff
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(255, 80, 80, 0.7)";
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([5, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(cutoffX, 0);
      this.ctx.lineTo(cutoffX, CANVAS_HEIGHT);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.restore();
      */
    }

    // --- Draw Playhead ---
    const playheadX = (this.currentFrame / totalFrames) * width;

    // Playhead Line
    this.ctx.beginPath();
    this.ctx.moveTo(playheadX, 14);
    this.ctx.lineTo(playheadX, this.canvasHeight);
    this.ctx.strokeStyle = "#ff4444";
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    // Playhead Handle (Polygon above numbers)
    this.ctx.fillStyle = "#ff4444";
    this.ctx.beginPath();
    this.ctx.moveTo(playheadX - 6, 0);
    this.ctx.lineTo(playheadX + 6, 0);
    this.ctx.lineTo(playheadX + 6, 8);
    this.ctx.lineTo(playheadX, 14);
    this.ctx.lineTo(playheadX - 6, 8);
    this.ctx.fill();

    // Draw vertical grab bar on the right edge of viewport for resizing width
    const grabBarW = 4;
    const grabBarH = 50;
    const grabBarX = this.viewport.scrollLeft + this.viewport.clientWidth - grabBarW - 3;
    const grabBarY = RULER_HEIGHT + (this.blockHeight + this.audioTrackHeight - grabBarH) / 2;
    
    this.ctx.fillStyle = "rgba(40, 40, 40, 0.6)";
    this.ctx.beginPath();
    this.ctx.roundRect(grabBarX, grabBarY, grabBarW, grabBarH, 2);
    this.ctx.fill();

    // Draw horizontal grab bar at the bottom of viewport for resizing height
    const hBarW = 50;
    const hBarH = 4;
    const hBarX = this.viewport.scrollLeft + (this.viewport.clientWidth - hBarW) / 2;
    const hBarY = this.canvasHeight - hBarH - 3; // 3px from the bottom edge
    
    this.ctx.fillStyle = "rgba(20, 20, 20, 0.8)";
    this.ctx.beginPath();
    this.ctx.roundRect(hBarX, hBarY, hBarW, hBarH, 2);
    this.ctx.fill();

    this.updatePlayerUI();
  }

  drawAudioSegmentVisuals(ctx, seg, isSelected, yOffset, trackHeight, startX, pxWidth) {
    ctx.fillStyle = isSelected ? "#2a4a3a" : "#1a2a1a";
    ctx.fillRect(startX, yOffset + 2, pxWidth, trackHeight - 3);

    if (seg.waveformPeaks && pxWidth > 0) {
      ctx.fillStyle = isSelected ? "rgba(100, 255, 100, 0.6)" : "rgba(100, 255, 100, 0.3)";
      const startRatio = seg.trimStart / seg.audioDurationFrames;
      const endRatio = (seg.trimStart + seg.length) / seg.audioDurationFrames;
      const peakCount = seg.waveformPeaks.length;
      const centerY = yOffset + trackHeight / 2;

      ctx.beginPath();
      for (let i = 0; i < pxWidth; i++) {
        const pixelRatio = i / pxWidth;
        const globalRatio = startRatio + pixelRatio * (endRatio - startRatio);
        const peakIdx = Math.floor(globalRatio * peakCount);

        if (peakIdx >= 0 && peakIdx < peakCount) {
          const val = seg.waveformPeaks[peakIdx];
          const amp = (val * (trackHeight - 12) / 2) * 0.9;
          ctx.fillRect(startX + i, centerY - amp, 1, amp * 2);
        }
      }
    }

    ctx.strokeStyle = isSelected ? "#4fff8f" : "#000";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startX, yOffset + 2, pxWidth, trackHeight - 3);

    if (isSelected) {
      ctx.fillStyle = "#4fff8f";
      ctx.beginPath();
      ctx.roundRect(startX, yOffset + trackHeight / 2 - 12, 4, 24, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(startX + pxWidth - 4, yOffset + trackHeight / 2 - 12, 4, 24, 2);
      ctx.fill();
    }

    ctx.fillStyle = "#ccc";
    ctx.font = "11px sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.save();
    ctx.beginPath();
    ctx.rect(startX, yOffset + 2, pxWidth, trackHeight - 3);
    ctx.clip();

    let text = seg.fileName || ZH.audioTrack;
    const maxWidth = pxWidth - 12;
    if (ctx.measureText(text).width > maxWidth && maxWidth > 0) {
      while (text.length > 0 && ctx.measureText(text + "...").width > maxWidth) {
        text = text.slice(0, -1);
      }
      text = text + "...";
    }

    ctx.fillText(text, startX + 6, yOffset + 8);
    ctx.restore();
  }


  // --- Interaction Logic ---
  getHitTest(mouseX, mouseY) {
    const width = this.canvas.offsetWidth;
    const totalFrames = this.getVisualDurationFrames();

    // Check Playhead Handle first
    const playheadX = (this.currentFrame / totalFrames) * width;
    if (mouseY <= 24 && Math.abs(mouseX - playheadX) <= 12) {
      return { type: "playhead" };
    }

    if (mouseY <= RULER_HEIGHT) {
      return { type: "ruler" };
    }

    if (mouseY < RULER_HEIGHT || mouseY > this.canvasHeight) return null;

    const isAudioTrack = mouseY > RULER_HEIGHT + this.blockHeight;
    const trackSegments = isAudioTrack ? this.timeline.audioSegments : this.timeline.segments;
    const trackType = isAudioTrack ? "audio" : "image";

    if (trackSegments.length === 0) return null;

    // The variables width and totalFrames are already declared above.

    let sortedSegments = [...trackSegments]
      .map((s, i) => ({ ...s, originalIndex: i }))
      .sort((a, b) => a.start - b.start);

    const HANDLE_CORE = 4;

    for (let i = 0; i < sortedSegments.length; i++) {
      const seg = sortedSegments[i];
      const startX = (seg.start / totalFrames) * width;
      const pxWidth = (seg.length / totalFrames) * width;
      const endX = startX + pxWidth;

      const prevSeg = sortedSegments[i - 1];
      const nextSeg = sortedSegments[i + 1];

      const isLeftJoint = prevSeg && prevSeg.start + prevSeg.length === seg.start;
      if (!isLeftJoint) {
        if (Math.abs(mouseX - startX) <= HANDLE_HIT_PX) {
          return { type: "edge", index: seg.originalIndex, dir: "left", track: trackType };
        }
      }

      const isRightJoint = nextSeg && nextSeg.start === seg.start + seg.length;
      if (isRightJoint) {
        const dx = mouseX - endX;
        if (Math.abs(dx) <= HANDLE_HIT_PX) {
          if (dx < -HANDLE_CORE) {
            return { type: "edge", index: seg.originalIndex, dir: "right", track: trackType };
          } else if (dx > HANDLE_CORE) {
            return { type: "edge", index: nextSeg.originalIndex, dir: "left", track: trackType };
          } else {
            return { type: "joint", leftIndex: seg.originalIndex, rightIndex: nextSeg.originalIndex, track: trackType };
          }
        }
      } else {
        if (Math.abs(mouseX - endX) <= HANDLE_HIT_PX) {
          return { type: "edge", index: seg.originalIndex, dir: "right", track: trackType };
        }
      }
    }

    for (let i = 0; i < sortedSegments.length; i++) {
      const seg = sortedSegments[i];
      const startX = (seg.start / totalFrames) * width;
      const pxWidth = (seg.length / totalFrames) * width;
      const endX = startX + pxWidth;

      if (mouseX >= startX && mouseX < endX) {
        return { type: "center", index: seg.originalIndex, track: trackType };
      }
    }

    return null;
  }

  onMouseDown(e) {
    if (e.button !== 0) return;
    const { x, y } = this.getMousePos(e);

    const isOverDivider = Math.abs(y - (RULER_HEIGHT + this.blockHeight)) <= 4;
    if (isOverDivider) {
      this._isDragging = true;
      this._dragType = "divider";
      this._startBlockHeight = this.blockHeight;
      this._startAudioTrackHeight = this.audioTrackHeight;
      this._startY = y;
      return;
    }

    const isAtBottom = Math.abs(y - this.canvasHeight) <= 15;
    if (isAtBottom) {
      this._isDragging = true;
      this._dragType = "height_resize";
      this._startBlockHeight = this.blockHeight;
      this._startY = y;
      document.body.style.userSelect = "none";
      return;
    }

    const viewRect = this.viewport.getBoundingClientRect();
    const isAtRightEdge = Math.abs(e.clientX - viewRect.right) <= 20;
    if (isAtRightEdge) {
      this._isDragging = true;
      this._dragType = "width_resize";
      this._startNodeWidth = this.node.size[0];
      this._startX = e.clientX;
      document.body.style.userSelect = "none";
      return;
    }

    if (y >= RULER_HEIGHT && y <= this.canvasHeight) {
      const BTN_R = 12;
      const gapRegions = this.getGapRegions();
      for (let i = 0; i < gapRegions.length; i++) {
        const gap = gapRegions[i];
        if (gap.widthPx < BTN_R * 2 + 8) continue;
        const dx = x - gap.centerX, dy2 = y - gap.centerY;
        if (dx * dx + dy2 * dy2 <= BTN_R * BTN_R) {
          if (gap.track === "audio") {
            // Direct to audio upload
            this.promptAddAudioInGap(gap.frameStart, gap.frameEnd);
          } else {
            this.showGapMenu(e.clientX, e.clientY, gap);
          }
          return;
        }
      }
    }

    const hit = this.getHitTest(x, y);
    if (!hit) {
      // Only deselect if they clicked the same track but hit empty space
      const clickedTrack = y > RULER_HEIGHT + this.blockHeight ? "audio" : "image";
      if (this.selectionType === clickedTrack) {
        this.selectedIndex = -1;
        this.updateUIFromSelection();
      }
      this.render();
      return;
    }

    if (hit.type === "playhead" || hit.type === "ruler") {
      this._isDragging = true;
      this._dragType = "playhead";
      const logicalWidth = this.canvas.offsetWidth;
      const totalFrames = this.getVisualDurationFrames();
      let mouseFrameX = x * (totalFrames / logicalWidth);
      this.currentFrame = clamp(mouseFrameX, 0, totalFrames);
      this.render();
      if (this.isPlaying) {
        this.playAudio();
      }
      return;
    }

    this.selectionType = hit.track;
    const targetArray = hit.track === "audio" ? this.timeline.audioSegments : this.timeline.segments;

    if (hit.type === "joint") {
      this.selectedIndex = hit.leftIndex;
      this.updateUIFromSelection();
      this._dragType = "joint";
      this._dragTargetId = targetArray[hit.leftIndex].id;
      this._dragTargetIdRight = targetArray[hit.rightIndex].id;
    } else if (hit.type === "center") {
      this.selectedIndex = hit.index;
      this.updateUIFromSelection();
      this._dragType = "center";
    } else {
      if (this.selectedIndex !== hit.index) {
        this.selectedIndex = hit.index;
        this.updateUIFromSelection();
      }
      this._dragType = hit.dir;
    }

    this._isDragging = true;
    this._previewSegments = null;
    this._dragStartX = x;
    this._dragInitialTimeline = prCloneTimelineForPreview(targetArray);

    if (hit.type !== "joint") {
      this._dragTargetId = targetArray[hit.index].id;
    }
    this.render();
  }

  onMouseMove(e) {
    const { x: mouseX, y: mouseY } = this.getMousePos(e);

    if (!this._isDragging) {
      let newHoveredGapIdx = -1;
      const BTN_R = 12;
      const gapRegions = this.getGapRegions();
      for (let i = 0; i < gapRegions.length; i++) {
        const gap = gapRegions[i];
        if (gap.widthPx < BTN_R * 2 + 8) continue;
        const dx = mouseX - gap.centerX, dy2 = mouseY - gap.centerY;
        if (dx * dx + dy2 * dy2 <= BTN_R * BTN_R) { newHoveredGapIdx = i; break; }
      }
      if (this._hoveredGapIdx !== newHoveredGapIdx) {
        this._hoveredGapIdx = newHoveredGapIdx;
        this.render();
      }

      const isOverDivider = Math.abs(mouseY - (RULER_HEIGHT + this.blockHeight)) <= 4;
      const isAtBottom = Math.abs(mouseY - this.canvasHeight) <= 15;
      const viewRect = this.viewport.getBoundingClientRect();
      const isAtRightEdge = Math.abs(e.clientX - viewRect.right) <= 20;
      const hit = this.getHitTest(mouseX, mouseY);
      if (isOverDivider || isAtBottom) {
        this.canvas.style.cursor = "ns-resize";
      } else if (isAtRightEdge) {
        this.canvas.style.cursor = "ew-resize";
      } else if (newHoveredGapIdx >= 0) {
        this.canvas.style.cursor = "pointer";
      } else if (hit?.type === "edge") {
        this.canvas.style.cursor = "ew-resize";
      } else if (hit?.type === "joint") {
        this.canvas.style.cursor = "col-resize";
      } else if (hit?.type === "center") {
        this.canvas.style.cursor = "grab";
      } else if (hit?.type === "playhead") {
        this.canvas.style.cursor = "ew-resize";
      } else {
        this.canvas.style.cursor = "default";
      }
      return;
    }

    if (this._dragType === "divider") {
      this.canvas.style.cursor = "ns-resize";
      const deltaY = mouseY - this._startY;

      const minBlockH = 50;
      const minAudioH = 50;

      let newBlockHeight = this._startBlockHeight + deltaY;
      let newAudioTrackHeight = this._startAudioTrackHeight - deltaY;

      if (newBlockHeight < minBlockH) {
        newBlockHeight = minBlockH;
        newAudioTrackHeight = this._startBlockHeight + this._startAudioTrackHeight - minBlockH;
      }
      if (newAudioTrackHeight < minAudioH) {
        newAudioTrackHeight = minAudioH;
        newBlockHeight = this._startBlockHeight + this._startAudioTrackHeight - minAudioH;
      }

      this.blockHeight = newBlockHeight;
      this.audioTrackHeight = newAudioTrackHeight;

      this.render();
      return;
    }

    if (this._dragType === "height_resize") {
      this.canvas.style.cursor = "ns-resize";
      const deltaY = mouseY - this._startY;

      this.blockHeight = Math.max(100, this._startBlockHeight + deltaY);
      this.canvasHeight = this.rulerHeight + this.blockHeight + this.audioTrackHeight;

      this.canvas.style.height = `${this.canvasHeight}px`;

      this.resizeCanvas(this.canvas.offsetWidth);
      this.render();

      if (this.node && this.node.computeSize) {
        const sz = this.node.computeSize();
        this.node.size[1] = sz[1];
        if (window.app && window.app.graph) {
          window.app.graph.setDirtyCanvas(true, true);
        }
      }
      return;
    }

    if (this._dragType === "width_resize") {
      this.canvas.style.cursor = "ew-resize";
      const deltaX = e.clientX - this._startX;

      this.node.size[0] = Math.max(300, this._startNodeWidth + deltaX);

      if (window.app && window.app.graph) {
        window.app.graph.setDirtyCanvas(true, true);
      }
      return;
    }

    if (this._dragType === "playhead") {
      this.canvas.style.cursor = "ew-resize";
      const logicalWidth = this.canvas.offsetWidth;
      const totalFrames = this.getVisualDurationFrames();
      let mouseFrameX = mouseX * (totalFrames / logicalWidth);
      this.currentFrame = clamp(mouseFrameX, 0, totalFrames);
      this.render();
      if (this.isPlaying) {
        this.playAudio(); // Scrub (restart from new position)
      }
      return;
    }

    this.canvas.style.cursor = this._dragType === "center" ? "grabbing" :
      this._dragType === "joint" ? "col-resize" : "ew-resize";

    const logicalWidth = this.canvas.offsetWidth;
    const totalFrames = this.getVisualDurationFrames();
    const durationFrames = totalFrames;
    const dragDelta = Math.round((mouseX - this._dragStartX) * (totalFrames / logicalWidth));

    let t = prCloneTimelineForPreview(this._dragInitialTimeline);

    // --- Rolling Edit (Slide Edit) ---
    if (this._dragType === "joint") {
      let leftIdx = t.findIndex(s => s.id === this._dragTargetId);
      let rightIdx = t.findIndex(s => s.id === this._dragTargetIdRight);

      if (leftIdx >= 0 && rightIdx >= 0) {
        let origLeft = this._dragInitialTimeline.find(s => s.id === this._dragTargetId);
        let origRight = this._dragInitialTimeline.find(s => s.id === this._dragTargetIdRight);

        let maxDeltaRight = origRight.length - MIN_SEGMENT_LENGTH;
        let maxDeltaLeft = origLeft.length - MIN_SEGMENT_LENGTH;

        if (this.selectionType === "audio") {
          // Drag LEFT: right clip extends left by un-trimming its head.
          // Can only un-trim as much as the right clip has been trimmed (trimStart >= 0).
          maxDeltaLeft = Math.min(maxDeltaLeft, origRight.trimStart || 0);
          // Drag RIGHT: left clip extends right by consuming its remaining tail audio.
          // Can only extend as far as the left clip's unplayed tail allows.
          let availLeftTail = (origLeft.audioDurationFrames || origLeft.length) - ((origLeft.trimStart || 0) + origLeft.length);
          maxDeltaRight = Math.min(maxDeltaRight, availLeftTail);
        }

        let safeDelta = clamp(dragDelta, -maxDeltaLeft, maxDeltaRight);

        t[leftIdx].length = origLeft.length + safeDelta;
        t[rightIdx].start = origRight.start + safeDelta;
        t[rightIdx].length = origRight.length - safeDelta;

        if (this.selectionType === "audio") {
          t[rightIdx].trimStart = origRight.trimStart + safeDelta;
        }
      }
    }
    // --- Edge & Center Drags ---
    else {
      const targetIdx = t.findIndex((s) => s.id === this._dragTargetId);
      if (targetIdx < 0) return;

      if (this._dragType === "right") {
        let newLen = t[targetIdx].length + dragDelta;
        let maxPossibleLength = totalFrames - t[targetIdx].start;
        let nextSeg = t.find(s => s.start >= t[targetIdx].start + t[targetIdx].length && s.id !== t[targetIdx].id);
        if (nextSeg) {
          maxPossibleLength = nextSeg.start - t[targetIdx].start;
        }

        if (this.selectionType === "audio") {
          maxPossibleLength = Math.min(maxPossibleLength, (t[targetIdx].audioDurationFrames || t[targetIdx].length) - (t[targetIdx].trimStart || 0));
        }

        t[targetIdx].length = Math.max(MIN_SEGMENT_LENGTH, Math.min(newLen, maxPossibleLength));

      } else if (this._dragType === "left") {
        let newStart = t[targetIdx].start + dragDelta;
        let minPossibleStart = 0;
        let prevSeg = t.slice().reverse().find(s => s.start + s.length <= t[targetIdx].start && s.id !== t[targetIdx].id);
        if (prevSeg) {
          minPossibleStart = prevSeg.start + prevSeg.length;
        }

        if (this.selectionType === "audio") {
          minPossibleStart = Math.max(minPossibleStart, t[targetIdx].start - (t[targetIdx].trimStart || 0));
        }

        let maxStart = t[targetIdx].start + t[targetIdx].length - MIN_SEGMENT_LENGTH;
        newStart = Math.max(minPossibleStart, Math.min(newStart, maxStart));

        let diff = newStart - t[targetIdx].start;
        t[targetIdx].start = newStart;
        t[targetIdx].length -= diff;
        if (this.selectionType === "audio") {
          t[targetIdx].trimStart += diff;
        }

      } else if (this._dragType === "center") {
        let initT = this._dragInitialTimeline;
        let dIdx = initT.findIndex(s => s.id === this._dragTargetId);
        if (dIdx < 0) return;
        let D = { ...initT[dIdx] };

        let D_mouse_start = D.start + dragDelta;
        let mouseFrameX = mouseX * (totalFrames / logicalWidth);

        t = this._applyCenterDragPhysics(initT, D.id, D_mouse_start, mouseFrameX, durationFrames, totalFrames, logicalWidth);
      }
    }

    this._previewSegments = t;
    this.updateUIFromSelection(); // Live update of trim values
    this.render();
  }

  _applyCenterDragPhysics(initT, D_id, D_mouse_start, mouseFrameX, durationFrames, totalFrames, logicalWidth) {
    let t_copy = prCloneTimelineForPreview(initT);
    let dIdx = t_copy.findIndex(s => s.id === D_id);
    if (dIdx < 0) return t_copy;

    let D = t_copy[dIdx];
    let D_clamped_start = clamp(D_mouse_start, 0, durationFrames - D.length);

    let baseSegments = t_copy.filter(s => s.id !== D.id);

    let insertIdx = baseSegments.length;
    for (let i = 0; i < baseSegments.length; i++) {
      let centerBase = baseSegments[i].start + baseSegments[i].length / 2;
      if (mouseFrameX < centerBase) {
        insertIdx = i;
        break;
      }
    }

    let leftBound = insertIdx > 0 ? baseSegments[insertIdx - 1].start + baseSegments[insertIdx - 1].length : 0;
    let rightBound = insertIdx < baseSegments.length ? baseSegments[insertIdx].start : durationFrames;

    if (rightBound - leftBound >= D.length) {
      D_clamped_start = clamp(D_clamped_start, leftBound, rightBound - D.length);
    } else {
      let gapCenter = (leftBound + rightBound) / 2;
      D_clamped_start = gapCenter - D.length / 2;
    }

    let t_test = [];
    for (let i = 0; i < insertIdx; i++) {
      t_test.push({ ...baseSegments[i], original_start: baseSegments[i].start });
    }
    t_test.push({ ...D, start: D_clamped_start, original_start: D_clamped_start });
    let D_index = insertIdx;

    for (let i = insertIdx; i < baseSegments.length; i++) {
      t_test.push({ ...baseSegments[i], original_start: baseSegments[i].start });
    }

    for (let i = D_index + 1; i < t_test.length; i++) {
      let prev = t_test[i - 1];
      t_test[i].start = Math.max(t_test[i].original_start, prev.start + prev.length);
    }

    for (let i = D_index - 1; i >= 0; i--) {
      let next = t_test[i + 1];
      t_test[i].start = Math.min(t_test[i].original_start, next.start - t_test[i].length);
    }

    let rightCursor = durationFrames;
    for (let i = t_test.length - 1; i >= 0; i--) {
      if (t_test[i].start + t_test[i].length > rightCursor) {
        t_test[i].start = rightCursor - t_test[i].length;
      }
      rightCursor = t_test[i].start;
    }
    let leftCursor = 0;
    for (let i = 0; i < t_test.length; i++) {
      if (t_test[i].start < leftCursor) {
        t_test[i].start = leftCursor;
      }
      leftCursor = t_test[i].start + t_test[i].length;
    }

    let result = t_test.map(s => {
      let clean = { ...s };
      delete clean.original_start;
      return clean;
    });

    let draggedPreview = result.find(s => s.id === D.id);
    if (draggedPreview) {
      draggedPreview.resolvedStart = draggedPreview.start;
    }

    return result;
  }

  onMouseUp(e) {
    document.body.style.userSelect = "";
    if (this._isDragging) {
      if (this._previewSegments) {
        const targetArray = this.selectionType === "audio" ? this.timeline.audioSegments : this.timeline.segments;

        const mappedArray = this._previewSegments.map(ps => {
          const orig = targetArray.find(s => s.id === ps.id);
          let finalStart = ps.resolvedStart !== undefined ? ps.resolvedStart : ps.start;
          let newPs = { ...ps, start: finalStart };
          if (orig && orig.imgObj) newPs.imgObj = orig.imgObj;
          delete newPs.resolvedStart;
          return newPs;
        });

        if (this.selectionType === "audio") {
          this.timeline.audioSegments = mappedArray;
          if (this._dragTargetId) this.selectedIndex = this.timeline.audioSegments.findIndex(s => s.id === this._dragTargetId);
        } else {
          this.timeline.segments = mappedArray;
          if (this._dragTargetId) this.selectedIndex = this.timeline.segments.findIndex(s => s.id === this._dragTargetId);
        }
      }

      this._isDragging = false;
      this._previewSegments = null;
      this._ghostTrack = null;
      this.canvas.style.cursor = "default";
      this.commitChanges();
    }
  }

  // --- Backend Data Sync ---
  commitChanges(skipRender = false) {
    let sortedSegments = [...this.timeline.segments].sort((a, b) => a.start - b.start);
    let contiguousLengths = [];
    let contiguousPrompts = [];
    let currentCursor = 0;
    const durationFrames = this.getDurationFrames();

    // Build segment lengths clipped at the duration cutoff.
    // - Gaps before the first segment, or between segments, are absorbed into the adjacent
    //   segment's length (same as before), but are also clipped at durationFrames.
    // - Segments that start at or past the cutoff are excluded entirely.
    // - Segments that cross the cutoff are trimmed so their end = durationFrames exactly.
    let pendingGap = 0;
    for (let seg of sortedSegments) {
      // Skip segments entirely outside the duration.
      if (seg.start >= durationFrames) break;

      if (seg.start > currentCursor) {
        // Gap between the cursor and this segment -clip it at the cutoff too.
        const gapLength = Math.min(seg.start, durationFrames) - currentCursor;
        if (contiguousLengths.length > 0) {
          contiguousLengths[contiguousLengths.length - 1] += gapLength;
        } else {
          pendingGap += gapLength;
        }
      }

      // Clip segment end at the duration cutoff.
      const clippedEnd = Math.min(seg.start + seg.length, durationFrames);
      const clippedLength = clippedEnd - seg.start;

      contiguousLengths.push(clippedLength + pendingGap);
      contiguousPrompts.push(seg.prompt || "");
      pendingGap = 0;
      currentCursor = seg.start + seg.length; // advance by the real (unclipped) end for gap detection
    }

    // If segments don't fill to the end of the duration, pad the last segment to reach it.
    const clampedCursor = Math.min(currentCursor, durationFrames);
    if (contiguousLengths.length > 0 && clampedCursor < durationFrames) {
      contiguousLengths[contiguousLengths.length - 1] += durationFrames - clampedCursor;
    }

    const toSave = {
      segments: sortedSegments.map(prSegmentForTimelineSave),
      audioSegments: (this.timeline.audioSegments || []).map(s => ({ ...s }))
    };

    const jsonStr = JSON.stringify(toSave);
    if (this.timelineDataWidget) this.timelineDataWidget.value = jsonStr;

    if (this.localPromptsWidget) {
      this.localPromptsWidget.value = contiguousPrompts.join(" | ");
    }
    if (this.segmentLengthsWidget) {
      this.segmentLengthsWidget.value = contiguousLengths.join(",");
    }

    if (this.guideStrengthWidget) {
      const imgStrengths = sortedSegments
        .filter(s => s.type !== "text")
        .map(s => (s.guideStrength !== undefined ? s.guideStrength : 1.0).toFixed(2));
      this.guideStrengthWidget.value = imgStrengths.join(",");
    }

    // Keep zoom slider max in sync with the current timeline duration.
    this.updateZoomSliderMax();

    setTimeout(() => {
      if (this.node && this.node.computeSize) {
        const sz = this.node.computeSize();
        this.node.size[1] = sz[1];
        if (app.graph) app.graph.setDirtyCanvas(true, true);
      }
    }, 0);

    if (!skipRender) this.render();
  }

  // --- Gap Region Calculation ---
  getGapRegions() {
    const totalFrames = this.getVisualDurationFrames();
    const outputFrames = this.getDurationFrames();
    const width = this.canvas.offsetWidth || this._lastWidth || 0;
    const gaps = [];
    if (!width) return gaps;

    // Image gaps
    let cursor = 0;
    const sortedImg = [...this.timeline.segments].sort((a, b) => a.start - b.start);
    for (const seg of sortedImg) {
      if (seg.start > cursor) {
        const x0 = (cursor / totalFrames) * width;
        const x1 = (seg.start / totalFrames) * width;
        gaps.push({ track: 'image', frameStart: cursor, frameEnd: seg.start, centerX: (x0 + x1) / 2, centerY: RULER_HEIGHT + this.blockHeight / 2, widthPx: x1 - x0 });
      }
      cursor = seg.start + seg.length;
    }
    if (cursor < outputFrames) {
      const x0 = (cursor / totalFrames) * width;
      const x1 = (outputFrames / totalFrames) * width;
      gaps.push({ track: 'image', frameStart: cursor, frameEnd: outputFrames, centerX: (x0 + x1) / 2, centerY: RULER_HEIGHT + this.blockHeight / 2, widthPx: x1 - x0 });
    }

    // Audio gaps
    cursor = 0;
    const sortedAud = [...this.timeline.audioSegments].sort((a, b) => a.start - b.start);
    for (const seg of sortedAud) {
      if (seg.start > cursor) {
        const x0 = (cursor / totalFrames) * width;
        const x1 = (seg.start / totalFrames) * width;
        gaps.push({ track: 'audio', frameStart: cursor, frameEnd: seg.start, centerX: (x0 + x1) / 2, centerY: RULER_HEIGHT + this.blockHeight + this.audioTrackHeight / 2, widthPx: x1 - x0 });
      }
      cursor = seg.start + seg.length;
    }
    if (cursor < outputFrames) {
      const x0 = (cursor / totalFrames) * width;
      const x1 = (outputFrames / totalFrames) * width;
      gaps.push({ track: 'audio', frameStart: cursor, frameEnd: outputFrames, centerX: (x0 + x1) / 2, centerY: RULER_HEIGHT + this.blockHeight + this.audioTrackHeight / 2, widthPx: x1 - x0 });
    }

    return gaps;
  }

  promptAddAudioInGap(frameStart, frameEnd) {
    const fi = document.createElement("input");
    fi.type = "file";
    fi.accept = "audio/*";
    fi.addEventListener("change", (ev) => {
      if (ev.target.files?.[0]) this.handleAudioUpload([ev.target.files[0]], frameStart);
    });
    fi.click();
  }

  // --- Context Menu ---
  onContextMenu(e) {
    e.preventDefault();
    const { x: mouseX, y: mouseY } = this.getMousePos(e);

    const trackHeight = this.blockHeight;
    const isAudioTrack = mouseY >= RULER_HEIGHT + trackHeight && mouseY <= RULER_HEIGHT + trackHeight + this.audioTrackHeight;
    const isImageTrack = mouseY >= RULER_HEIGHT && mouseY <= RULER_HEIGHT + trackHeight;

    const logicalWidth = this.canvas.offsetWidth || 1;
    const totalFrames = this.getVisualDurationFrames();
    const cursor = mouseX * (totalFrames / logicalWidth);

    let clickedSeg = null;
    let trackType = "";

    if (isAudioTrack) {
      clickedSeg = this.timeline.audioSegments.find(s => cursor >= s.start && cursor <= s.start + s.length);
      trackType = "audio";
    } else if (isImageTrack) {
      clickedSeg = this.timeline.segments.find(s => cursor >= s.start && cursor <= s.start + s.length);
      trackType = clickedSeg ? clickedSeg.type : "";
    }

    if (clickedSeg) {
      this.showContextMenu(e.clientX, e.clientY, clickedSeg, trackType);
    } else if (isAudioTrack || isImageTrack) {
      const gapRegions = this.getGapRegions();
      const currentTrack = isAudioTrack ? "audio" : "image";
      let gap = gapRegions.find(g => cursor >= g.frameStart && cursor <= g.frameEnd && g.track === currentTrack);

      if (!gap) {
        const startFrame = Math.round(cursor);
        gap = {
          track: currentTrack,
          frameStart: startFrame,
          frameEnd: startFrame + Math.max(1, this.getFrameRate())
        };
      }
      gap.clickedFrame = cursor;

      this.showGapContextMenu(e.clientX, e.clientY, gap);
    }
  }

  showContextMenu(clientX, clientY, seg, trackType) {
    this.dismissContextMenu();
    const menu = document.createElement("div");
    menu.className = "pr-gap-menu";
    menu.style.left = `${clientX + 6}px`;
    menu.style.top = `${clientY - 10}px`;

    const isImage = trackType !== "audio" && trackType !== "text" && seg.imageB64;

    if (isImage) {
      const copyBtn = document.createElement("button");
      copyBtn.className = "pr-gap-menu-btn";
      copyBtn.innerHTML = ZH.copyImage;
      copyBtn.onclick = async () => {
        try {
          const res = await fetch(seg.imageB64);
          const blob = await res.blob();
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        } catch (err) {
          console.error("Failed to copy image", err);
        }
        this.dismissContextMenu();
      };
      menu.appendChild(copyBtn);

      const saveBtn = document.createElement("button");
      saveBtn.className = "pr-gap-menu-btn";
      saveBtn.innerHTML = ZH.saveImage;
      saveBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = seg.imageB64;
        a.download = "timeline_image.jpg";
        a.click();
        this.dismissContextMenu();
      };
      menu.appendChild(saveBtn);

      const openBtn = document.createElement("button");
      openBtn.className = "pr-gap-menu-btn";
      openBtn.innerHTML = ZH.openImage;
      openBtn.onclick = () => {
        const win = window.open();
        if (win) {
          win.document.write(`<body style="margin:0;display:flex;justify-content:center;align-items:center;background:#0e0e0e;height:100vh;"><img style="max-width:100%;max-height:100%;" src="${seg.imageB64}" /></body>`);
          win.document.close();
        }
        this.dismissContextMenu();
      };
      menu.appendChild(openBtn);
    }

    if (trackType !== "audio") {
      const copyPromptBtn = document.createElement("button");
      copyPromptBtn.className = "pr-gap-menu-btn";
      copyPromptBtn.innerHTML = ZH.copyPrompt;
      copyPromptBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(seg.prompt || "");
        } catch (err) {
          console.error("Failed to copy prompt", err);
        }
        this.dismissContextMenu();
      };
      menu.appendChild(copyPromptBtn);
    }

    const copySegBtn = document.createElement("button");
    copySegBtn.className = "pr-gap-menu-btn";
    copySegBtn.innerHTML = ZH.copySegment;
    copySegBtn.onclick = () => {
      this._copiedSegment = { ...seg, id: Date.now().toString() + Math.random().toString(36).substr(2, 5) };
      this._copiedSegmentTrack = trackType === "audio" ? "audio" : "image";
      this.dismissContextMenu();
    };
    menu.appendChild(copySegBtn);

    const currentTrack = trackType === "audio" ? "audio" : "image";
    if (this._copiedSegment && this._copiedSegmentTrack === currentTrack) {
      const pasteReplaceBtn = document.createElement("button");
      pasteReplaceBtn.className = "pr-gap-menu-btn";
      pasteReplaceBtn.innerHTML = ZH.pasteReplace;
      pasteReplaceBtn.onclick = () => {
        const newSeg = {
          ...this._copiedSegment,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          start: seg.start,
          length: this._copiedSegment.length
        };
        const targetArray = currentTrack === "audio" ? this.timeline.audioSegments : this.timeline.segments;
        const idx = targetArray.findIndex(s => s.id === seg.id);
        if (idx >= 0) targetArray[idx] = newSeg;
        this.commitChanges();
        this.dismissContextMenu();
      };
      menu.appendChild(pasteReplaceBtn);
    }

    const delBtn = document.createElement("button");
    delBtn.className = "pr-gap-menu-btn";
    delBtn.innerHTML = ZH.delete;
    delBtn.style.color = "#ff4444";
    delBtn.onclick = () => {
      this.selectionType = trackType === "audio" ? "audio" : "image";
      const list = trackType === "audio" ? this.timeline.audioSegments : this.timeline.segments;
      this.selectedIndex = list.findIndex(s => s.id === seg.id);
      this.deleteSelectedSegment();
      this.dismissContextMenu();
    };
    menu.appendChild(delBtn);

    document.body.appendChild(menu);
    this._contextMenu = menu;

    setTimeout(() => {
      this._contextMenuDismisser = (ev) => { if (!menu.contains(ev.target)) this.dismissContextMenu(); };
      document.addEventListener("pointerdown", this._contextMenuDismisser, true);
    }, 0);
  }

  showGapContextMenu(clientX, clientY, gap) {
    this.dismissContextMenu();
    const menu = document.createElement("div");
    menu.className = "pr-gap-menu";
    menu.style.left = `${clientX + 6}px`;
    menu.style.top = `${clientY - 10}px`;

    const currentTrack = gap.track === "audio" ? "audio" : "image";

    if (this._copiedSegment && this._copiedSegmentTrack === currentTrack) {
      const pasteBtn = document.createElement("button");
      pasteBtn.className = "pr-gap-menu-btn";
      pasteBtn.innerHTML = ZH.pasteSegment;
      pasteBtn.onclick = () => {
        const startFrame = Math.round(gap.clickedFrame !== undefined ? gap.clickedFrame : gap.frameStart);
        const gapLength = gap.frameEnd - startFrame;

        const newSeg = {
          ...this._copiedSegment,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          start: startFrame,
          length: Math.min(this._copiedSegment.length, gapLength)
        };
        const targetArray = currentTrack === "audio" ? this.timeline.audioSegments : this.timeline.segments;
        targetArray.push(newSeg);
        targetArray.sort((a, b) => a.start - b.start);
        this.commitChanges();
        this.dismissContextMenu();
      };
      menu.appendChild(pasteBtn);
    }

    if (currentTrack === "image") {
      const textBtn = document.createElement("button");
      textBtn.className = "pr-gap-menu-btn";
      textBtn.innerHTML = `${ICONS.text} ${ZH.textSegment}`;
      textBtn.onclick = () => {
        this.addSegmentInGap(gap.frameStart, gap.frameEnd, "text");
        this.dismissContextMenu();
      };
      menu.appendChild(textBtn);

      const imgBtn = document.createElement("button");
      imgBtn.className = "pr-gap-menu-btn";
      imgBtn.innerHTML = `${ICONS.upload} ${ZH.imageSegment}`;
      imgBtn.onclick = () => {
        this.dismissContextMenu();
        const fi = document.createElement("input");
        fi.type = "file"; fi.accept = "image/*";
        fi.addEventListener("change", (ev) => {
          if (ev.target.files?.[0]) {
            const gapLength = gap.frameEnd - gap.frameStart;
            this.handleImageUpload([ev.target.files[0]], gap.frameStart, gapLength);
          }
        });
        fi.click();
      };
      menu.appendChild(imgBtn);
    }

    document.body.appendChild(menu);
    this._contextMenu = menu;
    setTimeout(() => {
      this._contextMenuDismisser = (ev) => { if (!menu.contains(ev.target)) this.dismissContextMenu(); };
      document.addEventListener("pointerdown", this._contextMenuDismisser, true);
    }, 0);
  }
  dismissContextMenu() {
    if (this._contextMenu) { this._contextMenu.remove(); this._contextMenu = null; }
    if (this._contextMenuDismisser) { document.removeEventListener("pointerdown", this._contextMenuDismisser, true); this._contextMenuDismisser = null; }
  }

  // --- Gap Popup Menu ---
  showGapMenu(clientX, clientY, gap) {
    this.dismissGapMenu();
    const menu = document.createElement("div");
    menu.className = "pr-gap-menu";
    menu.style.left = `${clientX + 6}px`;
    menu.style.top = `${clientY - 10}px`;

    const textBtn = document.createElement("button");
    textBtn.className = "pr-gap-menu-btn";
    textBtn.innerHTML = `${ICONS.text} ${ZH.textSegment}`;
    textBtn.addEventListener("click", () => {
      this.addSegmentInGap(gap.frameStart, gap.frameEnd, "text");
      this.dismissGapMenu();
    });

    const imgBtn = document.createElement("button");
    imgBtn.className = "pr-gap-menu-btn";
    imgBtn.innerHTML = `${ICONS.upload} ${ZH.imageSegment}`;
    imgBtn.addEventListener("click", () => {
      this.dismissGapMenu();
      const fi = document.createElement("input");
      fi.type = "file"; fi.accept = "image/*";
      fi.addEventListener("change", (ev) => {
        if (ev.target.files?.[0]) {
          const gapLength = gap.frameEnd - gap.frameStart;
          this.handleImageUpload([ev.target.files[0]], gap.frameStart, gapLength);
        }
      });
      fi.click();
    });

    menu.appendChild(textBtn);
    menu.appendChild(imgBtn);
    const currentTrack = gap.track === "audio" ? "audio" : "image";
    if (this._copiedSegment && this._copiedSegmentTrack === currentTrack) {
      const pasteBtn = document.createElement("button");
      pasteBtn.className = "pr-gap-menu-btn";
      pasteBtn.innerHTML = ZH.pasteSegment;
      pasteBtn.onclick = () => {
        const gapLength = gap.frameEnd - gap.frameStart;

        let finalLength = Math.min(this._copiedSegment.length, gapLength);
        if (currentTrack === "image") {
          finalLength = gapLength;
        }

        const newSeg = {
          ...this._copiedSegment,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          start: gap.frameStart,
          length: finalLength
        };
        const targetArray = currentTrack === "audio" ? this.timeline.audioSegments : this.timeline.segments;
        targetArray.push(newSeg);
        targetArray.sort((a, b) => a.start - b.start);
        this.commitChanges();
        this.dismissGapMenu();
      };
      menu.appendChild(pasteBtn);
    }

    document.body.appendChild(menu);
    this._gapMenu = menu;
    setTimeout(() => {
      this._gapMenuDismisser = (ev) => { if (!menu.contains(ev.target)) this.dismissGapMenu(); };
      document.addEventListener("pointerdown", this._gapMenuDismisser, true);
    }, 0);
  }

  dismissGapMenu() {
    if (this._gapMenu) { this._gapMenu.remove(); this._gapMenu = null; }
    if (this._gapMenuDismisser) { document.removeEventListener("pointerdown", this._gapMenuDismisser, true); this._gapMenuDismisser = null; }
  }

  // --- Settings Menu ---
  // Widgets that are managed by the settings menu (hidden from node by default).
  get _settingsWidgetNames() {
    return ["display_mode", "epsilon", "divisible_by", "img_compression"];
  }

  // Hide all settings widgets on the node (called on init).
  hideSettingsWidgets() {
    for (const name of this._settingsWidgetNames) {
      const w = this.node.widgets?.find(w => w.name === name);
      if (w) hideWidget(w);

      // Also remove corresponding input slot if it exists and is NOT connected
      // to prevent overlapping issues in classic ComfyUI (nodes v1)
      if (this.node.inputs) {
        const inputIdx = this.node.inputs.findIndex(i => i.name === name);
        if (inputIdx !== -1) {
          const input = this.node.inputs[inputIdx];
          if (input.link == null) {
            this.node.removeInput(inputIdx);
          }
        }
      }
    }
    this.updateWidgetVisibility();

    // Workaround: toggle display mode to force ComfyUI to refresh the node
    if (this.displayModeWidget) {
      const origVal = this.displayModeWidget.value;
      const otherVal = prDisplayModeValue(prNormalizeDisplayMode(origVal) === "frames" ? "seconds" : "frames");

      this.displayModeWidget.value = otherVal;
      if (this.displayModeWidget.callback) this.displayModeWidget.callback(otherVal);

      this.displayModeWidget.value = origVal;
      if (this.displayModeWidget.callback) this.displayModeWidget.callback(origVal);
    }
  }

  // Restore all settings widgets on the node.
  showSettingsWidgets() {
    for (const name of this._settingsWidgetNames) {
      const w = this.node.widgets?.find(w => w.name === name);
      if (!w) continue;
      
      const typeMap = {
        display_mode: "combo", epsilon: "FLOAT", divisible_by: "INT",
        img_compression: "INT",
      };
      w.type = typeMap[name] || w._origType || "number";
      w.hidden = false;
      if (w.options) w.options.hidden = false;
      delete w.computeSize;
      if (w.element) w.element.style.display = "";
    }
    this.updateWidgetVisibility();

    // Workaround: toggle display mode to force ComfyUI to refresh the node
    if (this.displayModeWidget) {
      const origVal = this.displayModeWidget.value;
      const otherVal = prDisplayModeValue(prNormalizeDisplayMode(origVal) === "frames" ? "seconds" : "frames");

      this.displayModeWidget.value = otherVal;
      if (this.displayModeWidget.callback) this.displayModeWidget.callback(otherVal);

      this.displayModeWidget.value = origVal;
      if (this.displayModeWidget.callback) this.displayModeWidget.callback(origVal);
    }
  }

  _makeSettingRow(label, inputEl) {
    const row = document.createElement("div");
    row.className = "pr-settings-row";
    const lbl = document.createElement("span");
    lbl.className = "pr-settings-label";
    lbl.textContent = label;
    row.appendChild(lbl);
    row.appendChild(inputEl);
    return row;
  }

  showSettingsMenu(anchorEl) {
    this.dismissSettingsMenu();
    const menu = document.createElement("div");
    menu.className = "pr-settings-menu";

    // Title & Close Button Container
    const titleContainer = document.createElement("div");
    titleContainer.className = "pr-settings-title";
    titleContainer.style.display = "flex";
    titleContainer.style.justifyContent = "space-between";
    titleContainer.style.alignItems = "center";

    const titleText = document.createElement("span");
    titleText.textContent = ZH.timelineSettings;
    titleContainer.appendChild(titleText);

    const closeBtn = document.createElement("button");
    closeBtn.className = "pr-settings-close-btn";
    closeBtn.innerHTML = ICONS.close;
    closeBtn.title = ZH.closeSettings;
    closeBtn.addEventListener("click", () => this.dismissSettingsMenu());
    titleContainer.appendChild(closeBtn);

    menu.appendChild(titleContainer);

    // Helper: fire a widget's callback safely
    const fireCallback = (w, val) => {
      w.value = val;
      if (w.callback) {
        try { w.callback(val, app.canvas, this.node, null, null); } catch (e) { }
      }
      if (window.app && window.app.graph) window.app.graph.setDirtyCanvas(true, true);
    };

    // --- Display Mode ---
    const dmWidget = this.node.widgets?.find(w => w.name === "display_mode");
    if (dmWidget) {
      const ctrl = document.createElement("div");
      ctrl.className = "pr-segmented-control";

      const framesSeg = document.createElement("div");
      framesSeg.className = "pr-segment";
      framesSeg.textContent = ZH.frames;

      const secondsSeg = document.createElement("div");
      secondsSeg.className = "pr-segment";
      secondsSeg.textContent = ZH.seconds;

      const updateActive = (val) => {
        if (prNormalizeDisplayMode(val) === "frames") {
          framesSeg.classList.add("active");
          secondsSeg.classList.remove("active");
        } else {
          secondsSeg.classList.add("active");
          framesSeg.classList.remove("active");
        }
      };

      updateActive(dmWidget.value);

      const onSegClick = (val) => {
        fireCallback(dmWidget, prDisplayModeValue(val));
        updateActive(val);
        // Update ruler/timecode immediately
        if (this.updateWidgetVisibility) this.updateWidgetVisibility();
        if (this.updateUIFromSelection) this.updateUIFromSelection();
        this.render();
      };

      framesSeg.addEventListener("click", () => onSegClick("frames"));
      secondsSeg.addEventListener("click", () => onSegClick("seconds"));

      ctrl.appendChild(secondsSeg);
      ctrl.appendChild(framesSeg);

      menu.appendChild(this._makeSettingRow(ZH.displayMode, ctrl));
    }

    const divider1 = document.createElement("hr");
    divider1.className = "pr-settings-divider";
    menu.appendChild(divider1);

    // Helper to create scrubbable number control with horizontal buttons
    const createScrubbableNumberControl = (w, step, min, max, isFloat = false) => {
      const container = document.createElement("div");
      container.className = "pr-number-control";

      const decBtn = document.createElement("button");
      decBtn.className = "pr-number-btn";
      decBtn.textContent = "-";

      const inp = document.createElement("input");
      inp.type = "number";
      inp.className = "pr-settings-input";
      inp.value = w.value;
      inp.step = step.toString();
      inp.min = min.toString();
      inp.max = max.toString();

      const incBtn = document.createElement("button");
      incBtn.className = "pr-number-btn";
      incBtn.textContent = "+";

      decBtn.addEventListener("click", () => {
        let val = parseFloat(inp.value) - step;
        if (val < min) val = min;
        inp.value = isFloat ? val.toFixed(4) : Math.round(val);
        fireCallback(w, parseFloat(inp.value));
      });

      incBtn.addEventListener("click", () => {
        let val = parseFloat(inp.value) + step;
        if (val > max) val = max;
        inp.value = isFloat ? val.toFixed(4) : Math.round(val);
        fireCallback(w, parseFloat(inp.value));
      });

      inp.addEventListener("change", () => {
        let val = parseFloat(inp.value);
        if (isNaN(val)) val = w.value;
        if (val < min) val = min;
        if (val > max) val = max;
        inp.value = isFloat ? val.toFixed(4) : Math.round(val);
        fireCallback(w, parseFloat(inp.value));
      });

      // Dragging logic
      let isDragging = false;
      let startX = 0;
      let startVal = 0;
      let hasMoved = false;

      inp.style.cursor = "ew-resize";

      inp.addEventListener("mousedown", (e) => {
        startX = e.clientX;
        startVal = parseFloat(inp.value);
        hasMoved = false;

        const onMouseMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          if (Math.abs(deltaX) > 3) {
            hasMoved = true;
            isDragging = true;
          }

          if (isDragging) {
            moveEvent.preventDefault();
            const sensitivity = isFloat ? 0.001 : 0.5;
            let newVal = startVal + deltaX * sensitivity;

            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;

            inp.value = isFloat ? newVal.toFixed(4) : Math.round(newVal);
            fireCallback(w, parseFloat(inp.value));
          }
        };

        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);

          if (!hasMoved) {
            inp.focus();
            inp.select();
          }
          isDragging = false;
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });

      container.appendChild(decBtn);
      container.appendChild(inp);
      container.appendChild(incBtn);

      return container;
    };

    // --- Epsilon ---
    const epsWidget = this.node.widgets?.find(w => w.name === "epsilon");
    if (epsWidget) {
      menu.appendChild(this._makeSettingRow(ZH.epsilon, createScrubbableNumberControl(epsWidget, 0.0001, 0.0001, 0.99, true)));
    }

    // --- Divisible By ---
    const divByWidget = this.node.widgets?.find(w => w.name === "divisible_by");
    if (divByWidget) {
      menu.appendChild(this._makeSettingRow(ZH.divisibleBy, createScrubbableNumberControl(divByWidget, 1, 1, 256, false)));
    }

    // --- Img Compression ---
    const compWidget = this.node.widgets?.find(w => w.name === "img_compression");
    if (compWidget) {
      menu.appendChild(this._makeSettingRow(ZH.imgCompression, createScrubbableNumberControl(compWidget, 1, 0, 100, false)));
    }

    // --- Global Prompt Toggle ---
    const globalPromptWidget = this.node.widgets?.find(w => w.name === "global_prompt");
    if (globalPromptWidget) {
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !(globalPromptWidget.options && globalPromptWidget.options.hidden);
      cb.style.cursor = "pointer";
      cb.addEventListener("change", () => {
        const isVisible = cb.checked;
        if (!globalPromptWidget.options) globalPromptWidget.options = {};
        globalPromptWidget.options.hidden = !isVisible;

        if (isVisible) {
          delete globalPromptWidget.computeSize;
          globalPromptWidget.hidden = false;
          if (globalPromptWidget.element) globalPromptWidget.element.style.display = "";
        } else {
          globalPromptWidget.computeSize = () => [0, 0];
          globalPromptWidget.hidden = true;
          if (globalPromptWidget.element) globalPromptWidget.element.style.display = "none";
        }

        // Force refresh via display mode double-toggle trick
        if (this.displayModeWidget) {
          const origVal = this.displayModeWidget.value;
          const otherVal = prDisplayModeValue(prNormalizeDisplayMode(origVal) === "frames" ? "seconds" : "frames");
          this.displayModeWidget.value = otherVal;
          if (this.displayModeWidget.callback) this.displayModeWidget.callback(otherVal);
          this.displayModeWidget.value = origVal;
          if (this.displayModeWidget.callback) this.displayModeWidget.callback(origVal);
        }
      });
      menu.appendChild(this._makeSettingRow(ZH.useGlobalPrompt, cb));
    }


    // --- Show/Hide on Node Toggle ---
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "pr-settings-toggle-btn";
    const widgetsVisible = !!(this.node.widgets?.find(w => w.name === "display_mode" && !(w.options && w.options.hidden)));
    toggleBtn.textContent = widgetsVisible ? ZH.hideWidgets : ZH.showWidgets;
    toggleBtn.addEventListener("click", () => {
      const nowVisible = !!(this.node.widgets?.find(w => w.name === "display_mode" && !(w.options && w.options.hidden)));
      if (nowVisible) {
        this.hideSettingsWidgets();
        toggleBtn.textContent = ZH.showWidgets;
      } else {
        this.showSettingsWidgets();
        toggleBtn.textContent = ZH.hideWidgets;
      }
    });
    menu.appendChild(toggleBtn);

    // Position the menu below the anchor button (pop down)
    document.body.appendChild(menu);
    const rect = anchorEl.getBoundingClientRect();
    const menuW = menu.offsetWidth || 230;
    const menuH = menu.offsetHeight || 350;
    let left = rect.right - menuW;
    let top = rect.bottom + 6;
    if (left < 4) left = 4;
    // Fallback to top if it overflows the bottom of the screen
    if (top + menuH > window.innerHeight - 4) {
      top = rect.top - menuH - 6;
    }
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    this._settingsMenu = menu;
    setTimeout(() => {
      this._settingsDismisser = (ev) => {
        if (!menu.contains(ev.target) && !anchorEl.contains(ev.target)) this.dismissSettingsMenu();
      };
      document.addEventListener("mousedown", this._settingsDismisser);
    }, 0);
  }

  dismissSettingsMenu() {
    if (this._settingsMenu) { this._settingsMenu.remove(); this._settingsMenu = null; }
    if (this._settingsDismisser) { document.removeEventListener("mousedown", this._settingsDismisser); this._settingsDismisser = null; }
  }


  addSegmentInGap(frameStart, frameEnd, type = "text") {
    const seg = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      start: frameStart, length: frameEnd - frameStart,
      prompt: "", type,
    };
    this.timeline.segments.push(seg);
    this.timeline.segments.sort((a, b) => a.start - b.start);
    this.selectionType = "image";
    this.selectedIndex = this.timeline.segments.findIndex(s => s.id === seg.id);
    this.updateUIFromSelection();
    this.commitChanges();
  }

  addTextSegmentFreeSpace() {
    const frameRate = this.getFrameRate();
    const newLength = Math.max(1, frameRate); // 1 second default
    const sorted = [...this.timeline.segments].sort((a, b) => a.start - b.start);
    let newStart = 0;
    for (const seg of sorted) {
      if (newStart + newLength <= seg.start) break;
      newStart = Math.max(newStart, seg.start + seg.length);
    }
    // Place the segment at the first free slot in the visual timeline (no output duration change).
    const durationFrames = this.getVisualDurationFrames();
    const seg = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      start: newStart, length: Math.min(newLength, Math.max(newLength, durationFrames - newStart)),
      prompt: "", type: "text",
    };
    this.timeline.segments.push(seg);
    this.timeline.segments.sort((a, b) => a.start - b.start);
    this.selectionType = "image";
    this.selectedIndex = this.timeline.segments.findIndex(s => s.id === seg.id);
    this.updateUIFromSelection();
    this.commitChanges();
  }

  // --- Audio Player Engine ---
  updatePlayerUI() {
    if (!this.playBtn || !this.loopBtn) return;
    this.playBtn.innerHTML = this.isPlaying ? ICONS.pause : ICONS.play;
    if (this.isLooping) {
      this.loopBtn.classList.add("active");
    } else {
      this.loopBtn.classList.remove("active");
    }
    if (this.seekBar) {
      this.seekBar.max = this.getVisualDurationFrames();
      this.seekBar.value = this.currentFrame;
    }
    if (this.timeCodeDisplay) {
      this.timeCodeDisplay.textContent = this.formatTime(this.currentFrame);
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pauseAudio();
    } else {
      if (this.currentFrame >= this.getVisualDurationFrames()) {
        this.currentFrame = 0;
      }
      this.playAudio();
    }
  }

  toggleLoop() {
    this.isLooping = !this.isLooping;
    this.updatePlayerUI();
  }

  async playAudio() {
    this.pauseAudio(true); // clear any existing playback, but don't suspend context if scrubbing

    this._playCounter = (this._playCounter || 0) + 1;
    const playId = this._playCounter;
    this._currentPlayId = playId;
    this.isPlaying = true;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state !== 'running') {
      try { await this.audioContext.resume(); } catch (e) { }
    }
    if (this._currentPlayId !== playId || !this.isPlaying) return;

    this.updatePlayerUI();

    const frameRate = this.getFrameRate();
    this.playbackStartFrame = this.currentFrame;
    this.playbackStartTime = this.audioContext.currentTime;

    // Decode and schedule all audio segments that happen AT or AFTER currentFrame
    for (let seg of this.timeline.audioSegments) {
      const segStartFrame = seg.start;
      const segEndFrame = seg.start + seg.length;

      if (segEndFrame <= this.currentFrame) continue;

      try {
        // Build audio buffer: fetch from server URL if audioFile is set, otherwise fall back to audioB64
        let audioBuffer;
        if (seg.audioFile) {
          const audioUrl = api.apiURL(`/view?filename=${encodeURIComponent(seg.audioFile.split("/").pop())}&type=input&subfolder=${encodeURIComponent(seg.audioFile.includes("/") ? seg.audioFile.split("/").slice(0, -1).join("/") : "")}`);
          const resp = await fetch(audioUrl);
          const arrayBuffer = await resp.arrayBuffer();
          audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        } else if (seg.audioB64) {
          const binaryString = window.atob(seg.audioB64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
        } else {
          continue;
        }
        if (this._currentPlayId !== playId || !this.isPlaying) return;

        const framesToSkipInSegment = Math.max(0, this.currentFrame - segStartFrame);
        const waitFrames = Math.max(0, segStartFrame - this.currentFrame);
        const waitTimeSec = waitFrames / frameRate;

        const fileOffsetFrames = seg.trimStart + framesToSkipInSegment;
        const fileOffsetSec = fileOffsetFrames / frameRate;

        const playDurationFrames = seg.length - framesToSkipInSegment;
        const playDurationSec = playDurationFrames / frameRate;

        if (playDurationSec <= 0) continue;

        const bufferNode = this.audioContext.createBufferSource();
        bufferNode.buffer = audioBuffer;
        bufferNode["connect"](this.audioContext.destination);

        const startTime = this.audioContext.currentTime + waitTimeSec;
        bufferNode.start(startTime, fileOffsetSec, playDurationSec);

        this.activeAudioNodes.push(bufferNode);
      } catch (err) {
        console.error("Playback decode error for segment:", err);
      }
    }

    if (this._currentPlayId !== playId || !this.isPlaying) return;

    const loop = () => {
      if (!this.isPlaying || this._currentPlayId !== playId) return;

      const elapsedSec = this.audioContext.currentTime - this.playbackStartTime;
      const elapsedFrames = elapsedSec * frameRate;

      this.currentFrame = this.playbackStartFrame + elapsedFrames;

      const visualDurationFrames = this.getVisualDurationFrames();
      const durationFrames = this.getDurationFrames();

      if (this.isLooping) {
        const loopBound = (this.playbackStartFrame >= durationFrames) ? visualDurationFrames : durationFrames;
        if (this.currentFrame >= loopBound) {
          this.currentFrame = 0;
          this.playAudio(); // Restart playback
          return;
        }
      } else {
        if (this.currentFrame >= visualDurationFrames) {
          this.currentFrame = visualDurationFrames;
          this.pauseAudio();
          this.render();
          return;
        }
      }

      this.render();
      this._playLoopId = requestAnimationFrame(loop);
    };

    this._playLoopId = requestAnimationFrame(loop);
  }

  pauseAudio(isScrubbing = false) {
    this.isPlaying = false;
    this._currentPlayId = null;

    if (!isScrubbing && this.audioContext && this.audioContext.state === 'running') {
      try { this.audioContext.suspend(); } catch (e) { }
    }

    for (let node of this.activeAudioNodes) {
      try { node.stop(); } catch (e) { }
      try { node.disconnect(); } catch (e) { }
    }
    this.activeAudioNodes = [];

    if (this._playLoopId) {
      cancelAnimationFrame(this._playLoopId);
      this._playLoopId = null;
    }
    this.updatePlayerUI();
  }
}

// --- Node Registration Hooks ---
const APPENDED_WIDGET_DEFAULTS = [
  ["timeline_data", "{}"],
  ["local_prompts", ""],
  ["segment_lengths", ""],
];

app.registerExtension({
  name: "SF-LTXDirector",
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "SF-LTXDirector" || SIX_GRID_NODE_TYPES.includes(nodeData.name)) {

      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        if (onNodeCreated) onNodeCreated.apply(this, arguments);

        prApplySixGridChineseLabels(this);
        prRepairSixGridWidgetValues(this);

        for (const [name, def] of APPENDED_WIDGET_DEFAULTS) {
          if (!this.widgets?.find(w => w.name === name)) {
            this.addWidget("string", name, def, () => { });
          }
        }
        prHideSixGridInternalWidgets(this);

        // Set default width to be wider on creation (approx 2.5x default ~220px)
        this.size[0] = 1000;

        // Force default for img_compression if not set (ComfyUI sometimes skips optional defaults)
        const compWidget = this.widgets?.find(w => w.name === "img_compression");
        if (compWidget && (compWidget.value === undefined || compWidget.value === null || compWidget.value === 0)) {
          compWidget.value = 18;
        }

        // Hide global prompt by default on creation without destroying its DOM element
        const globalPromptWidget = this.widgets?.find(w => w.name === "global_prompt");
        if (globalPromptWidget) {
          if (!globalPromptWidget.options) globalPromptWidget.options = {};
          globalPromptWidget.options.hidden = true;
          globalPromptWidget.hidden = true;
          globalPromptWidget.computeSize = () => [0, 0];
          setTimeout(() => {
            if (globalPromptWidget.element) globalPromptWidget.element.style.display = "none";
          }, 0);
        }

        prApplySixGridChineseLabels(this);
        prRepairSixGridWidgetValues(this);

        const container = document.createElement("div");
        const widget = this.addDOMWidget("timeline_ui", "timeline_ui", container, {
          getValue: () => "",
          setValue: () => { },
        });

        widget.computeSize = function (width) {
          const canvasH = self._timelineEditor ? self._timelineEditor.canvasHeight : CANVAS_HEIGHT;
          return [width, canvasH + 235];
        };

        const self = this;
        setTimeout(() => {
          try {
            self._timelineEditor = new TimelineEditor(self, container, widget);
            if (prIsSixGridDirector(self)) {
              setTimeout(() => self._timelineEditor?.requestSixGridAutoRefresh("init"), 250);
            }
          } catch (err) {
            console.error("[PromptRelay] timeline editor init failed:", err);
          }
        }, 0);
      };

      const onRemoved = nodeType.prototype.onRemoved;
      nodeType.prototype.onRemoved = function () {
        this._timelineEditor?.destroy();
        return onRemoved?.apply(this, arguments);
      };

      const onConfigure = nodeType.prototype.onConfigure;
      nodeType.prototype.onConfigure = function (info) {
        const out = onConfigure?.apply(this, arguments);
        prApplySixGridChineseLabels(this);
        prRepairSixGridWidgetValues(this);
        for (const [name, def] of APPENDED_WIDGET_DEFAULTS) {
          const w = this.widgets.find(x => x.name === name);
          if (w && (w.value == null || w.value === "")) w.value = def;
        }
        prHideSixGridInternalWidgets(this);

        setTimeout(() => {
          prApplySixGridChineseLabels(this);
          prRepairSixGridWidgetValues(this);
          prHideSixGridInternalWidgets(this);
          if (this._timelineEditor) {
            this._timelineEditor.timeline = parseInitial(this._timelineEditor.timelineDataWidget?.value);
            this._timelineEditor.loadImages();
            this._timelineEditor.selectionType = "image";
            this._timelineEditor.selectedIndex = clamp(
              this._timelineEditor.selectedIndex, -1,
              Math.max(-1, this._timelineEditor.timeline.segments.length - 1)
            );
            this._timelineEditor.updateUIFromSelection();
            this._timelineEditor.render();
          }
        }, 0);
        return out;
      };
    }
  },
});
