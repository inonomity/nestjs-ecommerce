import { ApiProperty } from '@nestjs/swagger';
import { FileStatus, FileAnalysis } from '../entities/file.entity';

export class FileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @ApiProperty({ enum: FileStatus })
  status: FileStatus;

  @ApiProperty({ required: false })
  analysis?: FileAnalysis;

  @ApiProperty({ required: false })
  thumbnailUrl?: string;

  @ApiProperty()
  createdAt: Date;
}
