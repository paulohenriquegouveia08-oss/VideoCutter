import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfigurationService {
  constructor(private prisma: PrismaService) {}

  async upsert(userId: string, projectId: string, dto: any) {
    const project = await this.prisma.videoProject.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.processingConfiguration.upsert({
      where: { projectId },
      create: {
        projectId,
        splitMethod: dto.splitMethod,
        selectionMode: dto.selectionMode,
        requestedClipCount: dto.requestedClipCount,
        targetDurationSeconds: dto.targetDurationSeconds,
        minimumDurationSeconds: dto.minimumDurationSeconds || 15,
        maximumDurationSeconds: dto.maximumDurationSeconds || 180,
        maximumClipCount: dto.maximumClipCount || 30,
        outputOrientation: dto.outputOrientation,
        outputAspectRatio: dto.outputAspectRatio,
        cropMode: dto.cropMode || 'BLUR_BG',
        generateSubtitles: dto.generateSubtitles !== false,
        subtitleStyle: dto.subtitleStyle || 'DYNAMIC',
        subtitlePosition: dto.subtitlePosition || 'BOTTOM_CENTER',
        subtitleLanguage: dto.subtitleLanguage || 'pt',
      },
      update: {
        splitMethod: dto.splitMethod,
        selectionMode: dto.selectionMode,
        requestedClipCount: dto.requestedClipCount,
        targetDurationSeconds: dto.targetDurationSeconds,
        minimumDurationSeconds: dto.minimumDurationSeconds,
        maximumDurationSeconds: dto.maximumDurationSeconds,
        maximumClipCount: dto.maximumClipCount,
        outputOrientation: dto.outputOrientation,
        outputAspectRatio: dto.outputAspectRatio,
        cropMode: dto.cropMode,
        generateSubtitles: dto.generateSubtitles,
        subtitleStyle: dto.subtitleStyle,
        subtitlePosition: dto.subtitlePosition,
        subtitleLanguage: dto.subtitleLanguage,
      },
    });
  }

  async findOne(userId: string, projectId: string) {
    const project = await this.prisma.videoProject.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.processingConfiguration.findUnique({ where: { projectId } });
  }
}
