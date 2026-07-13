import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadService } from './upload.service';
import { createReadStream, existsSync } from 'fs';
import { Response } from 'express';

@ApiTags('Upload')
@Controller()
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('projects/:id/upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload video file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async upload(
    @Param('id') projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadService.uploadFile(projectId, file);
  }

  @Get('projects/:id/video')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stream video file' })
  async streamVideo(
    @Param('id') projectId: string,
    @Res() res: Response,
  ) {
    const filePath = this.uploadService.getFilePath(projectId, 'originals');
    if (!filePath || !existsSync(filePath)) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }

    const stat = require('fs').statSync(filePath);
    const range = res.req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });

      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': 'video/mp4',
      });
      createReadStream(filePath).pipe(res);
    }
  }

  @Get('projects/:id/preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stream video preview' })
  async streamPreview(
    @Param('id') projectId: string,
    @Res() res: Response,
  ) {
    const filePath = this.uploadService.getFilePath(projectId, 'previews');
    if (!filePath || !existsSync(filePath)) {
      res.status(404).json({ message: 'Preview not found' });
      return;
    }

    const stat = require('fs').statSync(filePath);
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
    });
    createReadStream(filePath).pipe(res);
  }
}
