import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { File } from '../files/entities/file.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Material } from '../materials/entities/material.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Setting } from './entities/setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Order, File, Quote, Material, Payment, Setting]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
