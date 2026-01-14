import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { Material } from './entities/material.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material])],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule implements OnModuleInit {
  constructor(private readonly materialsService: MaterialsService) {}

  async onModuleInit() {
    // Seed default materials on startup (dev mode only)
    await this.materialsService.seedDefaultMaterials();
  }
}
