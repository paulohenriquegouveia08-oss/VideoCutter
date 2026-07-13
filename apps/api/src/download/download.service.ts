import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE_PATH = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');

@Injectable()
export class DownloadService {
  constructor(private prisma: PrismaService) {}

  async getTranscript(userId: string, projectId: string) {
    const project = await this.prisma.videoProject.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) throw new NotFoundException('Not found');

    const transcript = await this.prisma.transcript.findUnique({ where: { projectId } });
    if (!transcript) throw new NotFoundException('Transcript not found');

    return transcript;
  }

  async getSrt(userId: string, projectId: string) {
    const project = await this.prisma.videoProject.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) throw new NotFoundException('Not found');

    const srt = await this.prisma.srtFile.findUnique({
      where: { transcriptId: (await this.prisma.transcript.findUnique({ where: { projectId } }))?.id || '' },
    });
    if (!srt) throw new NotFoundException('SRT not found');

    return srt;
  }

  getClipFilePath(clipId: string): string | null {
    const clipsDir = path.join(STORAGE_PATH, 'clips');
    if (!fs.existsSync(clipsDir)) return null;

    const files = fs.readdirSync(clipsDir);
    for (const f of files) {
      if (f.includes(clipId) && f.endsWith('.mp4')) {
        return path.join(clipsDir, f);
      }
    }

    return null;
  }
}
