import {
  Controller,
  Get,
  Post,
  Put,
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
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  AddTrackingDto,
  OrderResponseDto,
} from './dto/order.dto';
import { OrderStatusHistory } from './entities/order.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  @ApiResponse({ status: 201, description: 'Order created', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Cart is empty' })
  async createOrder(
    @CurrentUser() user: User,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'List of orders', type: [OrderResponseDto] })
  async getOrders(@CurrentUser() user: User): Promise<OrderResponseDto[]> {
    return this.ordersService.getUserOrders(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order details', type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(id, user.id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get order status history' })
  @ApiResponse({ status: 200, description: 'Status history' })
  async getOrderHistory(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderStatusHistory[]> {
    // Verify user has access to the order first
    await this.ordersService.getOrderById(id, user.id);
    return this.ordersService.getOrderStatusHistory(id);
  }

  // Admin endpoints
  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PARTNER)
  @ApiOperation({ summary: 'Update order status (Admin/Partner)' })
  @ApiResponse({ status: 200, description: 'Status updated', type: OrderResponseDto })
  async updateStatus(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateOrderStatus(id, dto, user.id);
  }

  @Post(':id/tracking')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PARTNER)
  @ApiOperation({ summary: 'Add tracking info (Admin/Partner)' })
  @ApiResponse({ status: 201, description: 'Tracking added', type: OrderResponseDto })
  async addTracking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTrackingDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.addTracking(id, dto);
  }
}
