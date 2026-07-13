import { Controller, Get, Param, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DownloadService } from './download.service';
import { createReadStream, existsSync } from 'fs';
import { Response } from 'express';

@ApiTags('Download')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DownloadController {
  constructor(private downloadService: DownloadService) {}

  @Get('clips/:id/download')
  @ApiOperation({ summary: 'Download a clip' })
  async downloadClip(@Param('id') id: string, @Res() res: Response) {
    const filePath = this.downloadService.getClipFilePath(id);
    if (!filePath || !existsSync(filePath)) {
      res.status(404).json({ message: 'Clip not found' });
      return;
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="clip-${id}.mp4"`);
    createReadStream(filePath).pipe(res);
  }

  @Get('projects/:id/transcript')
  @ApiOperation({ summary: 'Get transcript' })
  async getTranscript(@Request() req, @Param('id') id: string) {
    return this.downloadService.getTranscript(req.user.sub, id);
  }

  @Get('projects/:id/subtitles')
  @ApiOperation({ summary: 'Get SRT subtitles' })
  async getSrt(@Request() req, @Param('id') id: string) {
    return this.downloadService.getSrt(req.user.sub, id);
  }
}
