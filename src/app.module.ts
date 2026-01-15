import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FilesModule } from './modules/files/files.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database - PostgreSQL for production, SQLite for local development
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const databaseUrl = configService.get<string>('DATABASE_URL');
        
        // Use PostgreSQL if DATABASE_URL is provided (production)
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true, // Auto-create tables
            ssl: isProduction ? { rejectUnauthorized: false } : false,
            logging: !isProduction,
          };
        }
        
        // Use SQLite for local development
        return {
          type: 'sqlite',
          database: configService.get<string>('DB_NAME') || 'data/cloudprint.db',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
          logging: true,
        };
      },
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ([{
        ttl: configService.get<number>('THROTTLE_TTL') || 60000,
        limit: configService.get<number>('THROTTLE_LIMIT') || 100,
      }]),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    FilesModule,
    MaterialsModule,
    QuotesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    AdminModule,
  ],
})
export class AppModule {}
