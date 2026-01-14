import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MaterialCategory } from '../entities/material.entity';

export class MaterialPropertiesDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  density: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  tensileStrength: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  flexuralStrength: number;

  @ApiProperty()
  @IsNumber()
  heatResistance: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  colorOptions: string[];
}

export class MaterialPricingDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  setupFee: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minPrice: number;

  @ApiProperty({ default: 'AED' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreateMaterialDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: MaterialCategory })
  @IsEnum(MaterialCategory)
  category: MaterialCategory;

  @ApiProperty({ type: MaterialPropertiesDto })
  @ValidateNested()
  @Type(() => MaterialPropertiesDto)
  properties: MaterialPropertiesDto;

  @ApiProperty({ type: MaterialPricingDto })
  @ValidateNested()
  @Type(() => MaterialPricingDto)
  pricing: MaterialPricingDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applications?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  leadTimeDays?: number;
}
