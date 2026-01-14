import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material, MaterialCategory } from './entities/material.entity';
import { CreateMaterialDto, UpdateMaterialDto } from './dto';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
  ) {}

  async findAll(activeOnly: boolean = true): Promise<Material[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.materialRepository.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findByCategory(category: MaterialCategory): Promise<Material[]> {
    return this.materialRepository.find({
      where: { category, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Material> {
    const material = await this.materialRepository.findOne({ where: { id } });
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    return material;
  }

  async findBySlug(slug: string): Promise<Material> {
    const material = await this.materialRepository.findOne({
      where: { slug, isActive: true },
    });
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    return material;
  }

  async create(dto: CreateMaterialDto): Promise<Material> {
    // Check for duplicate slug
    const existing = await this.materialRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Material with this slug already exists');
    }

    const material = this.materialRepository.create({
      ...dto,
      pricing: {
        ...dto.pricing,
        currency: dto.pricing.currency || 'AED',
      },
    });

    return this.materialRepository.save(material);
  }

  async update(id: string, dto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findById(id);

    // Check for duplicate slug if being changed
    if (dto.slug && dto.slug !== material.slug) {
      const existing = await this.materialRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('Material with this slug already exists');
      }
    }

    Object.assign(material, dto);
    return this.materialRepository.save(material);
  }

  async delete(id: string): Promise<void> {
    const material = await this.findById(id);
    await this.materialRepository.remove(material);
  }

  async toggleActive(id: string): Promise<Material> {
    const material = await this.findById(id);
    material.isActive = !material.isActive;
    return this.materialRepository.save(material);
  }

  /**
   * Calculate price for a given volume
   */
  calculatePrice(material: Material, volumeCm3: number): number {
    const { basePrice, setupFee, minPrice } = material.pricing;
    const materialCost = volumeCm3 * basePrice;
    const totalCost = materialCost + setupFee;
    return Math.max(totalCost, minPrice);
  }

  /**
   * Seed default materials (for development)
   */
  async seedDefaultMaterials(): Promise<void> {
    const count = await this.materialRepository.count();
    if (count > 0) return;

    const defaultMaterials: Partial<Material>[] = [
      {
        name: 'PLA',
        slug: 'pla',
        description: 'Polylactic Acid - Biodegradable thermoplastic, great for prototypes and general use.',
        category: MaterialCategory.PLASTIC,
        properties: {
          density: 1.24,
          tensileStrength: 37,
          flexuralStrength: 83,
          heatResistance: 52,
          colorOptions: ['White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Gray'],
        },
        pricing: {
          basePrice: 0.5,
          setupFee: 10,
          minPrice: 25,
          currency: 'AED',
        },
        applications: ['Prototypes', 'Display Models', 'Low-stress Parts'],
        leadTimeDays: 3,
        sortOrder: 1,
      },
      {
        name: 'ABS',
        slug: 'abs',
        description: 'Acrylonitrile Butadiene Styrene - Durable and impact-resistant, ideal for functional parts.',
        category: MaterialCategory.PLASTIC,
        properties: {
          density: 1.04,
          tensileStrength: 43,
          flexuralStrength: 76,
          heatResistance: 98,
          colorOptions: ['White', 'Black', 'Red', 'Blue', 'Natural'],
        },
        pricing: {
          basePrice: 0.6,
          setupFee: 10,
          minPrice: 30,
          currency: 'AED',
        },
        applications: ['Functional Prototypes', 'End-use Parts', 'Housings'],
        leadTimeDays: 3,
        sortOrder: 2,
      },
      {
        name: 'PETG',
        slug: 'petg',
        description: 'Polyethylene Terephthalate Glycol - Strong, flexible, and chemical resistant.',
        category: MaterialCategory.PLASTIC,
        properties: {
          density: 1.27,
          tensileStrength: 50,
          flexuralStrength: 77,
          heatResistance: 70,
          colorOptions: ['Clear', 'White', 'Black', 'Blue'],
        },
        pricing: {
          basePrice: 0.7,
          setupFee: 10,
          minPrice: 35,
          currency: 'AED',
        },
        applications: ['Food Containers', 'Mechanical Parts', 'Outdoor Use'],
        leadTimeDays: 3,
        sortOrder: 3,
      },
      {
        name: 'Standard Resin',
        slug: 'standard-resin',
        description: 'High-detail SLA resin for precise models and smooth surface finish.',
        category: MaterialCategory.RESIN,
        properties: {
          density: 1.1,
          tensileStrength: 65,
          flexuralStrength: 115,
          heatResistance: 58,
          colorOptions: ['White', 'Black', 'Gray', 'Clear'],
        },
        pricing: {
          basePrice: 1.2,
          setupFee: 15,
          minPrice: 40,
          currency: 'AED',
        },
        applications: ['Jewelry', 'Miniatures', 'Detailed Prototypes'],
        leadTimeDays: 4,
        sortOrder: 4,
      },
      {
        name: 'Nylon PA12',
        slug: 'nylon-pa12',
        description: 'Engineering-grade nylon with excellent mechanical properties and durability.',
        category: MaterialCategory.PLASTIC,
        properties: {
          density: 1.01,
          tensileStrength: 48,
          flexuralStrength: 58,
          heatResistance: 172,
          colorOptions: ['Natural', 'Black', 'White'],
        },
        pricing: {
          basePrice: 1.5,
          setupFee: 20,
          minPrice: 50,
          currency: 'AED',
        },
        applications: ['Functional Parts', 'Hinges', 'Snap Fits', 'Gears'],
        leadTimeDays: 5,
        sortOrder: 5,
      },
    ];

    for (const materialData of defaultMaterials) {
      const material = this.materialRepository.create(materialData);
      await this.materialRepository.save(material);
    }
  }
}
