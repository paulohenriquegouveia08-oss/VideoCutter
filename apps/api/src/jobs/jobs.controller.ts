import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JobsService } from './jobs.service';

@ApiTags('Processing')
@Controller('projects/:id')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post('process')
  @ApiOperation({ summary: 'Start video processing' })
  startProcessing(@Request() req, @Param('id') id: string) {
    return this.jobsService.startProcessing(req.user.sub, id);
  }

  @Get('process-status')
  @ApiOperation({ summary: 'Get processing status' })
  getStatus(@Request() req, @Param('id') id: string) {
    return this.jobsService.getStatus(req.user.sub, id);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel processing' })
  cancel(@Request() req, @Param('id') id: string) {
    return this.jobsService.cancel(req.user.sub, id);
  }
}
