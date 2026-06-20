"""对比测试：当前格式 vs 用户期望的新格式，哪个能被插件正确拆分"""
import re

# ========== 从插件提取的纯解析函数 ==========

GRID_POSITION_WORDS = (
    "左上", "中上", "右上",
    "左中", "中中", "右中",
    "左下", "中下", "右下",
)
DURATION_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*(?:秒|s|S)")

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
    return rf"{prefix}(?:\d+[\.\、)]\s*|{marker}\s*[:：]\s*|{chinese}\s*[:：，,\s]*)"

def _clean_prompt(prompt):
    prompt = (prompt or "").strip()
    prompt = re.sub(r"^\s*" + _shot_marker_regex(), "", prompt, flags=re.I)
    prompt = re.sub(r"\s+", " ", prompt)
    return prompt.strip()

# ---- 格式A：当前 skills 生成的格式（所有宫格在一个镜头里）----
FORMAT_A = '电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。第一个镜头（对应2x2四宫格从左上至右下区域）：左上，中景，3秒，李强穿蓝色旧T恤坐在单人床边，一手握着彩票一手拿着手机，台灯暖黄光照亮简陋出租屋，镜头以定镜开场静静记录他的背影和侧脸，纸张沙沙声和窗外远处车流声让空间显得安静。右上，近景，4秒，李强的手指移向彩票，指向上面的数字，瞳孔微缩，表情从专注转为震惊，镜头缓慢推近聚焦他的眼睛和微张的嘴巴，急促呼吸声变得明显。[李强："全对上了，一等奖，五百万！"]左下，特写，3秒，彩票特写置于掌心，红蓝双色印刷的数字清晰可见，李强的手指微微发抖，指尖停在某一组数字旁，镜头以俯视机位定格，纸张边缘在灯光下微微颤动。右下，近景，2秒，李强猛地抬头，嘴巴张开，脸上从震惊转为坚定，右手缓缓握拳，彩票被攥在掌心，镜头定格在他的侧脸和握拳的手上，彩票纸张声渐弱为下一镜头切入街道环境声的声音桥过渡做准备。'

# ---- 格式B：用户期望的格式（每个宫格独立为"第N个镜头"）----
FORMAT_B = '电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。第一个镜头，左上，中景，3秒，李强穿蓝色旧T恤坐在单人床边，一手握着彩票一手拿着手机，台灯暖黄光照亮简陋出租屋，镜头以定镜开场静静记录他的背影和侧脸，纸张沙沙声和窗外远处车流声让空间显得安静。第二个镜头，右上，近景，4秒，李强的手指移向彩票，指向上面的数字，瞳孔微缩，表情从专注转为震惊，镜头缓慢推近聚焦他的眼睛和微张的嘴巴，急促呼吸声变得明显。[李强："全对对了，一等奖，五百万！"]第三个镜头，左下，特写，3秒，彩票特写置于掌心，红蓝双色印刷的数字清晰可见，李强的手指微微发抖，指尖停在某一组数字旁，镜头以俯视机位定格，纸张边缘在灯光下微微颤动。第四个镜头，右下，近景，2秒，李强猛地抬头，嘴巴张开，脸上从震惊转为坚定，右手缓缓握拳，彩票被攥在掌心，镜头定格在他的侧脸和握拳的手上，彩票纸张声渐弱为下一镜头切入街道环境声的声音桥过渡做准备。'

# ---- 格式C：用户期望的格式变体（用冒号代替逗号）----
FORMAT_C = '电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。第一个镜头：左上，中景，3秒，李强穿蓝色旧T恤坐在单人床边，一手握着彩票一手拿着手机，台灯暖黄光照亮简陋出租屋，镜头以定镜开场静静记录他的背影和侧脸，纸张沙沙声和窗外远处车流声让空间显得安静。第二个镜头：右上，近景，4秒，李强的手指移向彩票，指向上面的数字，瞳孔微缩，表情从专注转为震惊，镜头缓慢推近聚焦他的眼睛和微张的嘴巴，急促呼吸声变得明显。[李强："全对对了，一等奖，五百万！"]第三个镜头：左下，特写，3秒，彩票特写置于掌心，红蓝双色印刷的数字清晰可见，李强的手指微微发抖，指尖停在某一组数字旁，镜头以俯视机位定格，纸张边缘在灯光下微微颤动。第四镜头：右下，近景，2秒，李强猛地抬头，嘴巴张开，脸上从震惊转为坚定，右手缓缓握拳，彩票被攥在掌心，镜头定格在他的侧脸和握拳的手上，彩票纸张声渐弱为下一镜头切入街道环境声的声音桥过渡做准备。'

# ---- 格式D：去掉"正面词："前缀，只用宫格位置切分 ----
FORMAT_D = '第一个镜头（对应2x2四宫格从左上至右下区域）：左上，中景，3秒，李强穿蓝色旧T恤坐在单人床边，一手握着彩票一手拿着手机，台灯暖黄光照亮简陋出租屋，镜头以定镜开场静静记录他的背影和侧脸，纸张沙沙声和窗外远处车流声让空间显得安静。右上，近景，4秒，李强的手指移向彩票，指向上面的数字，瞳孔微缩，表情从专注转为震惊，镜头缓慢推近聚焦他的眼睛和微张的嘴巴，急促呼吸声变得明显。[李强："全对上了，一等奖，五百万！"]左下，特写，3秒，彩票特写置于掌心，红蓝双色印刷的数字清晰可见，李强的手指微微发抖，指尖停在某一组数字旁，镜头以俯视机位定格，纸张边缘在灯光下微微颤动。右下，近景，2秒，李强猛地抬头，嘴巴张开，脸上从震惊转为坚定，右手缓缓握拳，彩票被攥在掌心，镜头定格在他的侧脸和握拳的手上，彩票纸张声渐弱为下一镜头切入街道环境声的声音桥过渡做准备。'


def _segments_from_grid_text(text):
    """宫格位置标注解析"""
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
    prompts, lengths = [], []
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
            try: duration = float(dur_match.group(1))
            except: duration = None
            segment = segment[:dur_match.start()] + segment[dur_match.end():]
            segment = re.sub(r"[\uff0c,]{2,}", "\uff0c", segment).strip()
        if segment:
            prompts.append(segment)
            lengths.append(duration)
    return prompts, lengths


def _segments_from_numbered_text(text):
    """编号文本解析（按"第N个镜头"切分）"""
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
    # fallback: 按行分割
    prompts = []
    for line in text.splitlines():
        line = _clean_prompt(line)
        line = re.sub(r"^\s*\d+\s*[:\uff1a.\-\u3001]\s*", "", line).strip()
        if line:
            prompts.append(line)
    return prompts


def _parse_prompts(llm_response, parse_mode):
    """节点实际调用的入口：auto模式优先尝试grid解析"""
    if parse_mode in ("auto", "numbered_text"):
        grid_prompts, grid_lengths = _segments_from_grid_text(llm_response)
        if grid_prompts:
            return grid_prompts, grid_lengths
    prompts = _segments_from_numbered_text(llm_response)
    return prompts, []


print("=" * 70)
print("四种格式对比测试 - 插件解析能力验证")
print("=" * 70)

formats = {
    "格式A（当前skills）": FORMAT_A,
    "格式B（期望-逗号分隔）": FORMAT_B,
    "格式C（期望-冒号分隔）": FORMAT_C,
    "格式D（去正面词前缀）": FORMAT_D,
}

for name, text in formats.items():
    print(f"\n{'='*70}")
    print(f"【{name}】")
    print(f"{'='*70}")

    # 测试 grid 解析
    grid_p, grid_l = _segments_from_grid_text(text)
    print(f"  _segments_from_grid_text → {len(grid_p)} 个 prompt, 时长={grid_l}")

    # 测试 numbered 解析
    num_p = _segments_from_numbered_text(text)
    print(f"  _segments_from_numbered_text → {len(num_p)} 个 prompt")

    # 测试 parse_prompts('auto') 实际入口
    auto_p, auto_l = _parse_prompts(text, "auto")
    print(f"  _parse_prompts('auto') 最终结果 → {len(auto_p)} 个 prompt, 时长={auto_l}")

    # 判断是否成功
    ok = len(auto_p) == 4 and all(l is not None for l in auto_l)
    status = "✅ 可用" if ok else "❌ 失败"
    print(f"  >>> {status}")


print("\n\n" + "=" * 70)
print("结论分析")
print("=" * 70)

# 额外测试：_shot_marker_regex 能否匹配各种前缀
test_prefixes = [
    "第一个镜头，",
    "第一个镜头：",
    "第一个镜头:",
    "第一个镜头 ",
    "第二镜头：",
    "镜头1：",
    "1.",
]
print("\n_shot_marker_regex 匹配测试:")
marker_re = _shot_marker_regex(prefix="")
for prefix in test_prefixes:
    m = re.search(marker_re, prefix)
    print(f"  '{prefix}' → {'✅ 匹配' if m else '❌ 不匹配'}")
