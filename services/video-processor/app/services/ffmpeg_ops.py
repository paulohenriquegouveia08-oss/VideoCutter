import subprocess
import os
import json


def extract_metadata(video_path: str) -> dict:
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)


def extract_audio(video_path: str, output_path: str) -> str:
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn", "-ac", "1", "-ar", "16000",
        "-acodec", "pcm_s16le",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


def cut_video(input_path: str, output_path: str, start: float, end: float, preset: str = "fast"):
    duration = end - start
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", input_path,
        "-t", str(duration),
        "-c:v", "libx264", "-preset", preset, "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-threads", "0",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


def make_vertical_blur_bg(input_path: str, output_path: str, start: float, end: float):
    duration = end - start
    vf = (
        "split[bg][fg];"
        "[bg]scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,boxblur=20[bg2];"
        "[fg]scale=1080:-1:force_original_aspect_ratio=decrease[fg2];"
        "[bg2][fg2]overlay=(W-w)/2:(H-h)/2"
    )
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", input_path,
        "-t", str(duration),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-threads", "0",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


def make_vertical_center_crop(input_path: str, output_path: str, start: float, end: float):
    duration = end - start
    vf = "crop=ih*9/16:ih,scale=1080:1920"
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", input_path,
        "-t", str(duration),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-threads", "0",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


def generate_thumbnail(input_path: str, output_path: str, timestamp: float):
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(timestamp),
        "-i", input_path,
        "-vframes", "1",
        "-vf", "scale=320:-1",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


def generate_preview(input_path: str, output_path: str):
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", "scale=480:-2",
        "-c:v", "libx264", "-preset", "fast", "-crf", "28",
        "-c:a", "aac", "-b:a", "64k",
        "-threads", "0",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


def burn_subtitles(input_path: str, output_path: str, srt_path: str, style: str = "default"):
    style_map = {
        "default": "FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2",
        "highlighted": "FontSize=32,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,Outline=3,Bold=1",
        "boxed": "FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,BorderStyle=4",
        "dynamic": "FontSize=36,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,Outline=3,Bold=1",
    }
    force_style = style_map.get(style, style_map["default"])

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"subtitles={srt_path}:force_style='{force_style}'",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "copy",
        "-threads", "0",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path
