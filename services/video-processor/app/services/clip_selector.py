from ..rules.scoring import score_clip
from ..rules.validation import validate_clip


def select_clips_sequential(segments: list, config: dict) -> list:
    target = config.get("target_duration_seconds", 60)
    tolerance = config.get("tolerance_seconds", 10)
    min_dur = config.get("minimum_duration_seconds", 15)
    max_dur = config.get("maximum_duration_seconds", 180)
    max_clips = config.get("maximum_clip_count", 30)

    clips = []
    current_start = None
    current_segments = []
    current_duration = 0

    for seg in segments:
        if current_start is None:
            current_start = seg["start"]
            current_segments = []
            current_duration = 0

        seg_duration = seg["end"] - seg["start"]
        current_segments.append(seg)
        current_duration += seg_duration

        if abs(current_duration - target) <= tolerance:
            clip_end = seg["end"]
            if validate_clip(current_start, clip_end, min_dur, max_dur):
                clips.append({
                    "start": current_start,
                    "end": clip_end,
                    "duration": round(clip_end - current_start, 2),
                    "segments": current_segments[:],
                })
            current_start = None
            current_segments = []
            current_duration = 0

            if len(clips) >= max_clips:
                break

    if current_start is not None and current_segments:
        clip_end = current_segments[-1]["end"]
        if validate_clip(current_start, clip_end, min_dur, max_dur):
            clips.append({
                "start": current_start,
                "end": clip_end,
                "duration": round(clip_end - current_start, 2),
                "segments": current_segments[:],
            })

    return clips


def select_clips_highlights(segments: list, config: dict) -> list:
    count = config.get("requested_clip_count", 10)
    min_dur = config.get("minimum_duration_seconds", 30)
    max_dur = config.get("maximum_duration_seconds", 60)
    tolerance = config.get("tolerance_seconds", 10)

    candidates = []
    for i in range(len(segments)):
        current_start = segments[i]["start"]
        current_segments = []
        current_duration = 0

        for j in range(i, len(segments)):
            seg = segments[j]
            seg_dur = seg["end"] - seg["start"]
            current_segments.append(seg)
            current_duration += seg_dur

            if current_duration >= min_dur:
                clip_end = seg["end"]
                if validate_clip(current_start, clip_end, min_dur, max_dur):
                    score = score_clip(current_segments)
                    candidates.append({
                        "start": current_start,
                        "end": clip_end,
                        "duration": round(clip_end - current_start, 2),
                        "segments": current_segments[:],
                        "score": score,
                    })

            if current_duration > max_dur + tolerance:
                break

    candidates.sort(key=lambda c: c["score"], reverse=True)

    selected = []
    for candidate in candidates:
        if len(selected) >= count:
            break
        overlap = False
        for s in selected:
            if candidate["start"] < s["end"] and candidate["end"] > s["start"]:
                overlap = True
                break
        if not overlap:
            selected.append(candidate)

    selected.sort(key=lambda c: c["start"])
    return selected
