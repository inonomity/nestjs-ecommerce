import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  CUSTOMER = 'customer',
  BUSINESS = 'business',
  PARTNER = 'partner',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  company: string;

  @Column({
    type: 'simple-enum',
    enum: UserRole,
    default: UserRole.ADMIN,
  })
  role: UserRole;

  @Column({
    type: 'simple-enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  @Exclude()
  emailVerificationToken: string;

  @Column({ nullable: true })
  @Exclude()
  passwordResetToken: string;

  @Column({ nullable: true, type: 'datetime' })
  @Exclude()
  passwordResetExpires: Date;

  @Column({ nullable: true, type: 'datetime' })
  lastLoginAt: Date;

  // Notification preferences
  @Column({ default: true })
  notifyOrderUpdates: boolean;

  @Column({ default: true })
  notifyShipping: boolean;

  @Column({ default: false })
  notifyPromotions: boolean;

  @Column({ default: false })
  notifyNewsletter: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual property for full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
