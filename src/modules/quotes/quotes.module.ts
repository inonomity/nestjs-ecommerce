import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { Quote } from './entities/quote.entity';
import { FilesModule } from '../files/files.module';
import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote]),
    FilesModule,
    MaterialsModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
