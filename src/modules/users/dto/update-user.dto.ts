import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEmail,
  IsBoolean,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  notifyOrderUpdates?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  notifyShipping?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  notifyPromotions?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  notifyNewsletter?: boolean;
}
