import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageProvider {
  save(file: Express.Multer.File, filename: string): Promise<string>;
  delete(storagePath: string): Promise<void>;
  getUrl(storagePath: string): string;
  exists(storagePath: string): Promise<boolean>;
}

@Injectable()
export class LocalStorageService implements StorageProvider {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadPath: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadPath = this.configService.get<string>('STORAGE_LOCAL_PATH') || 'uploads';
    this.ensureDirectoryExists(this.uploadPath);
    this.ensureDirectoryExists(path.join(this.uploadPath, 'thumbnails'));
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async save(file: Express.Multer.File, filename: string): Promise<string> {
    const storagePath = path.join(this.uploadPath, filename);
    
    return new Promise((resolve, reject) => {
      fs.writeFile(storagePath, file.buffer, (err) => {
        if (err) {
          this.logger.error(`Failed to save file: ${err.message}`);
          reject(err);
        } else {
          resolve(storagePath);
        }
      });
    });
  }

  async delete(storagePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.unlink(storagePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          this.logger.error(`Failed to delete file: ${err.message}`);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  getUrl(storagePath: string): string {
    // Return relative URL for local storage
    return `/files/download/${path.basename(storagePath)}`;
  }

  async exists(storagePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      fs.access(storagePath, fs.constants.F_OK, (err) => {
        resolve(!err);
      });
    });
  }

  getFullPath(filename: string): string {
    return path.join(this.uploadPath, filename);
  }

  getThumbnailPath(filename: string): string {
    return path.join(this.uploadPath, 'thumbnails', filename);
  }
}
