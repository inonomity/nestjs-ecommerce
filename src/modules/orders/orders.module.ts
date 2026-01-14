import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderItem, OrderStatusHistory, Tracking } from './entities/order.entity';
import { CartModule } from '../cart/cart.module';
import { QuotesModule } from '../quotes/quotes.module';
import { FilesModule } from '../files/files.module';
import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory, Tracking]),
    CartModule,
    QuotesModule,
    FilesModule,
    MaterialsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
