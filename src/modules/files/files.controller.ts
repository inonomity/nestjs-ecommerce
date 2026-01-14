import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { FilesService } from './files.service';
import { FileResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 52428800, // 50MB
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a 3D file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully', type: FileResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadFile(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FileResponseDto> {
    return this.filesService.uploadFile(user.id, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user files' })
  @ApiResponse({ status: 200, description: 'List of files', type: [FileResponseDto] })
  async getFiles(@CurrentUser() user: User): Promise<FileResponseDto[]> {
    return this.filesService.getUserFiles(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiResponse({ status: 200, description: 'File details', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FileResponseDto> {
    return this.filesService.getFileById(id, user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download file' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.filesService.getFileForDownload(id, user.id);
    
    const fileStream = fs.createReadStream(file.storagePath);
    
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
    });
    
    return new StreamableFile(fileStream);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete file' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.filesService.deleteFile(id, user.id);
    return { message: 'File deleted successfully' };
  }
}
