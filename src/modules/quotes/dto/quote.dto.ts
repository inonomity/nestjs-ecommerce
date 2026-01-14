import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  Min,
  Max,
  IsUUID,
} from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty()
  @IsUUID()
  fileId: string;

  @ApiProperty()
  @IsUUID()
  materialId: string;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity: number;

  @ApiProperty({ default: 'White' })
  @IsString()
  color: string;

  @ApiProperty({ default: 20 })
  @IsNumber()
  @Min(10)
  @Max(100)
  infillPercentage: number;

  @ApiProperty({ default: 0.2 })
  @IsNumber()
  @Min(0.05)
  @Max(0.5)
  layerHeight: number;

  @ApiProperty({ default: false })
  @IsBoolean()
  supportStructures: boolean;

  @ApiProperty({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postProcessing?: string[];
}

export class QuoteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  fileId: string;

  @ApiProperty()
  materialId: string;

  @ApiProperty()
  configuration: {
    quantity: number;
    color: string;
    infillPercentage: number;
    layerHeight: number;
    supportStructures: boolean;
    postProcessing: string[];
  };

  @ApiProperty()
  pricing: {
    materialCost: number;
    laborCost: number;
    setupFee: number;
    postProcessingFee: number;
    subtotal: number;
    discount: number;
    total: number;
    currency: string;
  };

  @ApiProperty()
  estimatedPrintTimeHours: number;

  @ApiProperty()
  estimatedDeliveryDays: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;
}
