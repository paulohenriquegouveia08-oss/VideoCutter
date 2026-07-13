import { Controller, Get, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigurationService } from './configuration.service';

@ApiTags('Configuration')
@Controller('projects/:id/configuration')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConfigurationController {
  constructor(private configService: ConfigurationService) {}

  @Get()
  @ApiOperation({ summary: 'Get project configuration' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.configService.findOne(req.user.sub, id);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update project configuration' })
  upsert(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.configService.upsert(req.user.sub, id, body);
  }
}
