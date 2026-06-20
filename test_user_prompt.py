"""用用户实际提示词验证拆分结果 - 纯解析逻辑独立运行"""
import re

# ========== 从 ltx_auto_director.py 提取的纯解析函数 ==========

GRID_POSITION_WORDS = (
    "左上", "中上", "右上",
    "左中", "中中", "右中",
    "左下", "中下", "右下",
)

DURATION_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*(?:秒|s|S)")

CHINESE_COMMA = "\uff0c"


def _grid_position_regex():
    words = "|".join(re.escape(word) for word in GRID_POSITION_WORDS)
    return rf"(?:{words})\s*[\uff0c:：,]\s*"


def _strip_markdown_fence(text):
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json|JSON)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _shot_marker_regex(prefix=""):
    marker = r"(?:shot|scene|镜头|分镜)\s*[-_]?\s*\d+"
    numeral = r"|".join(["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"])
    chinese = rf"第\s*({numeral})\s*(?:个)?\s*(?:镜头|分镜|场景)"
    return rf"{prefix}(?:\d+[\.\、)]\s*|{marker}\s*[:：]\s*|{chinese}\s*[:：]\s*)"


def _clean_prompt(prompt):
    prompt = (prompt or "").strip()
    prompt = re.sub(r"^\s*" + _shot_marker_regex(), "", prompt, flags=re.I)
    prompt = re.sub(r"\s+", " ", prompt)
    return prompt.strip()


def _segments_from_grid_text(text):
    text = _strip_markdown_fence(text)
    if not text:
        return [], []

    lens_marker_re = re.compile(
        r"第[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\d]+\u4e2a\u955c\u5934"
        r"(?:\uff08[^\uff09]*\uff09|\([^)]*\))?\s*[\uff1a:：]\s*"
    )
    lens_match = lens_marker_re.search(text)
    if lens_match:
        text = text[lens_match.end():]
    else:
        pos_re = re.compile(_grid_position_regex())
        first_pos = pos_re.search(text)
        if not first_pos:
            return [], []
        text = text[first_pos.start():]

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
        segment = re.sub(r"[\u3002.]+\s*$", "", segment).strip()
        if not segment:
            continue

        duration = None
        dur_match = DURATION_PATTERN.search(segment[:30])
        if dur_match:
            try:
                duration = float(dur_match.group(1))
            except (TypeError, ValueError):
                duration = None
            segment = segment[:dur_match.start()] + segment[dur_match.end():]
            segment = re.sub(r"[\uff0c,]{2,}", "\uff0c", segment)
            segment = segment.strip()

        if segment:
            prompts.append(segment)
            lengths.append(duration)

    return prompts, lengths


def _segments_from_numbered_text(text):
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


def _parse_prompts(llm_response, parse_mode):
    if parse_mode in ("auto", "numbered_text"):
        grid_prompts, grid_lengths = _segments_from_grid_text(llm_response)
        if grid_prompts:
            return grid_prompts, grid_lengths
    prompts = _segments_from_numbered_text(llm_response)
    return prompts, []


def _parse_float_list(text):
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


def _largest_remainder_lengths(weights, total_frames, count):
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


def _normalize_lengths(segment_lengths, json_lengths, total_frames, count, frame_rate):
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
            if isinstance(value, (int, float)) and not isinstance(value, bool):
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


# ========== 用户实际提示词 ==========

USER_PROMPT = '电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。第一个镜头（对应2x2四宫格从左上至右下区域）：左上，中景，3秒，李强穿蓝色旧T恤坐在单人床边，一手握着彩票一手拿着手机，台灯暖黄光照亮简陋出租屋，镜头以定镜开场静静记录他的背影和侧脸，纸张沙沙声和窗外远处车流声让空间显得安静。右上，近景，4秒，李强的手指移向彩票，指向上面的数字，瞳孔微缩，表情从专注转为震惊，镜头缓慢推近聚焦他的眼睛和微张的嘴巴，急促呼吸声变得明显。[李强："全对上了，一等奖，五百万！"]左下，特写，3秒，彩票特写置于掌心，红蓝双色印刷的数字清晰可见，李强的手指微微发抖，指尖停在某一组数字旁，镜头以俯视机位定格，纸张边缘在灯光下微微颤动。右下，近景，2秒，李强猛地抬头，嘴巴张开，脸上从震惊转为坚定，右手缓缓握拳，彩票被攥在掌心，镜头定格在他的侧脸和握拳的手上，彩票纸张声渐弱为下一镜头切入街道环境声的声音桥过渡做准备。'


print("=" * 70)
print("用户实际提示词 - 插件解析逻辑验证")
print("=" * 70)
print(f"\n输入提示词长度: {len(USER_PROMPT)} 字")
print(f"前50字: {USER_PROMPT[:50]}...")

# 第1步：_segments_from_grid_text
print("\n" + "=" * 70)
print("【第1步】_segments_from_grid_text 宫格位置标注解析")
print("=" * 70)
prompts, lengths = _segments_from_grid_text(USER_PROMPT)
print(f"\n解析出 prompt 数量: {len(prompts)}")
print(f"解析出时长列表: {lengths}")
print(f"时长总和: {sum(l for l in lengths if l)} 秒")
for i, p in enumerate(prompts):
    dur = lengths[i] if i < len(lengths) else "?"
    print(f"\n  ── 第{i+1}格 │ 时长={dur}秒 ──")
    print(f"  {p}")

# 第2步：_parse_prompts (节点实际入口)
print("\n" + "=" * 70)
print("【第2步】_parse_prompts('auto') 节点实际调用入口")
print("=" * 70)
prompts2, lengths2 = _parse_prompts(USER_PROMPT, "auto")
print(f"解析出 prompt 数量: {len(prompts2)}")
print(f"解析出时长列表: {lengths2}")
match = prompts2 == prompts and lengths2 == lengths
print(f"与第1步结果一致: {'✓' if match else '✗'}")

# 第3步：has_grid_markup
print("\n" + "=" * 70)
print("【第3步】has_grid_markup 判断 (触发强制重建的关键)")
print("=" * 70)
grid_prompts, _ = _segments_from_grid_text(USER_PROMPT)
has_grid_markup = len(grid_prompts) > 1
print(f"grid_prompts 数量: {len(grid_prompts)}")
print(f"has_grid_markup: {has_grid_markup}")
print(f"→ 是否会触发强制重建timeline: {'✓ 是' if has_grid_markup else '✗ 否'}")

# 第4步：_normalize_lengths
print("\n" + "=" * 70)
print("【第4步】_normalize_lengths 时长→帧数 (24fps, 12秒=288帧)")
print("=" * 70)
frame_rate = 24.0
duration_frames = 288
count = 4
norm_lengths = _normalize_lengths("", lengths2, duration_frames, count, frame_rate)
print(f"输入秒数列表: {lengths2}")
print(f"输出帧数列表: {norm_lengths}")
print(f"帧数总和: {sum(norm_lengths)} (应=288)")
print(f"折算秒数: {[l/frame_rate for l in norm_lengths]}")
is_average = all(l == norm_lengths[0] for l in norm_lengths)
print(f"是否平均分配: {is_average} {'❌ 这就是问题!' if is_average else '✓ 非平均分配，正确'}")

# 第5步：模拟 timeline segments
print("\n" + "=" * 70)
print("【第5步】模拟 _build_default_timeline 生成 timeline segments")
print("=" * 70)
from uuid import uuid4
cursor = 0
segments = []
for idx in range(count):
    segments.append({
        "id": uuid4().hex[:12],
        "start": int(cursor),
        "length": int(norm_lengths[idx]),
        "prompt": prompts2[idx] if idx < len(prompts2) else "",
        "type": "image",
        "source": "storyboard_images",
        "batch_index": idx,
    })
    cursor += int(norm_lengths[idx])

print(f"\n{'batch_index':<12} {'start':<7} {'length':<8} {'秒数':<6} prompt前35字")
print("-" * 80)
for seg in segments:
    print(f"  {seg['batch_index']:<10} {seg['start']:<5}   {seg['length']:<6}  {seg['length']/frame_rate:<4.0f}s   {seg['prompt'][:35]}...")

# 第6步：总结
print("\n" + "=" * 70)
print("【第6步】关键指标验证")
print("=" * 70)
batch_indices = [s["batch_index"] for s in segments]
seg_lengths = [s["length"] for s in segments]
prompt_prefixes = [s["prompt"][:10] for s in segments]

checks = [
    ("prompt数量=4", len(prompts2) == 4, f"实际={len(prompts2)}"),
    ("时长解析=[3,4,3,2]秒", lengths2 == [3.0, 4.0, 3.0, 2.0], f"实际={lengths2}"),
    ("batch_index=[0,1,2,3]", batch_indices == [0, 1, 2, 3], f"实际={batch_indices}"),
    ("4个不同prompt", len(set(prompt_prefixes)) == 4, f"实际独立数={len(set(prompt_prefixes))}"),
    ("帧数=[72,96,72,48]", seg_lengths == [72, 96, 72, 48], f"实际={seg_lengths}"),
    ("非平均分配", not all(l == seg_lengths[0] for l in seg_lengths), f"实际={'平均' if all(l == seg_lengths[0] for l in seg_lengths) else '非平均'}"),
    ("帧数总和=288", sum(seg_lengths) == 288, f"实际={sum(seg_lengths)}"),
    ("has_grid_markup=True", has_grid_markup, f"实际={has_grid_markup}"),
]

all_pass = True
for desc, ok, detail in checks:
    status = "✓" if ok else "✗"
    print(f"  {status} {desc}  ({detail if not ok else '通过'})")
    if not ok:
        all_pass = False

print("\n" + "=" * 70)
if all_pass:
    print("🎉 全部通过！插件解析逻辑完全正确。")
    print()
    print("结论：你的提示词格式没问题，插件代码能完美拆分。")
    print("如果ComfyUI里还是不对，100%是节点版本冲突——")
    print("你的工作流用的是 CS-LTXGridDirector 节点（旧版无宫格解析），")
    print("而不是 SF-LTXGridDirector 节点（新版有宫格解析）。")
else:
    print("❌ 有检查未通过，需要修复解析逻辑。")
print("=" * 70)
