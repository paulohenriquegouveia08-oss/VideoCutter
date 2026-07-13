import os
import sys
import json
import redis
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import REDIS_URL, STORAGE_PATH
from services.ffmpeg_ops import (
    extract_metadata, extract_audio, cut_video,
    make_vertical_blur_bg, make_vertical_center_crop,
    generate_thumbnail, generate_preview, burn_subtitles,
)
from services.transcriber import transcribe, generate_srt, generate_txt
from services.clip_selector import select_clips_sequential, select_clips_highlights

QUEUE_NAME = "video_processing"


def process_project(job_data: dict):
    project_id = job_data["project_id"]
    config = job_data["config"]
    original_path = os.path.join(STORAGE_PATH, "originals", f"{project_id}{_get_ext(project_id)}")

    if not os.path.exists(original_path):
        print(f"[ERROR] Original file not found: {original_path}")
        return

    print(f"[INFO] Processing project {project_id}")

    _notify(project_id, "TRANSCRIBING", 10)

    audio_dir = os.path.join(STORAGE_PATH, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    audio_path = os.path.join(audio_dir, f"{project_id}.wav")
    extract_audio(original_path, audio_path)

    _notify(project_id, "TRANSCRIBING", 30)
    transcript = transcribe(audio_path, config.get("subtitleLanguage", "pt"))

    srt_dir = os.path.join(STORAGE_PATH, "subtitles")
    os.makedirs(srt_dir, exist_ok=True)
    srt_content = generate_srt(transcript["segments"])
    srt_path = os.path.join(srt_dir, f"{project_id}.srt")
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(srt_content)

    txt_content = generate_txt(transcript["segments"])
    txt_path = os.path.join(srt_dir, f"{project_id}.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(txt_content)

    _notify(project_id, "SELECTING_CLIPS", 50)

    if config.get("selectionMode") == "HIGHLIGHTS":
        clips = select_clips_highlights(transcript["segments"], config)
    else:
        clips = select_clips_sequential(transcript["segments"], config)

    _notify(project_id, "RENDERING", 60)

    clips_dir = os.path.join(STORAGE_PATH, "clips")
    os.makedirs(clips_dir, exist_ok=True)
    previews_dir = os.path.join(STORAGE_PATH, "previews")
    os.makedirs(previews_dir, exist_ok=True)

    total = len(clips)
    for i, clip in enumerate(clips):
        progress = 60 + int((i / max(total, 1)) * 35)
        _notify(project_id, "RENDERING", progress, f"Clip {i+1}/{total}")

        clip_start = clip["start"]
        clip_end = clip["end"]
        clip_srt = _generate_clip_srt(transcript["segments"], clip_start, clip_end)
        clip_srt_path = os.path.join(srt_dir, f"{project_id}_clip_{i+1}.srt")
        with open(clip_srt_path, "w", encoding="utf-8") as f:
            f.write(clip_srt)

        orientation = config.get("outputOrientation", "HORIZONTAL")
        crop_mode = config.get("cropMode", "BLUR_BG")

        if orientation == "VERTICAL":
            if crop_mode == "CENTER_CROP":
                raw_clip = os.path.join(clips_dir, f"{project_id}_clip_{i+1}_raw.mp4")
                make_vertical_center_crop(original_path, raw_clip, clip_start, clip_end)
            else:
                raw_clip = os.path.join(clips_dir, f"{project_id}_clip_{i+1}_raw.mp4")
                make_vertical_blur_bg(original_path, raw_clip, clip_start, clip_end)
        else:
            raw_clip = os.path.join(clips_dir, f"{project_id}_clip_{i+1}_raw.mp4")
            cut_video(original_path, raw_clip, clip_start, clip_end)

        final_clip = os.path.join(clips_dir, f"{project_id}_clip_{i+1}.mp4")

        if config.get("generateSubtitles", True):
            burn_subtitles(raw_clip, final_clip, clip_srt_path, config.get("subtitleStyle", "dynamic"))
        else:
            os.rename(raw_clip, final_clip)

        if os.path.exists(raw_clip):
            os.remove(raw_clip)

        thumb_path = os.path.join(previews_dir, f"{project_id}_clip_{i+1}_thumb.jpg")
        generate_thumbnail(original_path, thumb_path, (clip_start + clip_end) / 2)

        transcript_text = " ".join(
            s["text"] for s in clip.get("segments", [])
        )

        _save_clip_result(project_id, i + 1, clip, final_clip, thumb_path, transcript_text, clip.get("score"))

    _notify(project_id, "COMPLETED", 100)

    _cleanup_temp_files(project_id)

    print(f"[INFO] Project {project_id} completed: {total} clips generated")


def _generate_clip_srt(all_segments: list, start: float, end: float) -> str:
    relevant = [s for s in all_segments if s["end"] > start and s["start"] < end]
    lines = []
    for i, seg in enumerate(relevant, 1):
        s_start = max(seg["start"] - start, 0)
        s_end = min(seg["end"] - start, end - start)
        lines.append(str(i))
        lines.append(f"{_srt_time(s_start)} --> {_srt_time(s_end)}")
        lines.append(seg["text"])
        lines.append("")
    return "\n".join(lines)


def _srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _get_ext(project_id: str) -> str:
    originals = os.path.join(STORAGE_PATH, "originals")
    for f in os.listdir(originals):
        if f.startswith(project_id):
            return os.path.splitext(f)[1]
    return ".mp4"


def _notify(project_id: str, stage: str, progress: int, message: str = ""):
    print(f"[PROGRESS] {project_id}: {stage} {progress}% {message}")


def _save_clip_result(project_id, seq, clip, clip_path, thumb_path, transcript_text, score):
    try:
        import psycopg2
        conn = psycopg2.connect(os.environ.get("DATABASE_URL", ""))
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO video_clips (id, project_id, sequence, start_seconds, end_seconds, duration_seconds, transcript_text, file_path, thumbnail_path, status, score, created_at, updated_at)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, 'READY', %s, NOW(), NOW())
        """, (project_id, seq, clip["start"], clip["end"], clip["duration"], transcript_text, clip_path, thumb_path, score or 0))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to save clip: {e}")


def _cleanup_temp_files(project_id: str):
    for subdir in ["audio"]:
        d = os.path.join(STORAGE_PATH, subdir)
        if os.path.exists(d):
            for f in os.listdir(d):
                if f.startswith(project_id):
                    try:
                        os.remove(os.path.join(d, f))
                    except:
                        pass


def main():
    r = redis.from_url(REDIS_URL)
    print(f"[INFO] Worker started, listening on queue: {QUEUE_NAME}")

    while True:
        try:
            _, job_json = r.brpop(QUEUE_NAME, timeout=5)
            if job_json:
                job_data = json.loads(job_json)
                process_project(job_data)
        except redis.exceptions.ConnectionError:
            print("[WARN] Redis connection lost, retrying in 5s...")
            time.sleep(5)
        except Exception as e:
            print(f"[ERROR] {e}")
            time.sleep(1)


if __name__ == "__main__":
    main()
