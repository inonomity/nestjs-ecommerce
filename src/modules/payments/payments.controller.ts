import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentIntentDto,
  RefundPaymentDto,
  PaymentResponseDto,
  PaymentIntentResponseDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment intent' })
  @ApiResponse({ status: 201, description: 'Payment intent created', type: PaymentIntentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid order or payment service not configured' })
  async createPaymentIntent(
    @CurrentUser() user: User,
    @Body() dto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentResponseDto> {
    return this.paymentsService.createPaymentIntent(user.id, dto);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by order ID' })
  @ApiResponse({ status: 200, description: 'Payment details', type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentByOrderId(
    @CurrentUser() user: User,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.getPaymentByOrderId(orderId, user.id);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    await this.paymentsService.handleWebhook(req.rawBody!, signature);
    return { received: true };
  }

  @Post('refund/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund payment (Admin)' })
  @ApiResponse({ status: 200, description: 'Payment refunded', type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async refundPayment(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: RefundPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.refundPayment(orderId, dto);
  }
}
