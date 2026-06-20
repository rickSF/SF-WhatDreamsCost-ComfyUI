import json
import logging
import re
from uuid import uuid4

import torch

import comfy.model_management
from comfy_api.latest import io

from .ltx_director import (
    GuideData,
    _build_combined_audio,
    _compress_image,
    _encode_relay,
    _resize_image,
)

log = logging.getLogger(__name__)

MAX_AUTO_SEGMENTS = 9
SHOT_WORDS = ("\u5206\u955c", "\u955c\u5934", "\u753b\u9762", "shot")
CHINESE_NUMERALS = "\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341"
CHINESE_COMMA = "\uff0c"

# SF 扩展：宫格位置关键词（用于识别"左上，""中上，"等内联标注）
GRID_POSITION_WORDS = (
    "\u5de6\u4e0a",   # 左上
    "\u4e2d\u4e0a",   # 中上
    "\u53f3\u4e0a",   # 右上
    "\u5de6\u4e2d",   # 左中
    "\u4e2d\u4e2d",   # 中中
    "\u53f3\u4e2d",   # 右中
    "\u5de6\u4e0b",   # 左下
    "\u4e2d\u4e0b",   # 中下
    "\u53f3\u4e0b",   # 右下
)

# 时长正则：匹配"4秒"或"4s"或"4.5秒"
DURATION_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*(?:\u79d2|s|S)")


def _grid_position_regex():
    """构建宫格位置标注正则：匹配"左上，"或"左上:"等"""
    words = "|".join(re.escape(word) for word in GRID_POSITION_WORDS)
    return rf"(?:{words})\s*[\uff0c:：,]\s*"


def _segments_from_grid_text(text: str):
    """SF 扩展：解析带宫格位置标注+时长标注的单段连续文字格式。

    支持格式：
        [风格提示词]。第一个镜头（对应...）：左上，中景，4秒，[描述]。中上，近景，3秒，[描述]...

    返回：(prompts, lengths)
    - prompts: 每格的描述文本列表
    - lengths: 每格的时长（秒），与 prompts 一一对应；若无时长标记则为 None
    """
    text = _strip_markdown_fence(text)
    if not text:
        return [], []

    # 1. 先剥离开头的风格提示词和镜头序号
    #    匹配 "第一个镜头（对应...）：" 或 "第一个镜头（对应...区域）："
    #    也匹配无括号的情况
    lens_marker_re = re.compile(
        r"\u7b2c[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\d]+\u4e2a\u955c\u5934"
        r"(?:\uff08[^\uff09]*\uff09|\([^)]*\))?\s*[\uff1a:：]\s*"
    )
    lens_match = lens_marker_re.search(text)
    if lens_match:
        text = text[lens_match.end():]
    else:
        # 没有镜头序号，尝试找第一个宫格位置标注
        pos_re = re.compile(_grid_position_regex())
        first_pos = pos_re.search(text)
        if not first_pos:
            return [], []
        text = text[first_pos.start():]

    # 2. 按宫格位置标注切分
    pos_re = re.compile(_grid_position_regex())
    matches = list(pos_re.finditer(text))
    if not matches:
        return [], []

    prompts = []
    lengths = []
    for idx, match in enumerate(matches):
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        segment = text[start:end].strip()

        # 去掉末尾的句号
        segment = re.sub(r"[\u3002.]+\s*$", "", segment).strip()
        if not segment:
            continue

        # 3. 从段落开头提取时长标记 "N秒，"
        #    格式可能是 "中景，4秒，..." 或 "4秒，..." 或 "近景，4秒，..."
        duration = None
        dur_match = DURATION_PATTERN.search(segment[:30])  # 只在前30字符找
        if dur_match:
            try:
                duration = float(dur_match.group(1))
            except (TypeError, ValueError):
                duration = None
            # 从文本中移除时长标记（保留景别和描述）
            segment = segment[:dur_match.start()] + segment[dur_match.end():]
            # 清理可能残留的连续逗号（时长标记前后逗号合并为一个）
            segment = re.sub(r"[\uff0c,]{2,}", "\uff0c", segment)
            segment = segment.strip()

        # 4. 清理景别标记（如果开头是景别+逗号，保留景别在描述中，不移除）
        #    格式如 "中景，沈昭宁..." 保留景别作为描述的一部分

        if segment:
            prompts.append(segment)
            lengths.append(duration)

    return prompts, lengths


def _strip_markdown_fence(text: str) -> str:
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json|JSON)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _decode_first_json(text: str):
    text = _strip_markdown_fence(text)
    decoder = json.JSONDecoder()
    for idx, ch in enumerate(text):
        if ch not in "[{":
            continue
        try:
            parsed, _ = decoder.raw_decode(text[idx:])
            return parsed
        except json.JSONDecodeError:
            continue
    raise ValueError("No JSON object or array found.")


def _shot_key_index(key):
    match = re.search(r"(\d+)", str(key))
    if match:
        return int(match.group(1))

    numerals = {ch: idx + 1 for idx, ch in enumerate(CHINESE_NUMERALS[:9])}
    for ch in str(key):
        if ch in numerals:
            return numerals[ch]
    return None


def _mapping_to_ordered_items(data):
    numbered = []
    for key, value in data.items():
        idx = _shot_key_index(key)
        if idx is not None:
            numbered.append((idx, value))

    if numbered:
        return [value for _, value in sorted(numbered, key=lambda item: item[0])]

    if data and all(isinstance(value, (str, dict)) for value in data.values()):
        return list(data.values())

    return None


def _segments_from_json(data):
    if isinstance(data, dict):
        for key in ("segments", "shots", "scenes", "storyboard", "\u5206\u955c", "\u955c\u5934"):
            value = data.get(key)
            if isinstance(value, list):
                data = value
                break
            if isinstance(value, dict):
                mapped = _mapping_to_ordered_items(value)
                if mapped:
                    data = mapped
                    break
        else:
            mapped = _mapping_to_ordered_items(data)
            data = mapped if mapped else [data]

    if not isinstance(data, list):
        return [], []

    prompts = []
    lengths = []
    prompt_keys = (
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
    )
    length_keys = ("frames", "duration_frames", "length", "\u65f6\u957f\u5e27\u6570", "\u5e27\u6570")
    second_keys = ("seconds", "duration", "duration_seconds", "\u65f6\u957f", "\u79d2\u6570")

    for item in data:
        prompt = ""
        frame_length = None
        if isinstance(item, str):
            prompt = item.strip()
        elif isinstance(item, dict):
            for key in prompt_keys:
                value = item.get(key)
                if value:
                    prompt = str(value).strip()
                    break
            if not prompt:
                ignored = {
                    "shot",
                    "shot_id",
                    "index",
                    "id",
                    "number",
                    "\u5206\u955c",
                    "\u955c\u5934",
                    *length_keys,
                    *second_keys,
                }
                parts = [str(v).strip() for k, v in item.items() if k not in ignored and v]
                prompt = CHINESE_COMMA.join(parts)

            for key in length_keys:
                if item.get(key) is not None:
                    try:
                        frame_length = int(round(float(item[key])))
                    except (TypeError, ValueError):
                        frame_length = None
                    break

            if frame_length is None:
                for key in second_keys:
                    if item.get(key) is not None:
                        try:
                            frame_length = ("seconds", float(item[key]))
                        except (TypeError, ValueError):
                            frame_length = None
                        break

        if prompt:
            prompts.append(_clean_prompt(prompt))
            lengths.append(frame_length)

    return prompts, lengths


def _clean_prompt(prompt: str) -> str:
    prompt = (prompt or "").strip()
    prompt = re.sub(r"^\s*" + _shot_marker_regex(), "", prompt, flags=re.I)
    prompt = re.sub(r"\s+", " ", prompt)
    return prompt.strip()


def _segments_from_numbered_text(text: str):
    text = _strip_markdown_fence(text)
    marker_re = re.compile(_shot_marker_regex(prefix=r"(?:^|\n)\s*"), re.I)
    matches = list(marker_re.finditer(text))

    if matches:
        prompts = []
        for idx, match in enumerate(matches):
            start = match.end()
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
            prompt = _clean_prompt(text[start:end])
            if prompt:
                prompts.append(prompt)
        return prompts

    prompts = []
    for line in text.splitlines():
        line = _clean_prompt(line)
        line = re.sub(r"^\s*\d+\s*[:\uff1a.\-\u3001]\s*", "", line).strip()
        if line:
            prompts.append(line)
    return prompts


def _parse_prompts(llm_response: str, parse_mode: str):
    # SF 扩展：优先尝试宫格位置标注解析（"左上，中景，4秒，..."格式）
    if parse_mode in ("auto", "numbered_text"):
        grid_prompts, grid_lengths = _segments_from_grid_text(llm_response)
        if grid_prompts:
            return grid_prompts, grid_lengths

    if parse_mode in ("auto", "json"):
        try:
            prompts, lengths = _segments_from_json(_decode_first_json(llm_response))
            if prompts:
                return prompts, lengths
        except Exception as exc:
            if parse_mode == "json":
                raise ValueError(f"LTX Auto Director could not parse llm_response as JSON: {exc}") from exc

    prompts = _segments_from_numbered_text(llm_response)
    return prompts, []


def _parse_float_list(text: str):
    if text is None:
        return []
    values = []
    for part in re.split("[,\uff0c|/\n]+", str(text)):
        part = part.strip()
        if not part:
            continue
        try:
            values.append(float(part))
        except ValueError:
            continue
    return values


def _to_int(value, fallback: int):
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return int(fallback)


def _to_float(value, fallback: float):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(fallback)


def _to_str(value):
    return "" if value is None else str(value)


def _largest_remainder_lengths(weights, total_frames: int, count: int):
    if count <= 0:
        return []

    cleaned = [max(0.0, float(w)) for w in weights[:count]]
    if len(cleaned) < count:
        cleaned.extend([0.0] * (count - len(cleaned)))

    total_weight = sum(cleaned)
    if total_weight <= 0:
        base = total_frames // count
        result = [base] * count
        for idx in range(total_frames - sum(result)):
            result[idx % count] += 1
        return [max(1, v) for v in result]

    exact = [w * total_frames / total_weight for w in cleaned]
    result = [max(1, int(v)) for v in exact]
    diff = total_frames - sum(result)

    if diff > 0:
        order = sorted(range(count), key=lambda i: -(exact[i] - int(exact[i])))
        for idx in range(diff):
            result[order[idx % count]] += 1
    elif diff < 0:
        order = sorted(range(count), key=lambda i: result[i], reverse=True)
        while diff < 0:
            changed = False
            for idx in order:
                if result[idx] > 1:
                    result[idx] -= 1
                    diff += 1
                    changed = True
                    if diff == 0:
                        break
            if not changed:
                break

    return result


def _normalize_lengths(segment_lengths: str, json_lengths, total_frames: int, count: int, frame_rate: float):
    total_frames = max(total_frames, count)
    manual = [int(round(v)) for v in _parse_float_list(segment_lengths)]
    if manual:
        lengths = [max(1, v) for v in manual[:count]]
        if len(lengths) < count:
            remaining = max(count - len(lengths), total_frames - sum(lengths))
            lengths.extend(_largest_remainder_lengths([], remaining, count - len(lengths)))
    else:
        weights = []
        for value in json_lengths[:count]:
            # SF 扩展：支持从宫格文本解析出的秒数（float 类型）
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                # 如果值看起来是秒数（< 1000），转换为帧数
                if value < 1000:
                    weights.append(max(0.0, float(value) * frame_rate))
                else:
                    weights.append(max(0.0, float(value)))
            elif isinstance(value, tuple) and value[0] == "seconds":
                weights.append(max(0.0, value[1] * frame_rate))
            elif value is None:
                weights.append(0.0)
            else:
                try:
                    weights.append(max(0.0, float(value)))
                except (TypeError, ValueError):
                    weights.append(0.0)
        lengths = _largest_remainder_lengths(weights, total_frames, count)

    if not lengths:
        lengths = _largest_remainder_lengths([], total_frames, count)

    if len(lengths) > count:
        lengths = lengths[:count]

    diff = total_frames - sum(lengths)
    if lengths:
        lengths[-1] = max(1, lengths[-1] + diff)

    if sum(lengths) != total_frames and len(lengths) > 1:
        return _largest_remainder_lengths(lengths, total_frames, count)

    return lengths


def _strengths_for_count(guide_strength: str, count: int):
    values = _parse_float_list(guide_strength)
    if not values:
        return [1.0] * count
    if len(values) == 1:
        return [float(values[0])] * count
    values = [float(v) for v in values[:count]]
    if len(values) < count:
        values.extend([values[-1]] * (count - len(values)))
    return values


def _process_image_tensor(tensor, custom_width: int, custom_height: int, resize_method: str, divisible_by: int, img_compression: int):
    tensor = tensor[:1].detach().float().cpu()
    src_h, src_w = tensor.shape[1], tensor.shape[2]

    def snap(val, div):
        return max(div, (int(val) // div) * div)

    if custom_width > 0 and custom_height > 0:
        tensor = _resize_image(tensor, custom_width, custom_height, resize_method, divisible_by)
    elif custom_width > 0:
        tgt_w = snap(custom_width, divisible_by)
        tgt_h = snap(src_h * tgt_w / src_w, divisible_by)
        tensor = _resize_image(tensor, tgt_w, tgt_h, "stretch to fit", divisible_by)
    elif custom_height > 0:
        tgt_h = snap(custom_height, divisible_by)
        tgt_w = snap(src_w * tgt_h / src_h, divisible_by)
        tensor = _resize_image(tensor, tgt_w, tgt_h, "stretch to fit", divisible_by)
    else:
        tensor = _resize_image(tensor, src_w, src_h, "maintain aspect ratio", divisible_by)

    if img_compression > 0:
        tensor = _compress_image(tensor, img_compression)

    return tensor


def _empty_audio_latent(audio_vae, ltxv_length: int, frame_rate: float):
    inner = getattr(audio_vae, "first_stage_model", audio_vae)
    z_channels = audio_vae.latent_channels
    audio_freq = inner.latent_frequency_bins
    num_audio_latents = inner.num_of_latents_from_frames(ltxv_length, float(frame_rate))
    audio_latents = torch.zeros(
        (1, z_channels, num_audio_latents, audio_freq),
        device=comfy.model_management.intermediate_device(),
    )
    return {"samples": audio_latents, "type": "audio"}


class LTXAutoDirector(io.ComfyNode):
    """Automatic storyboard-to-LTX director node for batch images and LLM shot text."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="SF-LTXAutoDirector",
            display_name="SF-LTX \u81ea\u52a8\u5bfc\u6f14\u53f0",
            category="SF-WhatDreamsCost",
            description=(
                "Builds an LTX Director timeline automatically from a batch of storyboard images "
                "and an LLM response containing per-shot prompts."
            ),
            inputs=[
                io.Model.Input("model", display_name="\u6a21\u578b"),
                io.Clip.Input("clip", display_name="\u6587\u672c\u7f16\u7801\u5668"),
                io.Image.Input("storyboard_images", display_name="\u516d\u5bab\u683c\u62c6\u5206\u56fe", tooltip="Batched storyboard images, ordered left-to-right and top-to-bottom."),
                io.String.Input("llm_response", display_name="GPT \u5206\u955c\u6587\u672c", multiline=True, default="", tooltip="LLM output with one prompt per shot. JSON is recommended."),
                io.Vae.Input("audio_vae", display_name="\u97f3\u9891 VAE", optional=True, tooltip="Optional Audio VAE used to generate an empty audio latent."),
                io.Latent.Input("optional_latent", display_name="\u53ef\u9009\u6f5c\u7a7a\u95f4", optional=True, tooltip="Optional latent to use instead of the auto-generated LTX latent."),
                io.String.Input("global_prompt", display_name="\u5168\u5c40\u63d0\u793a\u8bcd", multiline=True, default="", tooltip="Global prompt shared by every shot."),
                io.Int.Input("segment_count", display_name="\u5206\u955c\u6570\u91cf", default=6, min=1, max=MAX_AUTO_SEGMENTS, step=1, tooltip="How many images/prompts to use from the batch."),
                io.Int.Input("duration_frames", display_name="\u603b\u5e27\u6570", default=120, min=1, max=10000, step=1, tooltip="Total output duration in pixel-space frames."),
                io.Float.Input("duration_seconds", display_name="\u603b\u79d2\u6570", default=5.0, min=0.1, max=1000.0, step=0.01, tooltip="Display helper; duration_frames is authoritative."),
                io.String.Input("segment_lengths", display_name="\u6bcf\u6bb5\u5e27\u6570", default="", tooltip="Optional comma-separated frame lengths, e.g. 20,20,20,20,20,20."),
                io.String.Input("guide_strength", display_name="\u56fe\u50cf\u5f15\u5bfc\u5f3a\u5ea6", default="1.0", tooltip="One strength for all shots, or comma-separated per-shot strengths."),
                io.Float.Input("epsilon", display_name="\u5206\u6bb5\u8fb9\u754c\u9510\u5ea6", default=0.001, min=0.0001, max=0.99, step=0.0001, tooltip="Prompt Relay boundary sharpness."),
                io.Float.Input("frame_rate", display_name="\u5e27\u7387", default=24, min=1, max=240, step=1, tooltip="Frames per second."),
                io.Combo.Input("parse_mode", display_name="\u6587\u672c\u89e3\u6790\u65b9\u5f0f", options=["auto", "json", "numbered_text"], default="auto", tooltip="How to parse llm_response."),
                io.Int.Input("custom_width", display_name="\u8f93\u51fa\u5bbd\u5ea6", default=0, min=0, max=8192, step=1, optional=True, tooltip="Target image/video width. 0 keeps source-derived width."),
                io.Int.Input("custom_height", display_name="\u8f93\u51fa\u9ad8\u5ea6", default=0, min=0, max=8192, step=1, optional=True, tooltip="Target image/video height. 0 keeps source-derived height."),
                io.Combo.Input(
                    "resize_method",
                    display_name="\u56fe\u50cf\u9002\u914d\u65b9\u5f0f",
                    options=["maintain aspect ratio", "stretch to fit", "pad", "crop"],
                    default="maintain aspect ratio",
                    optional=True,
                    tooltip="How to resize guide images.",
                ),
                io.Int.Input("divisible_by", display_name="\u5c3a\u5bf8\u6574\u9664", default=32, min=1, max=256, step=1, optional=True, tooltip="Snap output dimensions to this multiple."),
                io.Int.Input("img_compression", display_name="\u56fe\u50cf\u538b\u7f29", default=18, min=0, max=100, step=1, optional=True, tooltip="H.264 CRF compression applied to guide images. 0 disables it."),
            ],
            outputs=[
                io.Model.Output(display_name="\u6a21\u578b"),
                io.Conditioning.Output(display_name="\u6b63\u5411\u6761\u4ef6"),
                io.Latent.Output(display_name="\u89c6\u9891\u6f5c\u7a7a\u95f4"),
                io.Latent.Output(display_name="\u97f3\u9891\u6f5c\u7a7a\u95f4"),
                GuideData.Output(display_name="\u5f15\u5bfc\u6570\u636e"),
                io.Float.Output(display_name="\u5e27\u7387"),
                io.Audio.Output(display_name="\u5408\u6210\u97f3\u9891"),
            ],
        )

    @classmethod
    def execute(cls, model, clip, storyboard_images, llm_response, global_prompt="",
                segment_count=6, duration_frames=120, duration_seconds=5.0,
                segment_lengths="", guide_strength="1.0", epsilon=1e-3, frame_rate=24,
                parse_mode="auto", custom_width=0, custom_height=0,
                resize_method="maintain aspect ratio", divisible_by=32, img_compression=18,
                audio_vae=None, optional_latent=None) -> io.NodeOutput:
        if storyboard_images is None or storyboard_images.shape[0] < 1:
            raise ValueError("LTX Auto Director requires at least one storyboard image.")

        llm_response = _to_str(llm_response)
        global_prompt = _to_str(global_prompt)
        segment_lengths = _to_str(segment_lengths)
        guide_strength = _to_str(guide_strength)
        segment_count = _to_int(segment_count, 6)
        duration_frames = _to_int(duration_frames, 120)
        frame_rate = _to_float(frame_rate, 24.0)
        epsilon = _to_float(epsilon, 0.001)
        custom_width = max(0, _to_int(custom_width, 0))
        custom_height = max(0, _to_int(custom_height, 0))
        divisible_by = max(1, _to_int(divisible_by, 32))
        img_compression = max(0, _to_int(img_compression, 18))
        if parse_mode not in ("auto", "json", "numbered_text"):
            parse_mode = "auto"

        batch_count = int(storyboard_images.shape[0])
        prompts, json_lengths = _parse_prompts(llm_response, parse_mode)

        # SF 优化：当 llm_response 包含宫格位置标注时，用解析出的分镜数量覆盖 segment_count，
        # 避免用户手动设置的 segment_count 与实际宫格数量不匹配导致提示词错位或截断。
        if len(prompts) > 1:
            segment_count = min(len(prompts), MAX_AUTO_SEGMENTS)

        count = max(1, min(segment_count, batch_count, MAX_AUTO_SEGMENTS))
        duration_frames = max(duration_frames, count)

        if len(prompts) < count:
            log.warning(
                "[LTX Auto Director] Parsed %d prompts for %d images. Filling missing prompts with generic motion prompts.",
                len(prompts), count,
            )
        prompts = (prompts + [f"\u7b2c {i + 1} \u4e2a\u5206\u955c\u4fdd\u6301\u7535\u5f71\u611f\u8fde\u7eed\u8fd0\u52a8\u3002" for i in range(count)])[:count]

        lengths = _normalize_lengths(segment_lengths, json_lengths, duration_frames, count, frame_rate)
        strengths = _strengths_for_count(guide_strength, count)

        guide_data = {"images": [], "insert_frames": [], "strengths": [], "frame_rate": frame_rate}
        timeline_segments = []
        start = 0
        derived_w = custom_width
        derived_h = custom_height

        for idx in range(count):
            tensor = _process_image_tensor(
                storyboard_images[idx:idx + 1],
                custom_width,
                custom_height,
                resize_method,
                divisible_by,
                img_compression,
            )
            if idx == 0:
                derived_h = int(tensor.shape[1])
                derived_w = int(tensor.shape[2])

            guide_data["images"].append(tensor)
            guide_data["insert_frames"].append(int(start))
            guide_data["strengths"].append(float(strengths[idx]))
            timeline_segments.append({
                "id": uuid4().hex[:12],
                "start": int(start),
                "length": int(lengths[idx]),
                "prompt": prompts[idx],
                "type": "image",
                "source": "storyboard_images",
                "batch_index": idx,
                "guideStrength": float(strengths[idx]),
            })
            start += int(lengths[idx])

        timeline_data = json.dumps({"segments": timeline_segments, "audioSegments": []}, ensure_ascii=False)
        local_prompts = " | ".join(prompts)
        segment_lengths_out = ",".join(str(int(v)) for v in lengths)

        ltxv_length = duration_frames + 1
        if optional_latent is None:
            latent_w = max(32, (int(derived_w) // 32) * 32)
            latent_h = max(32, (int(derived_h) // 32) * 32)
            latent_t = ((ltxv_length - 1) // 8) + 1
            samples = torch.zeros(
                [1, 128, latent_t, latent_h // 32, latent_w // 32],
                device=comfy.model_management.intermediate_device(),
            )
            latent = {"samples": samples}
            log.info(
                "[LTX Auto Director] Auto-generated LTXV latent: %dx%d, %d pixel frames (%d latent frames)",
                latent_w, latent_h, ltxv_length, latent_t,
            )
        else:
            latent = optional_latent

        patched, conditioning = _encode_relay(
            model, clip, latent, global_prompt or "", local_prompts, segment_lengths_out, float(epsilon),
        )

        audio_out = _build_combined_audio(timeline_data, ltxv_length, float(frame_rate))
        audio_latent = _empty_audio_latent(audio_vae, ltxv_length, frame_rate) if audio_vae is not None else {}

        return io.NodeOutput(patched, conditioning, latent, audio_latent, guide_data, float(frame_rate), audio_out)


NODE_CLASS_MAPPINGS = {
    "SF-LTXAutoDirector": LTXAutoDirector,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SF-LTXAutoDirector": "SF-LTX \u81ea\u52a8\u5bfc\u6f14\u53f0",
}
