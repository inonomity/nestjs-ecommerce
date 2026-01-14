import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto, UpdateMaterialDto } from './dto';
import { Material, MaterialCategory } from './entities/material.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('materials')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all materials' })
  @ApiQuery({ name: 'category', required: false, enum: MaterialCategory })
  @ApiResponse({ status: 200, description: 'List of materials' })
  async findAll(
    @Query('category') category?: MaterialCategory,
  ): Promise<Material[]> {
    if (category) {
      return this.materialsService.findByCategory(category);
    }
    return this.materialsService.findAll();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get material by slug' })
  @ApiResponse({ status: 200, description: 'Material details' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async findBySlug(@Param('slug') slug: string): Promise<Material> {
    // Try to find by slug first, then by ID
    try {
      return await this.materialsService.findBySlug(slug);
    } catch {
      return await this.materialsService.findById(slug);
    }
  }

  // Admin endpoints
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create material (Admin)' })
  @ApiResponse({ status: 201, description: 'Material created' })
  @ApiResponse({ status: 409, description: 'Material slug already exists' })
  async create(@Body() dto: CreateMaterialDto): Promise<Material> {
    return this.materialsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update material (Admin)' })
  @ApiResponse({ status: 200, description: 'Material updated' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialDto,
  ): Promise<Material> {
    return this.materialsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete material (Admin)' })
  @ApiResponse({ status: 200, description: 'Material deleted' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.materialsService.delete(id);
    return { message: 'Material deleted successfully' };
  }

  @Put(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle material active status (Admin)' })
  @ApiResponse({ status: 200, description: 'Material status toggled' })
  async toggleActive(@Param('id', ParseUUIDPipe) id: string): Promise<Material> {
    return this.materialsService.toggleActive(id);
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default materials (Admin)' })
  @ApiResponse({ status: 201, description: 'Materials seeded' })
  async seed(): Promise<{ message: string }> {
    await this.materialsService.seedDefaultMaterials();
    return { message: 'Default materials seeded successfully' };
  }
}
