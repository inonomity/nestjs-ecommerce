import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { File } from './entities/file.entity';
import { LocalStorageService } from './storage/local-storage.service';
import { StlParserService } from './processors/stl-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, LocalStorageService, StlParserService],
  exports: [FilesService],
})
export class FilesModule {}
