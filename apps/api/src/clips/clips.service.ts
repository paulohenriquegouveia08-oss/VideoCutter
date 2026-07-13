import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClipsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, projectId: string) {
    const project = await this.prisma.videoProject.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.videoClip.findMany({
      where: { projectId },
      orderBy: { sequence: 'asc' },
      include: { subtitles: true },
    });
  }

  async update(userId: string, clipId: string, dto: any) {
    const clip = await this.prisma.videoClip.findUnique({ where: { id: clipId }, include: { project: true } });
    if (!clip || clip.project.userId !== userId) {
      throw new NotFoundException('Clip not found');
    }

    return this.prisma.videoClip.update({
      where: { id: clipId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.startSeconds !== undefined && { startSeconds: dto.startSeconds }),
        ...(dto.endSeconds !== undefined && { endSeconds: dto.endSeconds }),
        ...(dto.approved !== undefined && { approved: dto.approved }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async remove(userId: string, clipId: string) {
    const clip = await this.prisma.videoClip.findUnique({ where: { id: clipId }, include: { project: true } });
    if (!clip || clip.project.userId !== userId) {
      throw new NotFoundException('Clip not found');
    }

    await this.prisma.videoClip.delete({ where: { id: clipId } });
    return { success: true };
  }

  async approve(userId: string, clipId: string) {
    return this.update(userId, clipId, { approved: true, status: 'APPROVED' });
  }
}
