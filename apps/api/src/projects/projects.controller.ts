import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/projects.dto';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@Request() req, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  findAll(@Request() req) {
    return this.projectsService.findAll(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.projectsService.findOne(req.user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  remove(@Request() req, @Param('id') id: string) {
    return this.projectsService.remove(req.user.sub, id);
  }
}
