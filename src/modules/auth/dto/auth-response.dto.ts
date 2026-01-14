import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  company?: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ required: false })
  avatarUrl?: string;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}
