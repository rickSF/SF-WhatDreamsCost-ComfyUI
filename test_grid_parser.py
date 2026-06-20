#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SF-WhatDreamsCost-ComfyUI 解析逻辑测试脚本
测试 _segments_from_grid_text 函数能否正确解析 skills 生成的视频提示词格式
"""

import sys
import os

# 添加插件目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 导入待测试的函数
# 由于无法导入完整的ComfyUI环境，我们直接从源码提取核心函数测试
import re

# 从 ltx_auto_director.py 复制的核心函数
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

DURATION_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*(?:\u79d2|s|S)")


def _strip_markdown_fence(text):
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json|JSON)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _grid_position_regex():
    words = "|".join(re.escape(word) for word in GRID_POSITION_WORDS)
    return rf"(?:{words})\s*[\uff0c:：,]\s*"


def _segments_from_grid_text(text):
    text = _strip_markdown_fence(text)
    if not text:
        return [], []

    lens_marker_re = re.compile(
        r"\u7b2c[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\d]+\u4e2a\u955c\u5934"
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


# ========== 测试用例 ==========

def test_case_1_9grid_with_duration():
    """测试1：9宫格27秒，带时长标注"""
    print("\n=== 测试1：9宫格27秒，带时长标注 ===")
    video_prompt = (
        "电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，"
        "自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。"
        "第一个镜头（对应3x3九宫格从左上至右下区域）："
        "左上，中景，3秒，李强穿蓝色旧T恤坐在单人床边，手持彩票和手机，台灯暖黄光照亮简陋出租屋，镜头以定镜开场静静记录他的背影。"
        "中上，近景，4秒，李强低头看手机屏幕，眉头逐渐皱起，镜头缓慢推近聚焦他紧锁的眉心，急促呼吸声细微可闻。"
        "右上，近景，3秒，李强的手指移向彩票，指向上面的数字，瞳孔微缩，镜头继续推近至他的眼睛。"
        "左中，特写，3秒，彩票特写置于掌心，数字清晰可见，李强的手指微微发抖，镜头以俯视机位定格两秒。"
        "中中，近景，3秒，李强猛地抬头，嘴巴张开，脸上从困惑变为震惊，镜头从特写缓慢拉回近景记录他的表情变化。"
        "右中，近景，4秒，李强握紧彩票贴在胸口，眼眶微红，嘴角颤抖，镜头定格在他的侧脸和握紧彩票的手上。"
        "左下，特写，3秒，李强双手捧着彩票，手指发抖，镜头以俯视机位记录他颤抖的双手和彩票上的数字。"
        "中下，近景，2秒，李强缓缓站起身，彩票握在手中，深吸一口气，镜头跟随他的起身动作微微上移。"
        "右下，近景，2秒，李强站立，右手缓缓握拳，目光从迷茫变得坚定，镜头定格在他的侧脸和握拳的手上。"
        "[李强：\"全对上了，一等奖，五百万！\"]"
    )

    prompts, lengths = _segments_from_grid_text(video_prompt)

    print(f"解析出 {len(prompts)} 格")
    print(f"时长列表: {lengths}")
    print(f"时长总和: {sum(l for l in lengths if l is not None)}秒")

    # 验证
    assert len(prompts) == 9, f"期望9格，实际{len(prompts)}格"
    assert all(l is not None for l in lengths), "有格缺少时长"
    total = sum(lengths)
    assert total == 27, f"期望总时长27秒，实际{total}秒"

    # 打印每格摘要
    for i, (p, l) in enumerate(zip(prompts, lengths)):
        print(f"  格{i+1} ({l}秒): {p[:40]}...")

    print("✅ 测试1通过：9格，时长总和27秒")
    return True


def test_case_2_6grid_with_duration():
    """测试2：6宫格18秒，带时长标注"""
    print("\n=== 测试2：6宫格18秒，带时长标注 ===")
    video_prompt = (
        "电影感真人摄影，中国古装剧照，汉服男女，古代宫廷庭院场景，"
        "暖琥珀色烛光与柔光，浅景深，35mm镜头质感，无文字无水印无边框。"
        "第一个镜头（对应2x3六宫格从左上至右下区域）："
        "左上，中景，3秒，沈昭宁穿素白长裙立于沈府正堂中央，手持账册，表情平静，镜头以定镜开场静静记录她的背影。"
        "中上，近景，4秒，沈昭宁微微抬眼，目光从平静转为锐利，手指停在账册某行数字旁，镜头缓慢推近聚焦她的侧脸。"
        "右上，近景，3秒，沈昭宁嘴角微抿，手指指向账册上的数字，瞳孔微缩，镜头继续推近至她的手指和数字。"
        "左下，特写，4秒，账册特写置于掌心，沈昭宁手指指向某行数字，指尖微微发抖，镜头以俯视机位定格两秒。"
        "中下，近景，3秒，沈昭宁缓缓合上账册，表情从专注转为冷冽，肩膀微微绷紧，镜头缓慢拉回记录她的动作。"
        "右下，近景，1秒，沈昭宁转身面向正门，目光坚定，手持账册贴在胸前，镜头定格在她的侧脸和握紧账册的手上。"
        "[旁白：\"沈昭宁，沈府嫡长女。\"]"
    )

    prompts, lengths = _segments_from_grid_text(video_prompt)

    print(f"解析出 {len(prompts)} 格")
    print(f"时长列表: {lengths}")
    print(f"时长总和: {sum(l for l in lengths if l is not None)}秒")

    assert len(prompts) == 6, f"期望6格，实际{len(prompts)}格"
    assert all(l is not None for l in lengths), "有格缺少时长"
    total = sum(lengths)
    assert total == 18, f"期望总时长18秒，实际{total}秒"

    for i, (p, l) in enumerate(zip(prompts, lengths)):
        print(f"  格{i+1} ({l}秒): {p[:40]}...")

    print("✅ 测试2通过：6格，时长总和18秒")
    return True


def test_case_3_4grid_with_duration():
    """测试3：4宫格12秒，带时长标注"""
    print("\n=== 测试3：4宫格12秒，带时长标注 ===")
    video_prompt = (
        "电影感真人摄影，现代都市剧照，便服日常装，都市室内与街市场景，"
        "自然光与暖黄室内光，浅景深，35mm镜头质感，无文字无水印无边框。"
        "第一个镜头（对应2x2四宫格从左上至右下区域）："
        "左上，中景，3秒，李强坐在床边，手持彩票翻看，台灯暖黄光照亮简陋出租屋。"
        "右上，近景，4秒，李强手指指向彩票数字，瞳孔微缩，表情从专注转为震惊，镜头缓慢推近。"
        "左下，特写，3秒，彩票特写置于掌心，手指微微发抖，数字清晰可见，镜头以俯视机位定格。"
        "右下，近景，2秒，李强猛地抬头，嘴巴张开，表情震惊，镜头定格在他的侧脸上。"
        "[李强：\"全对上了！\"]"
    )

    prompts, lengths = _segments_from_grid_text(video_prompt)

    print(f"解析出 {len(prompts)} 格")
    print(f"时长列表: {lengths}")
    print(f"时长总和: {sum(l for l in lengths if l is not None)}秒")

    assert len(prompts) == 4, f"期望4格，实际{len(prompts)}格"
    assert all(l is not None for l in lengths), "有格缺少时长"
    total = sum(lengths)
    assert total == 12, f"期望总时长12秒，实际{total}秒"

    for i, (p, l) in enumerate(zip(prompts, lengths)):
        print(f"  格{i+1} ({l}秒): {p[:40]}...")

    print("✅ 测试3通过：4格，时长总和12秒")
    return True


def test_case_4_no_lens_marker():
    """测试4：没有镜头序号标注，直接从宫格位置开始"""
    print("\n=== 测试4：没有镜头序号标注 ===")
    video_prompt = (
        "电影感真人摄影，现代都市剧照。"
        "左上，中景，3秒，李强坐在床边翻看彩票。"
        "右上，近景，4秒，李强表情震惊。"
        "左下，特写，3秒，彩票数字特写。"
        "右下，近景，2秒，李强握拳站立。"
    )

    prompts, lengths = _segments_from_grid_text(video_prompt)

    print(f"解析出 {len(prompts)} 格")
    print(f"时长列表: {lengths}")

    assert len(prompts) == 4, f"期望4格，实际{len(prompts)}格"
    total = sum(l for l in lengths if l is not None)
    assert total == 12, f"期望总时长12秒，实际{total}秒"

    print("✅ 测试4通过：无镜头序号也能正确解析")
    return True


def test_case_5_non_grid_text_fallback():
    """测试5：非宫格位置标注的文本，应返回空（让_parse_prompts走其他解析路径）"""
    print("\n=== 测试5：非宫格位置标注的文本 ===")
    video_prompt = "这是一段普通的分镜描述文本，没有宫格位置标注。"

    prompts, lengths = _segments_from_grid_text(video_prompt)

    print(f"解析出 {len(prompts)} 格")
    assert len(prompts) == 0, f"期望0格（回退到其他解析），实际{len(prompts)}格"

    print("✅ 测试5通过：非宫格文本正确回退")
    return True


def test_case_6_mixed_shot_types():
    """测试6：混合景别，验证时长分配合理性"""
    print("\n=== 测试6：混合景别时长分配 ===")
    # 模拟一个合理的时长分配：有台词的近景长，中景短
    video_prompt = (
        "风格提示词。第一个镜头（对应3x3九宫格从左上至右下区域）："
        "左上，中景，2秒，建立场景。"
        "中上，近景，5秒，李强开口说话，表情紧张。"
        "[李强：\"我有钱！\"]"
        "右上，特写，3秒，手指特写。"
        "左中，近景，4秒，李强深呼吸。"
        "中中，特写，3秒，眼神特写。"
        "右中，近景，4秒，李军表情变化。"
        "左下，特写，2秒，道具特写。"
        "中下，近景，2秒，反应停顿。"
        "右下，近景，2秒，结尾定格。"
    )

    prompts, lengths = _segments_from_grid_text(video_prompt)

    print(f"解析出 {len(prompts)} 格")
    print(f"时长列表: {lengths}")
    total = sum(l for l in lengths if l is not None)

    assert len(prompts) == 9, f"期望9格，实际{len(prompts)}格"
    assert total == 27, f"期望总时长27秒，实际{total}秒"

    # 验证有台词的格（中上）时长最长
    assert lengths[1] == 5, f"有台词的格应时长最长，实际{lengths[1]}秒"

    print("✅ 测试6通过：混合景别时长分配合理")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("SF-WhatDreamsCost-ComfyUI 解析逻辑测试")
    print("=" * 60)

    results = []
    results.append(test_case_1_9grid_with_duration())
    results.append(test_case_2_6grid_with_duration())
    results.append(test_case_3_4grid_with_duration())
    results.append(test_case_4_no_lens_marker())
    results.append(test_case_5_non_grid_text_fallback())
    results.append(test_case_6_mixed_shot_types())

    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    if passed == total:
        print(f"🎉 全部测试通过！({passed}/{total})")
    else:
        print(f"❌ 有 {total - passed} 个测试失败 ({passed}/{total} 通过)")
    print("=" * 60)
