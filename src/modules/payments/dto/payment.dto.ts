import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { PaymentStatus, PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentIntentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;
}

export class RefundPaymentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty({ enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty({ required: false })
  clientSecret?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  paidAt?: Date;
}

export class PaymentIntentResponseDto {
  @ApiProperty()
  clientSecret: string;

  @ApiProperty()
  paymentIntentId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;
}
