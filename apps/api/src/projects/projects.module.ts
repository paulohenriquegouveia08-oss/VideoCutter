import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProcessStatusController } from './process-status.controller';

@Module({
  controllers: [ProjectsController, ProcessStatusController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
