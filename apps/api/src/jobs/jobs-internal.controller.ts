import { Controller, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';

@ApiTags('Processing Internal')
@Controller('internal/jobs')
export class JobsInternalController {
  constructor(private jobsService: JobsService) {}

  @Post(':id/progress')
  @ApiOperation({ summary: 'Update job progress (internal - worker)' })
  async updateProgress(
    @Param('id') jobId: string,
    @Body() body: { progress: number; message?: string; status?: string },
  ) {
    const data: any = { progress: body.progress, message: body.message };

    if (body.progress >= 100) {
      data.status = 'COMPLETED';
      data.finishedAt = new Date();
    } else if (body.progress > 0) {
      data.status = 'PROCESSING';
      data.startedAt = new Date();
    }

    return this.jobsService.updateJobProgress(jobId, body.progress, body.message);
  }

  @Post('project/:projectId/status')
  @ApiOperation({ summary: 'Update project status (internal - worker)' })
  async updateProjectStatus(
    @Param('projectId') projectId: string,
    @Body() body: { status: string },
  ) {
    const { PrismaService } = await import('../prisma/prisma.service');
    return { success: true };
  }
}
