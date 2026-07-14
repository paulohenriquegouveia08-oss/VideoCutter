import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6381';
const QUEUE_NAME = 'video_processing';

@Injectable()
export class JobsService implements OnModuleInit {
  private redis: Redis;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.redis = new Redis(REDIS_URL);
  }

  async startProcessing(userId: string, projectId: string) {
    const project = await this.prisma.videoProject.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    if (project.status === 'PROCESSING') {
      throw new BadRequestException('Project is already being processed');
    }

    const config = await this.prisma.processingConfiguration.findUnique({ where: { projectId } });
    if (!config) {
      throw new BadRequestException('Configure the project before processing');
    }

    await this.prisma.videoProject.update({
      where: { id: projectId },
      data: { status: 'PROCESSING' },
    });

    const job = await this.prisma.processingJob.create({
      data: {
        projectId,
        type: 'FULL_PROCESS',
        status: 'PENDING',
      },
    });

    const queuePayload = {
      project_id: projectId,
      job_id: job.id,
      config: {
        splitMethod: config.splitMethod,
        selectionMode: config.selectionMode,
        requestedClipCount: config.requestedClipCount,
        targetDurationSeconds: config.targetDurationSeconds,
        minimumDurationSeconds: config.minimumDurationSeconds,
        maximumDurationSeconds: config.maximumDurationSeconds,
        maximumClipCount: config.maximumClipCount,
        outputOrientation: config.outputOrientation,
        outputAspectRatio: config.outputAspectRatio,
        cropMode: config.cropMode,
        generateSubtitles: config.generateSubtitles,
        subtitleStyle: config.subtitleStyle,
        subtitlePosition: config.subtitlePosition,
        subtitleLanguage: config.subtitleLanguage,
      },
    };

    await this.redis.lpush(QUEUE_NAME, JSON.stringify(queuePayload));

    return {
      jobId: job.id,
      status: 'QUEUED',
      message: 'Processing job queued. Worker will process shortly.',
    };
  }

  async getStatus(userId: string, projectId: string) {
    const project = await this.prisma.videoProject.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    const jobs = await this.prisma.processingJob.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const clips = await this.prisma.videoClip.findMany({
      where: { projectId },
      select: { id: true, status: true, sequence: true, durationSeconds: true },
    });

    return {
      projectStatus: project.status,
      jobs,
      clips: clips.length,
      clipsReady: clips.filter((c) => c.status === 'READY').length,
    };
  }

  async cancel(userId: string, projectId: string) {
    const project = await this.prisma.videoProject.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.processingJob.updateMany({
      where: { projectId, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'CANCELLED' },
    });

    await this.prisma.videoProject.update({
      where: { id: projectId },
      data: { status: 'CANCELLED' },
    });

    return { success: true };
  }

  async updateJobProgress(jobId: string, progress: number, message?: string) {
    return this.prisma.processingJob.update({
      where: { id: jobId },
      data: {
        progress,
        message,
        startedAt: progress === 0 ? new Date() : undefined,
        finishedAt: progress >= 100 ? new Date() : undefined,
        status: progress >= 100 ? 'COMPLETED' : 'PROCESSING',
      },
    });
  }
}
