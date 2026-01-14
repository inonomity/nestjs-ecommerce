import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { File } from '../files/entities/file.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Material } from '../materials/entities/material.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Setting } from './entities/setting.entity';
import { DashboardStatsDto, OrderStatsDto, RevenueByDayDto } from './dto/admin.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

// Default settings
const DEFAULT_SETTINGS = {
  // General
  storeName: 'CloudPrint Pro',
  storeUrl: 'https://cloudprint.pro',
  supportEmail: 'support@cloudprint.pro',
  timezone: 'Asia/Dubai',
  currency: 'AED',

  // Pricing
  taxRate: 5,
  taxIncluded: false,
  setupFee: 5.0,
  minimumOrderAmount: 50.0,
  volumeDiscountEnabled: true,
  volumeDiscountThreshold: 10,
  volumeDiscountPercent: 10,

  // Shipping
  freeShippingThreshold: 500,
  standardShippingRate: 25,
  expressShippingRate: 50,
  internationalShippingEnabled: false,

  // Payments
  stripeEnabled: true,
  stripeTestMode: true,
  paypalEnabled: false,

  // Email
  orderConfirmationEnabled: true,
  shippingNotificationEnabled: true,
  deliveryConfirmationEnabled: true,
  marketingEmailsEnabled: false,

  // Security
  twoFactorRequired: false,
  sessionTimeout: 60,
  maxLoginAttempts: 5,
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  // Settings methods
  async getSettings(): Promise<Record<string, any>> {
    const settings = await this.settingRepository.find();
    const result: Record<string, any> = { ...DEFAULT_SETTINGS };

    for (const setting of settings) {
      result[setting.key] = this.parseSettingValue(setting.value, setting.type);
    }

    return result;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<Record<string, any>> {
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        let setting = await this.settingRepository.findOne({ where: { key } });
        
        if (!setting) {
          setting = this.settingRepository.create({
            key,
            value: String(value),
            type: typeof value,
          });
        } else {
          setting.value = String(value);
          setting.type = typeof value;
        }
        
        await this.settingRepository.save(setting);
      }
    }

    return this.getSettings();
  }

  private parseSettingValue(value: string, type: string): any {
    switch (type) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true';
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      newUsersToday,
      totalOrders,
      ordersToday,
      pendingOrders,
      processingOrders,
      totalRevenue,
      revenueToday,
      totalFiles,
      totalQuotes,
      activeMaterials,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({
        where: { createdAt: MoreThanOrEqual(today) },
      }),
      this.orderRepository.count(),
      this.orderRepository.count({
        where: { createdAt: MoreThanOrEqual(today) },
      }),
      this.orderRepository.count({
        where: { status: OrderStatus.PENDING_PAYMENT },
      }),
      this.orderRepository.count({
        where: { status: OrderStatus.PROCESSING },
      }),
      this.calculateTotalRevenue(),
      this.calculateTodayRevenue(today),
      this.fileRepository.count(),
      this.quoteRepository.count(),
      this.materialRepository.count({ where: { isActive: true } }),
    ]);

    return {
      totalUsers,
      newUsersToday,
      totalOrders,
      ordersToday,
      pendingOrders,
      processingOrders,
      totalRevenue,
      revenueToday,
      totalFiles,
      totalQuotes,
      activeMaterials,
    };
  }

  async getOrdersByStatus(): Promise<OrderStatsDto[]> {
    const statusCounts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();

    return statusCounts.map((item) => ({
      status: item.status,
      count: parseInt(item.count, 10),
    }));
  }

  async getRevenueByDay(days: number = 30): Promise<RevenueByDayDto[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const payments = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.SUCCEEDED,
        paidAt: MoreThanOrEqual(startDate),
      },
      order: { paidAt: 'ASC' },
    });

    // Group by date
    const revenueMap = new Map<string, { revenue: number; count: number }>();

    for (const payment of payments) {
      const dateStr = payment.paidAt.toISOString().split('T')[0];
      const existing = revenueMap.get(dateStr) || { revenue: 0, count: 0 };
      existing.revenue += payment.amount;
      existing.count += 1;
      revenueMap.set(dateStr, existing);
    }

    // Fill in missing dates
    const result: RevenueByDayDto[] = [];
    const currentDate = new Date(startDate);
    const today = new Date();

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const data = revenueMap.get(dateStr) || { revenue: 0, count: 0 };
      result.push({
        date: dateStr,
        revenue: Math.round(data.revenue * 100) / 100,
        orderCount: data.count,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  async getAllUsers(page: number = 1, limit: number = 20): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const [users, total] = await this.userRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllOrders(
    page: number = 1,
    limit: number = 20,
    status?: OrderStatus,
  ): Promise<{
    orders: Order[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where = status ? { status } : {};
    
    const [orders, total] = await this.orderRepository.findAndCount({
      where,
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRecentActivity(limit: number = 10): Promise<{
    recentOrders: Order[];
    recentUsers: User[];
  }> {
    const [recentOrders, recentUsers] = await Promise.all([
      this.orderRepository.find({
        order: { createdAt: 'DESC' },
        take: limit,
        relations: ['items'],
      }),
      this.userRepository.find({
        order: { createdAt: 'DESC' },
        take: limit,
      }),
    ]);

    return { recentOrders, recentUsers };
  }

  private async calculateTotalRevenue(): Promise<number> {
    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.SUCCEEDED })
      .getRawOne();

    return Math.round((result?.total || 0) * 100) / 100;
  }

  private async calculateTodayRevenue(today: Date): Promise<number> {
    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.SUCCEEDED })
      .andWhere('payment.paidAt >= :today', { today })
      .getRawOne();

    return Math.round((result?.total || 0) * 100) / 100;
  }
}
