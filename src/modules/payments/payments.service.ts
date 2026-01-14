import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/entities/order.entity';
import {
  CreatePaymentIntentDto,
  RefundPaymentDto,
  PaymentResponseDto,
  PaymentIntentResponseDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey && stripeSecretKey !== 'sk_test_placeholder') {
      this.stripe = new Stripe(stripeSecretKey);
    }
  }

  async createPaymentIntent(
    userId: string,
    dto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentResponseDto> {
    // Get order and verify ownership
    const order = await this.ordersService.getOrderEntityById(dto.orderId);

    if (order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not pending payment');
    }

    // Check if Stripe is configured
    if (!this.stripe) {
      throw new BadRequestException('Payment service is not configured');
    }

    // Check for existing pending payment
    let payment = await this.paymentRepository.findOne({
      where: {
        orderId: dto.orderId,
        status: PaymentStatus.PENDING,
      },
    });

    let paymentIntent: Stripe.PaymentIntent;

    if (payment && payment.stripePaymentIntentId) {
      // Retrieve existing payment intent
      try {
        paymentIntent = await this.stripe.paymentIntents.retrieve(
          payment.stripePaymentIntentId,
        );
      } catch {
        // Create new if retrieval fails
        paymentIntent = await this.createStripePaymentIntent(order);
        payment.stripePaymentIntentId = paymentIntent.id;
        await this.paymentRepository.save(payment);
      }
    } else {
      // Create new payment intent
      paymentIntent = await this.createStripePaymentIntent(order);

      // Create payment record
      payment = this.paymentRepository.create({
        orderId: dto.orderId,
        stripePaymentIntentId: paymentIntent.id,
        amount: order.pricing.total,
        currency: order.pricing.currency,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.CARD,
      });

      await this.paymentRepository.save(payment);

      // Update order with payment intent ID
      await this.ordersService.updatePaymentIntent(dto.orderId, paymentIntent.id);
    }

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount: order.pricing.total,
      currency: order.pricing.currency,
    };
  }

  async getPaymentByOrderId(
    orderId: string,
    userId: string,
  ): Promise<PaymentResponseDto> {
    // Verify order ownership
    const order = await this.ordersService.getOrderEntityById(orderId);
    if (order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const payment = await this.paymentRepository.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.mapToResponse(payment);
  }

  async handleWebhook(
    payload: Buffer,
    signature: string,
  ): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Payment service is not configured');
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
      this.logger.warn('Stripe webhook secret not configured');
      return;
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Webhook signature verification failed');
    }

    await this.processWebhookEvent(event);
  }

  async refundPayment(
    orderId: string,
    dto: RefundPaymentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId, status: PaymentStatus.SUCCEEDED },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found or not successful');
    }

    if (!this.stripe) {
      throw new BadRequestException('Payment service is not configured');
    }

    const refundAmount = dto.amount || payment.amount;
    
    if (refundAmount > payment.amount - payment.refundedAmount) {
      throw new BadRequestException('Refund amount exceeds available balance');
    }

    try {
      await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: dto.reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
      });

      payment.refundedAmount += refundAmount;
      
      if (payment.refundedAmount >= payment.amount) {
        payment.status = PaymentStatus.REFUNDED;
      } else {
        payment.status = PaymentStatus.PARTIALLY_REFUNDED;
      }

      await this.paymentRepository.save(payment);

      // Update order status
      await this.ordersService.updateOrderStatus(
        orderId,
        { status: OrderStatus.REFUNDED },
        'system',
      );

      return this.mapToResponse(payment);
    } catch (err) {
      this.logger.error(`Refund failed: ${err.message}`);
      throw new BadRequestException(`Refund failed: ${err.message}`);
    }
  }

  private async createStripePaymentIntent(order: any): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: Math.round(order.pricing.total * 100), // Stripe expects cents
      currency: order.pricing.currency.toLowerCase(),
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  private async processWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentSuccess(paymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentFailure(paymentIntent);
        break;
      }
      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentCancellation(paymentIntent);
        break;
      }
      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for intent: ${paymentIntent.id}`);
      return;
    }

    payment.status = PaymentStatus.SUCCEEDED;
    payment.paidAt = new Date();
    await this.paymentRepository.save(payment);

    // Update order status
    await this.ordersService.updateOrderStatus(
      payment.orderId,
      { status: OrderStatus.PAID, comment: 'Payment received' },
      'system',
    );

    this.logger.log(`Payment succeeded for order: ${payment.orderId}`);
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for intent: ${paymentIntent.id}`);
      return;
    }

    payment.status = PaymentStatus.FAILED;
    payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    await this.paymentRepository.save(payment);

    this.logger.log(`Payment failed for order: ${payment.orderId}`);
  }

  private async handlePaymentCancellation(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      return;
    }

    payment.status = PaymentStatus.CANCELLED;
    await this.paymentRepository.save(payment);

    this.logger.log(`Payment cancelled for order: ${payment.orderId}`);
  }

  private mapToResponse(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
    };
  }
}
