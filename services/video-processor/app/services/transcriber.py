from faster_whisper import WhisperModel
import os
from ..config import WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE


def transcribe(audio_path: str, language: str = None) -> dict:
    model = WhisperModel(WHISPER_MODEL, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE)

    segments_gen, info = model.transcribe(
        audio_path,
        language=language,
        beam_size=5,
        vad_filter=True,
    )

    segments = []
    full_text_parts = []

    for seg in segments_gen:
        segments.append({
            "start": round(seg.start, 3),
            "end": round(seg.end, 3),
            "text": seg.text.strip(),
            "confidence": round(seg.avg_logprob, 4) if seg.avg_logprob else None,
        })
        full_text_parts.append(seg.text.strip())

    return {
        "language": info.language,
        "duration": info.duration,
        "segments": segments,
        "full_text": " ".join(full_text_parts),
    }


def generate_srt(segments: list) -> str:
    lines = []
    for i, seg in enumerate(segments, 1):
        start = _format_srt_time(seg["start"])
        end = _format_srt_time(seg["end"])
        lines.append(f"{i}")
        lines.append(f"{start} --> {end}")
        lines.append(seg["text"])
        lines.append("")
    return "\n".join(lines)


def generate_txt(segments: list) -> str:
    return "\n".join(seg["text"] for seg in segments)


def _format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
