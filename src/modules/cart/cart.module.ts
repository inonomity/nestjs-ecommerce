import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart, CartItem } from './entities/cart.entity';
import { QuotesModule } from '../quotes/quotes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem]),
    QuotesModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
