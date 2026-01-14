import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MaterialCategory {
  PLASTIC = 'plastic',
  RESIN = 'resin',
  METAL = 'metal',
  COMPOSITE = 'composite',
}

export interface MaterialProperties {
  density: number;        // g/cm³
  tensileStrength: number; // MPa
  flexuralStrength: number; // MPa
  heatResistance: number;  // °C
  colorOptions: string[];
}

export interface MaterialPricing {
  basePrice: number;      // per cm³
  setupFee: number;
  minPrice: number;
  currency: string;
}

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column('text')
  description: string;

  @Column({
    type: 'simple-enum',
    enum: MaterialCategory,
  })
  category: MaterialCategory;

  @Column({ type: 'simple-json' })
  properties: MaterialProperties;

  @Column({ type: 'simple-json' })
  pricing: MaterialPricing;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column('simple-array', { nullable: true })
  applications: string[];

  @Column({ nullable: true })
  leadTimeDays: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
