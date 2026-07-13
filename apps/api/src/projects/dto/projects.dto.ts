import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Podcast Episódio 01' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class ProjectResponseDto {
  id: string;
  name: string;
  originalFileName: string;
  fileSize: bigint;
  durationSeconds: number;
  width: number;
  height: number;
  orientation: string;
  status: string;
  createdAt: Date;
}
