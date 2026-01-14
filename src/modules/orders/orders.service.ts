import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  Tracking,
  OrderPricing,
} from './entities/order.entity';
import { CartService } from '../cart/cart.service';
import { QuotesService } from '../quotes/quotes.service';
import { FilesService } from '../files/files.service';
import { MaterialsService } from '../materials/materials.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  AddTrackingDto,
  OrderResponseDto,
} from './dto/order.dto';
import { generateOrderNumber } from '../../common/utils/order-number.util';
import { UserRole } from '../users/entities/user.entity';

const SHIPPING_COST = 25; // Fixed shipping cost in AED
const TAX_RATE = 0.05; // 5% VAT

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private readonly statusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Tracking)
    private readonly trackingRepository: Repository<Tracking>,
    private readonly cartService: CartService,
    private readonly quotesService: QuotesService,
    private readonly filesService: FilesService,
    private readonly materialsService: MaterialsService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<OrderResponseDto> {
    // Get user's cart
    const cart = await this.cartService.getCartEntity(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Calculate pricing
    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const cartItem of cart.items) {
      const quote = await this.quotesService.getQuoteEntityById(cartItem.quoteId);
      const file = await this.filesService.getFileEntityById(quote.fileId);
      const material = await this.materialsService.findById(quote.materialId);

      orderItems.push({
        quoteId: cartItem.quoteId,
        fileId: quote.fileId,
        materialId: quote.materialId,
        fileName: file.originalName,
        materialName: material.name,
        configuration: quote.configuration,
        unitPrice: cartItem.unitPrice,
        quantity: cartItem.quantity,
        totalPrice: cartItem.totalPrice,
      });

      subtotal += cartItem.totalPrice;

      // Mark quote as ordered
      await this.quotesService.markAsOrdered(cartItem.quoteId);
    }

    const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + SHIPPING_COST + taxAmount) * 100) / 100;

    const pricing: OrderPricing = {
      subtotal,
      shippingCost: SHIPPING_COST,
      taxAmount,
      discount: 0,
      total,
      currency: 'AED',
    };

    // Create order
    const order = this.orderRepository.create({
      orderNumber: generateOrderNumber(),
      userId,
      status: OrderStatus.PENDING_PAYMENT,
      shippingAddress: {
        ...dto.shippingAddress,
        country: dto.shippingAddress.country || 'AE',
      },
      billingAddress: dto.billingAddress
        ? { ...dto.billingAddress, country: dto.billingAddress.country || 'AE' }
        : undefined,
      pricing,
      notes: dto.notes,
    });

    await this.orderRepository.save(order);

    // Create order items
    for (const item of orderItems) {
      const orderItem = this.orderItemRepository.create({
        ...item,
        orderId: order.id,
      });
      await this.orderItemRepository.save(orderItem);
    }

    // Add initial status history
    await this.addStatusHistory(order.id, OrderStatus.PENDING_PAYMENT, 'Order created');

    // Clear cart
    await this.cartService.clearCart(userId);

    return this.getOrderById(order.id, userId);
  }

  async getOrderById(
    orderId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapToResponse(order);
  }

  async getUserOrders(userId: string): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(orders.map((order) => this.mapToResponse(order)));
  }

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    changedBy: string,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate status transition
    this.validateStatusTransition(order.status, dto.status);

    order.status = dto.status;

    // Update timestamps based on status
    if (dto.status === OrderStatus.PAID) {
      order.paidAt = new Date();
    } else if (dto.status === OrderStatus.SHIPPED) {
      order.shippedAt = new Date();
    } else if (dto.status === OrderStatus.DELIVERED) {
      order.deliveredAt = new Date();
    }

    await this.orderRepository.save(order);

    // Add to status history
    await this.addStatusHistory(orderId, dto.status, dto.comment, changedBy);

    return this.mapToResponse(order);
  }

  async addTracking(orderId: string, dto: AddTrackingDto): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Create or update tracking
    let tracking = await this.trackingRepository.findOne({
      where: { orderId },
    });

    if (tracking) {
      tracking.carrier = dto.carrier;
      tracking.trackingNumber = dto.trackingNumber;
      if (dto.trackingUrl) {
        tracking.trackingUrl = dto.trackingUrl;
      }
    } else {
      tracking = this.trackingRepository.create({
        orderId,
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber,
        trackingUrl: dto.trackingUrl || '',
        events: [],
      });
    }

    await this.trackingRepository.save(tracking);

    return this.mapToResponse(order);
  }

  async getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    return this.statusHistoryRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  async getOrderEntityById(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updatePaymentIntent(orderId: string, paymentIntentId: string): Promise<void> {
    await this.orderRepository.update(orderId, { paymentIntentId });
  }

  private async addStatusHistory(
    orderId: string,
    status: OrderStatus,
    comment?: string,
    changedBy?: string,
  ): Promise<void> {
    const history = this.statusHistoryRepository.create({
      orderId,
      status,
      comment,
      changedBy,
    });
    await this.statusHistoryRepository.save(history);
  }

  private validateStatusTransition(current: OrderStatus, next: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      [OrderStatus.PROCESSING]: [OrderStatus.PRINTING, OrderStatus.CANCELLED],
      [OrderStatus.PRINTING]: [OrderStatus.POST_PROCESSING, OrderStatus.QUALITY_CHECK],
      [OrderStatus.POST_PROCESSING]: [OrderStatus.QUALITY_CHECK],
      [OrderStatus.QUALITY_CHECK]: [OrderStatus.SHIPPED, OrderStatus.PRINTING],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    if (!validTransitions[current]?.includes(next)) {
      throw new BadRequestException(
        `Invalid status transition from ${current} to ${next}`,
      );
    }
  }

  private async mapToResponse(order: Order): Promise<OrderResponseDto> {
    // Get tracking if exists
    const tracking = await this.trackingRepository.findOne({
      where: { orderId: order.id },
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      pricing: order.pricing,
      items: order.items.map((item) => ({
        id: item.id,
        fileName: item.fileName,
        materialName: item.materialName,
        configuration: item.configuration,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
      })),
      tracking: tracking
        ? {
            carrier: tracking.carrier,
            trackingNumber: tracking.trackingNumber,
            trackingUrl: tracking.trackingUrl,
          }
        : undefined,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
    };
  }
}
