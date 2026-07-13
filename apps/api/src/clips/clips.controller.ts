import { Controller, Get, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClipsService } from './clips.service';

@ApiTags('Clips')
@Controller('clips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClipsController {
  constructor(private clipsService: ClipsService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'List all clips for a project' })
  findAll(@Request() req, @Param('projectId') projectId: string) {
    return this.clipsService.findAll(req.user.sub, projectId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a clip' })
  update(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.clipsService.update(req.user.sub, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a clip' })
  remove(@Request() req, @Param('id') id: string) {
    return this.clipsService.remove(req.user.sub, id);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Approve a clip' })
  approve(@Request() req, @Param('id') id: string) {
    return this.clipsService.approve(req.user.sub, id);
  }
}
