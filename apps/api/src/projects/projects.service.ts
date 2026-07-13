import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.videoProject.create({
      data: {
        userId,
        name: dto.name,
        originalFileName: '',
        systemFileName: '',
        filePath: '',
        fileSize: 0,
        durationSeconds: 0,
        width: 0,
        height: 0,
        orientation: '',
        status: 'CREATED',
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.videoProject.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        originalFileName: true,
        status: true,
        durationSeconds: true,
        width: true,
        height: true,
        createdAt: true,
      },
    });
  }

  async findOne(userId: string, projectId: string) {
    const project = await this.prisma.videoProject.findUnique({
      where: { id: projectId },
      include: { configuration: true, clips: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  async remove(userId: string, projectId: string) {
    const project = await this.prisma.videoProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.videoProject.delete({ where: { id: projectId } });
    return { success: true };
  }
}
