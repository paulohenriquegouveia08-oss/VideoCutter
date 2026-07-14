import os
import sys
import json
import time
import redis
import psycopg2

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import REDIS_URL, STORAGE_PATH, DATABASE_URL
from services.ffmpeg_ops import (
    extract_metadata, extract_audio, cut_video,
    make_vertical_blur_bg, make_vertical_center_crop,
    generate_thumbnail, generate_preview, burn_subtitles,
)
from services.clip_selector import select_clips_sequential, select_clips_highlights

QUEUE_NAME = "video_processing"


def get_db():
    return psycopg2.connect(DATABASE_URL)


def notify(job_id, project_id, stage, progress, message=""):
    print(f"[PROGRESS] {project_id}: {stage} {progress}% {message}")
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute("""
            UPDATE processing_jobs
            SET status = %s, progress = %s, message = %s,
                started_at = CASE WHEN started_at IS NULL THEN NOW() ELSE started_at END,
                finished_at = CASE WHEN %s >= 100 THEN NOW() ELSE NULL END
            WHERE id = %s
        """, (
            'COMPLETED' if progress >= 100 else 'PROCESSING',
            progress, message, progress, job_id
        ))

        if progress >= 100:
            cur.execute("UPDATE video_projects SET status = 'COMPLETED' WHERE id = %s", (project_id,))
        elif progress > 0:
            cur.execute("UPDATE video_projects SET status = 'PROCESSING' WHERE id = %s", (project_id,))

        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to notify progress: {e}")


def process_project(job_data):
    project_id = job_data["project_id"]
    job_id = job_data["job_id"]
    config = job_data["config"]

    originals_dir = os.path.join(STORAGE_PATH, "originals")
    files = [f for f in os.listdir(originals_dir) if f.startswith(project_id)] if os.path.exists(originals_dir) else []
    if not files:
        print(f"[ERROR] No original file found for project {project_id}")
        return

    original_path = os.path.join(originals_dir, files[0])

    print(f"[INFO] Processing project {project_id}")

    try:
        notify(job_id, project_id, "EXTRACTING_AUDIO", 10, "Extracting audio...")
        audio_dir = os.path.join(STORAGE_PATH, "audio")
        os.makedirs(audio_dir, exist_ok=True)
        audio_path = os.path.join(audio_dir, f"{project_id}.wav")
        extract_audio(original_path, audio_path)

        notify(job_id, project_id, "ANALYZING", 30, "Analyzing audio segments...")

        segments = _simple_segmentation(audio_path)

        notify(job_id, project_id, "SELECTING_CLIPS", 40, "Selecting best clips...")

        if config.get("selectionMode") == "HIGHLIGHTS":
            clips = select_clips_highlights(segments, config)
        else:
            clips = select_clips_sequential(segments, config)

        notify(job_id, project_id, "RENDERING", 50, f"Rendering {len(clips)} clips...")

        clips_dir = os.path.join(STORAGE_PATH, "clips")
        previews_dir = os.path.join(STORAGE_PATH, "previews")
        srt_dir = os.path.join(STORAGE_PATH, "subtitles")
        os.makedirs(clips_dir, exist_ok=True)
        os.makedirs(previews_dir, exist_ok=True)
        os.makedirs(srt_dir, exist_ok=True)

        total = len(clips)
        for i, clip in enumerate(clips):
            progress = 50 + int((i / max(total, 1)) * 45)
            notify(job_id, project_id, "RENDERING", progress, f"Clip {i+1}/{total}")

            clip_start = clip["start"]
            clip_end = clip["end"]

            srt_content = _generate_srt(clip.get("segments", []))
            clip_srt_path = os.path.join(srt_dir, f"{project_id}_clip_{i+1}.srt")
            with open(clip_srt_path, "w", encoding="utf-8") as f:
                f.write(srt_content)

            orientation = config.get("outputOrientation", "HORIZONTAL")
            crop_mode = config.get("cropMode", "BLUR_BG")

            if orientation == "VERTICAL":
                raw_clip = os.path.join(clips_dir, f"{project_id}_clip_{i+1}_raw.mp4")
                if crop_mode == "CENTER_CROP":
                    make_vertical_center_crop(original_path, raw_clip, clip_start, clip_end)
                else:
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

            transcript_text = " ".join(s.get("text", "") for s in clip.get("segments", []))

            _save_clip(project_id, i + 1, clip, final_clip, thumb_path, transcript_text)

        notify(job_id, project_id, "COMPLETED", 100, f"Done: {total} clips generated")

        for subdir in ["audio"]:
            d = os.path.join(STORAGE_PATH, subdir)
            if os.path.exists(d):
                for f in os.listdir(d):
                    if f.startswith(project_id):
                        try:
                            os.remove(os.path.join(d, f))
                        except:
                            pass

    except Exception as e:
        print(f"[ERROR] Processing failed: {e}")
        notify(job_id, project_id, "FAILED", 100, str(e))
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute("UPDATE video_projects SET status = 'FAILED' WHERE id = %s", (project_id,))
            conn.commit()
            cur.close()
            conn.close()
        except:
            pass


def _simple_segmentation(audio_path):
    try:
        import subprocess
        import json as j
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", audio_path],
            capture_output=True, text=True
        )
        info = j.loads(result.stdout)
        duration = float(info.get("format", {}).get("duration", 0))

        segments = []
        chunk_duration = 30.0
        t = 0
        while t < duration:
            end = min(t + chunk_duration, duration)
            segments.append({
                "start": round(t, 3),
                "end": round(end, 3),
                "text": f"Segment from {int(t//60)}:{int(t%60):02d} to {int(end//60)}:{int(end%60):02d}",
            })
            t = end

        return segments
    except:
        return []


def _generate_srt(segments):
    lines = []
    for i, seg in enumerate(segments, 1):
        start = _srt_time(seg["start"])
        end = _srt_time(seg["end"])
        lines.append(str(i))
        lines.append(f"{start} --> {end}")
        lines.append(seg.get("text", ""))
        lines.append("")
    return "\n".join(lines)


def _srt_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _save_clip(project_id, seq, clip, clip_path, thumb_path, transcript_text):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO video_clips (id, project_id, sequence, start_seconds, end_seconds,
                duration_seconds, transcript_text, file_path, thumbnail_path, status, score,
                created_at, updated_at)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, 'READY', %s, NOW(), NOW())
        """, (project_id, seq, clip["start"], clip["end"], clip["duration"],
              transcript_text, clip_path, thumb_path, clip.get("score", 0)))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to save clip: {e}")


def main():
    r = redis.from_url(REDIS_URL)
    print(f"[INFO] Worker started, listening on queue: {QUEUE_NAME}")

    while True:
        try:
            result = r.brpop(QUEUE_NAME, timeout=5)
            if result:
                _, job_json = result
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
