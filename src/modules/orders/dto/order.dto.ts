import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../entities/order.entity';

export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty()
  @IsString()
  addressLine1: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  postalCode: string;

  @ApiProperty({ default: 'AE' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({ type: ShippingAddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  billingAddress?: ShippingAddressDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class AddTrackingDto {
  @ApiProperty()
  @IsString()
  carrier: string;

  @ApiProperty()
  @IsString()
  trackingNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  trackingUrl?: string;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  shippingAddress: ShippingAddressDto;

  @ApiProperty({ required: false })
  billingAddress?: ShippingAddressDto;

  @ApiProperty()
  pricing: {
    subtotal: number;
    shippingCost: number;
    taxAmount: number;
    discount: number;
    total: number;
    currency: string;
  };

  @ApiProperty()
  items: Array<{
    id: string;
    fileName: string;
    materialName: string;
    configuration: any;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
  }>;

  @ApiProperty({ required: false })
  tracking?: {
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  paidAt?: Date;

  @ApiProperty({ required: false })
  shippedAt?: Date;

  @ApiProperty({ required: false })
  deliveredAt?: Date;
}
