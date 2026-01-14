import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PROCESSING = 'processing',
  PRINTING = 'printing',
  POST_PROCESSING = 'post_processing',
  QUALITY_CHECK = 'quality_check',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderPricing {
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discount: number;
  total: number;
  currency: string;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @Column({
    type: 'simple-enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status: OrderStatus;

  @Column({ type: 'simple-json' })
  shippingAddress: ShippingAddress;

  @Column({ type: 'simple-json', nullable: true })
  billingAddress: ShippingAddress;

  @Column({ type: 'simple-json' })
  pricing: OrderPricing;

  @Column({ nullable: true })
  paymentIntentId: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  adminNotes: string;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date;

  @Column({ type: 'datetime', nullable: true })
  shippedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  deliveredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  quoteId: string;

  @Column()
  fileId: string;

  @Column()
  materialId: string;

  @Column()
  fileName: string;

  @Column()
  materialName: string;

  @Column({ type: 'simple-json' })
  configuration: {
    quantity: number;
    color: string;
    infillPercentage: number;
    layerHeight: number;
    supportStructures: boolean;
    postProcessing: string[];
  };

  @Column({ type: 'float' })
  unitPrice: number;

  @Column()
  quantity: number;

  @Column({ type: 'float' })
  totalPrice: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({
    type: 'simple-enum',
    enum: OrderStatus,
  })
  status: OrderStatus;

  @Column({ nullable: true })
  comment: string;

  @Column({ nullable: true })
  changedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('tracking')
export class Tracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  carrier: string;

  @Column()
  trackingNumber: string;

  @Column({ nullable: true })
  trackingUrl: string;

  @Column({ type: 'simple-json', nullable: true })
  events: Array<{
    status: string;
    location: string;
    timestamp: string;
    description: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
