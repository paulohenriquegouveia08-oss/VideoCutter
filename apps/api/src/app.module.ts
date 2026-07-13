import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { UploadModule } from './upload/upload.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { JobsModule } from './jobs/jobs.module';
import { ClipsModule } from './clips/clips.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    UploadModule,
    ConfigurationModule,
    JobsModule,
    ClipsModule,
  ],
})
export class AppModule {}
