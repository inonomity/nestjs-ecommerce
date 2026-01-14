import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { AddressType } from '../entities/address.entity';

export class CreateAddressDto {
  @ApiProperty({ enum: AddressType, default: AddressType.SHIPPING })
  @IsEnum(AddressType)
  type: AddressType;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  addressLine1: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  city: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  state: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
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
