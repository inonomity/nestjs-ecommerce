import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { File, FileStatus } from './entities/file.entity';
import { LocalStorageService } from './storage/local-storage.service';
import { StlParserService } from './processors/stl-parser.service';
import { FileResponseDto } from './dto';

const ALLOWED_EXTENSIONS = ['.stl', '.obj', '.3mf', '.step', '.stp'];
const ALLOWED_MIME_TYPES = [
  'application/octet-stream',
  'application/sla',
  'model/stl',
  'model/obj',
  'model/3mf',
  'application/step',
];

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxFileSize: number;

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly storageService: LocalStorageService,
    private readonly stlParser: StlParserService,
    private readonly configService: ConfigService,
  ) {
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE') || 52428800; // 50MB
  }

  async uploadFile(
    userId: string,
    uploadedFile: Express.Multer.File,
  ): Promise<FileResponseDto> {
    // Validate file
    this.validateFile(uploadedFile);

    // Generate unique filename
    const ext = path.extname(uploadedFile.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;

    // Create file record
    const file = this.fileRepository.create({
      userId,
      originalName: uploadedFile.originalname,
      filename,
      mimeType: uploadedFile.mimetype,
      size: uploadedFile.size,
      storagePath: '',
      status: FileStatus.UPLOADING,
    });

    await this.fileRepository.save(file);

    try {
      // Save file to storage
      const storagePath = await this.storageService.save(uploadedFile, filename);
      file.storagePath = storagePath;
      file.status = FileStatus.PROCESSING;
      await this.fileRepository.save(file);

      // Analyze file (for STL files)
      if (ext === '.stl') {
        const analysis = await this.stlParser.analyzeStl(uploadedFile.buffer);
        file.analysis = analysis;
        
        if (analysis.hasErrors) {
          file.status = FileStatus.ERROR;
          file.errorMessage = analysis.errors?.join(', ') || 'Unknown error';
        } else {
          file.status = FileStatus.READY;
        }
      } else {
        // For other file types, provide default analysis values
        // These can be refined later with proper parsers for each format
        file.analysis = {
          volume: 100, // Default 100 cm³
          surfaceArea: 200, // Default 200 cm²
          boundingBox: { x: 10, y: 10, z: 10 },
          triangleCount: 0,
          isWatertight: true,
          hasErrors: false,
        };
        file.status = FileStatus.READY;
      }

      await this.fileRepository.save(file);

      return this.mapToResponse(file);
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`);
      file.status = FileStatus.ERROR;
      file.errorMessage = error.message;
      await this.fileRepository.save(file);
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  async getFileById(fileId: string, userId: string): Promise<FileResponseDto> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return this.mapToResponse(file);
  }

  async getUserFiles(userId: string): Promise<FileResponseDto[]> {
    const files = await this.fileRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return files.map((file) => this.mapToResponse(file));
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Delete from storage
    try {
      await this.storageService.delete(file.storagePath);
      if (file.thumbnailPath) {
        await this.storageService.delete(file.thumbnailPath);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete file from storage: ${error.message}`);
    }

    await this.fileRepository.remove(file);
  }

  async getFileForDownload(fileId: string, userId: string): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async getFileEntityById(fileId: string): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }
  }

  private mapToResponse(file: File): FileResponseDto {
    return {
      id: file.id,
      originalName: file.originalName,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      status: file.status,
      analysis: file.analysis,
      thumbnailUrl: file.thumbnailPath
        ? this.storageService.getUrl(file.thumbnailPath)
        : undefined,
      createdAt: file.createdAt,
    };
  }
}
