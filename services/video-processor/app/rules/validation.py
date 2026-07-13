MIN_DURATION = 15
MAX_DURATION = 180


def validate_clip(start: float, end: float, min_dur: float = MIN_DURATION, max_dur: float = MAX_DURATION) -> bool:
    duration = end - start
    if duration < min_dur:
        return False
    if duration > max_dur:
        return False
    if start < 0 or end <= start:
        return False
    return True


def validate_no_overlap(clips: list, max_overlap: float = 2.0) -> bool:
    sorted_clips = sorted(clips, key=lambda c: c["start"])
    for i in range(len(sorted_clips) - 1):
        overlap = sorted_clips[i]["end"] - sorted_clips[i + 1]["start"]
        if overlap > max_overlap:
            return False
    return True
