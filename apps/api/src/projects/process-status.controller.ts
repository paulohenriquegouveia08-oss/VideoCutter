import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Processing Status')
@Controller('projects/:id')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcessStatusController {
  constructor(private prisma: PrismaService) {}

  @Get('process-status')
  @ApiOperation({ summary: 'Get processing status with clips' })
  async getStatus(@Request() req, @Param('id') projectId: string) {
    const project = await this.prisma.videoProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        status: true,
        name: true,
        _count: { select: { clips: true } },
      },
    });

    if (!project) return { status: 'NOT_FOUND' };

    const jobs = await this.prisma.processingJob.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    const clips = await this.prisma.videoClip.findMany({
      where: { projectId },
      select: {
        id: true,
        sequence: true,
        startSeconds: true,
        endSeconds: true,
        durationSeconds: true,
        title: true,
        transcriptText: true,
        filePath: true,
        thumbnailPath: true,
        status: true,
        score: true,
        approved: true,
      },
      orderBy: { sequence: 'asc' },
    });

    return {
      projectStatus: project.status,
      projectName: project.name,
      currentJob: jobs[0] || null,
      totalClips: clips.length,
      clips,
    };
  }
}
