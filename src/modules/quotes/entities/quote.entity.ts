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
import { File } from '../../files/entities/file.entity';
import { Material } from '../../materials/entities/material.entity';

export enum QuoteStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  ORDERED = 'ordered',
}

export interface PrintConfiguration {
  quantity: number;
  color: string;
  infillPercentage: number;
  layerHeight: number;
  supportStructures: boolean;
  postProcessing: string[];
}

export interface PricingBreakdown {
  materialCost: number;
  laborCost: number;
  setupFee: number;
  postProcessingFee: number;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
}

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  reference: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  fileId: string;

  @ManyToOne(() => File, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: File;

  @Column()
  materialId: string;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'materialId' })
  material: Material;

  @Column({ type: 'simple-json' })
  configuration: PrintConfiguration;

  @Column({ type: 'simple-json' })
  pricing: PricingBreakdown;

  @Column({ type: 'float' })
  estimatedPrintTimeHours: number;

  @Column()
  estimatedDeliveryDays: number;

  @Column({
    type: 'simple-enum',
    enum: QuoteStatus,
    default: QuoteStatus.ACTIVE,
  })
  status: QuoteStatus;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
