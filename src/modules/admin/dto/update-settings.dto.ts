import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class UpdateSettingsDto {
  // General Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  storeName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  storeUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supportEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  // Pricing Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  taxIncluded?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  setupFee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minimumOrderAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  volumeDiscountEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  volumeDiscountThreshold?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  volumeDiscountPercent?: number;

  // Shipping Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  freeShippingThreshold?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  standardShippingRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  expressShippingRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  internationalShippingEnabled?: boolean;

  // Payment Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  stripeEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  stripeTestMode?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  paypalEnabled?: boolean;

  // Email Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  orderConfirmationEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  shippingNotificationEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  deliveryConfirmationEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  marketingEmailsEnabled?: boolean;

  // Security Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  twoFactorRequired?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sessionTimeout?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxLoginAttempts?: number;
}
