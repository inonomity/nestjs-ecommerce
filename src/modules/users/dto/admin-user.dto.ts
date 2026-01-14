import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsBoolean } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole, description: 'New user role' })
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'Whether user is active' })
  @IsBoolean()
  isActive: boolean;
}
