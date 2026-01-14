import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class AddToCartDto {
  @ApiProperty()
  @IsUUID()
  quoteId: string;

  @ApiProperty({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCartItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CartItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  quoteId: string;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  quote?: {
    reference: string;
    fileId: string;
    materialId: string;
    configuration: any;
  };
}

export class CartResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty()
  itemCount: number;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  currency: string;
}
