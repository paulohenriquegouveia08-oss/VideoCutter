import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://videocutter:vc_secret_2024@localhost:5436/videocutter")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6381")
STORAGE_PATH = os.getenv("STORAGE_PATH", "./storage")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "medium")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
