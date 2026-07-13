import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ALLOWED_TYPES = ['.mp4', '.mov', '.mkv'];
const MAX_SIZE = 2 * 1024 * 1024 * 1024;
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  async uploadFile(projectId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      throw new BadRequestException(`Invalid file type: ${ext}. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }

    if (file.size > MAX_SIZE) {
      throw new BadRequestException(`File too large: ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB. Max: 2GB`);
    }

    const project = await this.prisma.videoProject.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const systemFileName = `${projectId}${ext}`;
    const originalsDir = path.join(STORAGE_PATH, 'originals');
    if (!fs.existsSync(originalsDir)) {
      fs.mkdirSync(originalsDir, { recursive: true });
    }

    const filePath = path.join(originalsDir, systemFileName);
    if (file.buffer) {
      fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, filePath);
    }

    const metadata = this.extractMetadata(filePath);
    const hasAudio = metadata.streams?.some((s: any) => s.codec_type === 'audio') ?? false;

    const videoStream = metadata.streams?.find((s: any) => s.codec_type === 'video');
    const width = videoStream?.width || 0;
    const height = videoStream?.height || 0;
    const orientation = width > height ? 'HORIZONTAL' : width < height ? 'VERTICAL' : 'SQUARE';
    const fps = videoStream?.r_frame_rate ? this.parseFps(videoStream.r_frame_rate) : 30;

    await this.prisma.videoProject.update({
      where: { id: projectId },
      data: {
        originalFileName: file.originalname,
        systemFileName,
        filePath: `originals/${systemFileName}`,
        fileSize: BigInt(file.size),
        durationSeconds: metadata.duration || 0,
        width,
        height,
        orientation,
        codec: videoStream?.codec_name || null,
        fps,
        hasAudio,
        status: 'UPLOADED',
      },
    });

    const previewDir = path.join(STORAGE_PATH, 'previews');
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }

    const previewPath = path.join(previewDir, `${projectId}-preview.mp4`);
    try {
      execSync(
        `ffmpeg -y -i "${filePath}" -vf scale=480:-2 -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 64k -threads 0 "${previewPath}" 2>/dev/null`,
        { timeout: 60000 },
      );
    } catch {}

    return {
      projectId,
      originalFileName: file.originalname,
      fileSize: file.size,
      duration: metadata.duration,
      width,
      height,
      orientation,
      codec: videoStream?.codec_name,
      fps,
      hasAudio,
    };
  }

  getFilePath(projectId: string, type: 'originals' | 'previews' | 'clips' = 'originals') {
    const dir = path.join(STORAGE_PATH, type);
    const files = fs.readdirSync(dir).filter(f => f.startsWith(projectId));
    if (files.length === 0) return null;
    return path.join(dir, files[0]);
  }

  private extractMetadata(filePath: string): any {
    try {
      const result = execSync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
        { encoding: 'utf-8', timeout: 30000 },
      );
      const parsed = JSON.parse(result);
      return {
        duration: parseFloat(parsed.format?.duration || '0'),
        streams: parsed.streams || [],
        format: parsed.format || {},
      };
    } catch {
      return { duration: 0, streams: [], format: {} };
    }
  }

  private parseFps(fpsStr: string): number {
    try {
      const [num, den] = fpsStr.split('/').map(Number);
      return Math.round((num / den) * 100) / 100;
    } catch {
      return 30;
    }
  }
}
