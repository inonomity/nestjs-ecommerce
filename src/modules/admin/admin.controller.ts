import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { UserRole } from '../users/entities/user.entity';
import { OrderStatus } from '../orders/entities/order.entity';
import { DashboardStatsDto, OrderStatsDto, RevenueByDayDto } from './dto/admin.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsDto,
  })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.adminService.getDashboardStats();
  }

  @Get('orders/stats')
  @ApiOperation({ summary: 'Get order statistics by status' })
  @ApiResponse({
    status: 200,
    description: 'Order statistics retrieved successfully',
    type: [OrderStatsDto],
  })
  async getOrderStats(): Promise<OrderStatsDto[]> {
    return this.adminService.getOrdersByStatus();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue by day' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to retrieve (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue data retrieved successfully',
    type: [RevenueByDayDto],
  })
  async getRevenue(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ): Promise<RevenueByDayDto[]> {
    return this.adminService.getRevenueByDay(days);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getAllUsers(page, limit);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
  })
  async getAllOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: OrderStatus,
  ) {
    return this.adminService.getAllOrders(page, limit, status);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent items to retrieve (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent activity retrieved successfully',
  })
  async getRecentActivity(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getRecentActivity(limit);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get all settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
  })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
  })
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }
}
