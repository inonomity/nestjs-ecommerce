import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum FileStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
}

export interface FileAnalysis {
  volume: number;           // in cm³
  surfaceArea: number;      // in cm²
  boundingBox: {
    x: number;
    y: number;
    z: number;
  };
  triangleCount: number;
  isWatertight: boolean;
  hasErrors: boolean;
  errors?: string[];
}

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  originalName: string;

  @Column()
  filename: string;

  @Column()
  mimeType: string;

  @Column()
  size: number;

  @Column()
  storagePath: string;

  @Column({ nullable: true })
  thumbnailPath: string;

  @Column({
    type: 'simple-enum',
    enum: FileStatus,
    default: FileStatus.UPLOADING,
  })
  status: FileStatus;

  @Column({ type: 'simple-json', nullable: true })
  analysis: FileAnalysis;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
