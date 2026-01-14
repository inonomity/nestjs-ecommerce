import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  UserDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto';
import { hashPassword, comparePasswords } from '../../common/utils/hash.util';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(dto.password);

    // Create user
    const user = this.userRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      company: dto.company,
    });

    await this.userRepository.save(user);

    // Generate tokens
    return this.generateAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await comparePasswords(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return this.generateAuthResponse(user);
  }

  async refreshTokens(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: {
        token: refreshToken,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (tokenRecord.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Revoke old token
    tokenRecord.isRevoked = true;
    await this.refreshTokenRepository.save(tokenRecord);

    // Generate new tokens
    return this.generateAuthResponse(tokenRecord.user, userAgent, ipAddress);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (tokenRecord) {
      tokenRecord.isRevoked = true;
      await this.refreshTokenRepository.save(tokenRecord);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success message for security
    if (!user) {
      return { message: 'If an account exists, a password reset email will be sent' };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await this.userRepository.save(user);

    // TODO: Send email with reset link
    // In production, integrate with email service
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    return { message: 'If an account exists, a password reset email will be sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    user.passwordHash = await hashPassword(dto.newPassword);
    user.passwordResetToken = null as any;
    user.passwordResetExpires = null as any;
    await this.userRepository.save(user);

    // Revoke all refresh tokens
    await this.logoutAll(user.id);

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await comparePasswords(dto.currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await hashPassword(dto.newPassword);
    await this.userRepository.save(user);

    // Revoke all refresh tokens except current session
    await this.logoutAll(user.id);

    return { message: 'Password has been changed successfully' };
  }

  async getProfile(userId: string): Promise<UserDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToDto(user);
  }

  private async generateAuthResponse(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    // Parse expiration time
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES') || '7d';
    const expiresAt = this.calculateExpirationDate(refreshExpiresIn);

    // Save refresh token
    const tokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      userAgent,
      ipAddress,
    });
    await this.refreshTokenRepository.save(tokenEntity);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: this.mapUserToDto(user),
    };
  }

  private calculateExpirationDate(duration: string): Date {
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    let milliseconds: number;
    switch (unit) {
      case 'd':
        milliseconds = value * 24 * 60 * 60 * 1000;
        break;
      case 'h':
        milliseconds = value * 60 * 60 * 1000;
        break;
      case 'm':
        milliseconds = value * 60 * 1000;
        break;
      case 's':
        milliseconds = value * 1000;
        break;
      default:
        milliseconds = 7 * 24 * 60 * 60 * 1000;
    }

    return new Date(Date.now() + milliseconds);
  }

  private mapUserToDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      company: user.company,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
