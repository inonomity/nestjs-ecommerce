import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, CreateAddressDto, UpdateAddressDto, UpdateUserRoleDto, UpdateUserStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';
import { Address } from './entities/address.entity';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@CurrentUser() user: User): Promise<User> {
    return this.usersService.findById(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(user.id, dto);
  }

  // Address endpoints
  @Get('me/addresses')
  @ApiOperation({ summary: 'Get user addresses' })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  async getAddresses(@CurrentUser() user: User): Promise<Address[]> {
    return this.usersService.getAddresses(user.id);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Create new address' })
  @ApiResponse({ status: 201, description: 'Address created' })
  async createAddress(
    @CurrentUser() user: User,
    @Body() dto: CreateAddressDto,
  ): Promise<Address> {
    return this.usersService.createAddress(user.id, dto);
  }

  @Get('me/addresses/:id')
  @ApiOperation({ summary: 'Get address by ID' })
  @ApiResponse({ status: 200, description: 'Address details' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async getAddress(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Address> {
    return this.usersService.getAddressById(user.id, id);
  }

  @Put('me/addresses/:id')
  @ApiOperation({ summary: 'Update address' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async updateAddress(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<Address> {
    return this.usersService.updateAddress(user.id, id, dto);
  }

  @Delete('me/addresses/:id')
  @ApiOperation({ summary: 'Delete address' })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async deleteAddress(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.usersService.deleteAddress(user.id, id);
    return { message: 'Address deleted successfully' };
  }

  @Put('me/addresses/:id/default')
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({ status: 200, description: 'Address set as default' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async setDefaultAddress(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Address> {
    return this.usersService.setDefaultAddress(user.id, id);
  }

  // Admin endpoints
  @Put(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user role (Admin)' })
  @ApiResponse({ status: 200, description: 'User role updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<User> {
    return this.usersService.updateRole(id, dto.role);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user status (Admin)' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<User> {
    return this.usersService.updateStatus(id, dto.isActive);
  }
}
