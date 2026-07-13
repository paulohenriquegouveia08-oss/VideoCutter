import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

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

    return {
      jobId: job.id,
      status: 'QUEUED',
      message: 'Processing job created. Worker will pick it up shortly.',
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
