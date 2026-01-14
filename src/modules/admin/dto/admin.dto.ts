import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  newUsersToday: number;

  @ApiProperty()
  totalOrders: number;

  @ApiProperty()
  ordersToday: number;

  @ApiProperty()
  pendingOrders: number;

  @ApiProperty()
  processingOrders: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  revenueToday: number;

  @ApiProperty()
  totalFiles: number;

  @ApiProperty()
  totalQuotes: number;

  @ApiProperty()
  activeMaterials: number;
}

export class OrderStatsDto {
  @ApiProperty()
  status: string;

  @ApiProperty()
  count: number;
}

export class RevenueByDayDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  orderCount: number;
}
