import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Quote, QuoteStatus, PricingBreakdown, PrintConfiguration } from './entities/quote.entity';
import { FilesService } from '../files/files.service';
import { MaterialsService } from '../materials/materials.service';
import { CreateQuoteDto, QuoteResponseDto } from './dto/quote.dto';
import { generateQuoteReference } from '../../common/utils/order-number.util';
import { FileStatus } from '../files/entities/file.entity';

// Pricing constants
const LABOR_RATE_PER_HOUR = 15; // AED per hour
const BASE_PRINT_SPEED = 30; // cm³ per hour (rough estimate)
const POST_PROCESSING_COSTS: Record<string, number> = {
  'sanding': 20,
  'painting': 35,
  'polishing': 25,
  'assembly': 50,
  'heat-treatment': 40,
};

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    private readonly filesService: FilesService,
    private readonly materialsService: MaterialsService,
  ) {}

  async createQuote(userId: string, dto: CreateQuoteDto): Promise<QuoteResponseDto> {
    // Get file and validate
    const file = await this.filesService.getFileEntityById(dto.fileId);
    
    if (file.userId !== userId) {
      throw new NotFoundException('File not found');
    }
    
    if (file.status !== FileStatus.READY) {
      throw new BadRequestException('File is not ready for quoting');
    }

    // Check for analysis errors (but allow missing analysis with defaults)
    if (file.analysis?.hasErrors) {
      throw new BadRequestException('File analysis has errors: ' + (file.analysis.errors?.join(', ') || 'Unknown error'));
    }

    // Use default volume if analysis is not available
    const fileVolume = file.analysis?.volume || 100; // Default 100 cm³

    // Get material
    const material = await this.materialsService.findById(dto.materialId);

    // Validate color
    if (!material.properties.colorOptions.includes(dto.color)) {
      throw new BadRequestException(
        `Color "${dto.color}" is not available for this material. Available: ${material.properties.colorOptions.join(', ')}`,
      );
    }

    // Calculate pricing
    const configuration: PrintConfiguration = {
      quantity: dto.quantity,
      color: dto.color,
      infillPercentage: dto.infillPercentage,
      layerHeight: dto.layerHeight,
      supportStructures: dto.supportStructures,
      postProcessing: dto.postProcessing || [],
    };

    const pricing = this.calculatePricing(
      fileVolume,
      material,
      configuration,
    );

    // Calculate print time
    const estimatedPrintTimeHours = this.calculatePrintTime(
      fileVolume,
      configuration,
    );

    // Calculate delivery days
    const estimatedDeliveryDays = this.calculateDeliveryDays(
      estimatedPrintTimeHours,
      material.leadTimeDays,
      configuration,
    );

    // Create quote
    const quote = this.quoteRepository.create({
      reference: generateQuoteReference(),
      userId,
      fileId: dto.fileId,
      materialId: dto.materialId,
      configuration,
      pricing,
      estimatedPrintTimeHours,
      estimatedDeliveryDays,
      status: QuoteStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await this.quoteRepository.save(quote);

    return this.mapToResponse(quote);
  }

  async getQuoteById(quoteId: string, userId: string): Promise<QuoteResponseDto> {
    const quote = await this.quoteRepository.findOne({
      where: { id: quoteId, userId },
      relations: ['file', 'material'],
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // Check if expired
    if (quote.status === QuoteStatus.ACTIVE && new Date() > quote.expiresAt) {
      quote.status = QuoteStatus.EXPIRED;
      await this.quoteRepository.save(quote);
    }

    return this.mapToResponse(quote);
  }

  async getUserQuotes(userId: string): Promise<QuoteResponseDto[]> {
    const quotes = await this.quoteRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Update expired quotes
    const now = new Date();
    for (const quote of quotes) {
      if (quote.status === QuoteStatus.ACTIVE && now > quote.expiresAt) {
        quote.status = QuoteStatus.EXPIRED;
        await this.quoteRepository.save(quote);
      }
    }

    return quotes.map((q) => this.mapToResponse(q));
  }

  async getQuoteEntityById(quoteId: string): Promise<Quote> {
    const quote = await this.quoteRepository.findOne({
      where: { id: quoteId },
      relations: ['file', 'material'],
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async markAsOrdered(quoteId: string): Promise<void> {
    await this.quoteRepository.update(quoteId, { status: QuoteStatus.ORDERED });
  }

  private calculatePricing(
    volumeCm3: number,
    material: any,
    config: PrintConfiguration,
  ): PricingBreakdown {
    const { pricing } = material;
    const { quantity, infillPercentage, postProcessing } = config;

    // Adjust volume based on infill
    const effectiveVolume = volumeCm3 * (infillPercentage / 100) * 0.8 + volumeCm3 * 0.2;

    // Material cost per unit
    const materialCostPerUnit = effectiveVolume * pricing.basePrice;

    // Print time estimation
    const printTimePerUnit = effectiveVolume / BASE_PRINT_SPEED;
    const laborCostPerUnit = printTimePerUnit * LABOR_RATE_PER_HOUR;

    // Post-processing costs
    let postProcessingFee = 0;
    for (const process of postProcessing) {
      if (POST_PROCESSING_COSTS[process]) {
        postProcessingFee += POST_PROCESSING_COSTS[process];
      }
    }

    // Calculate totals
    const materialCost = Math.round(materialCostPerUnit * quantity * 100) / 100;
    const laborCost = Math.round(laborCostPerUnit * quantity * 100) / 100;
    const setupFee = pricing.setupFee;
    postProcessingFee = Math.round(postProcessingFee * quantity * 100) / 100;

    const subtotal = materialCost + laborCost + setupFee + postProcessingFee;

    // Volume discount
    let discount = 0;
    if (quantity >= 10) {
      discount = Math.round(subtotal * 0.1 * 100) / 100; // 10% discount
    } else if (quantity >= 5) {
      discount = Math.round(subtotal * 0.05 * 100) / 100; // 5% discount
    }

    const total = Math.max(
      Math.round((subtotal - discount) * 100) / 100,
      pricing.minPrice,
    );

    return {
      materialCost,
      laborCost,
      setupFee,
      postProcessingFee,
      subtotal: Math.round(subtotal * 100) / 100,
      discount,
      total,
      currency: pricing.currency || 'AED',
    };
  }

  private calculatePrintTime(
    volumeCm3: number,
    config: PrintConfiguration,
  ): number {
    // Rough estimate: depends on volume, layer height, infill
    const baseTime = volumeCm3 / BASE_PRINT_SPEED;
    
    // Adjust for layer height (thinner = longer)
    const layerFactor = 0.2 / config.layerHeight;
    
    // Adjust for infill
    const infillFactor = config.infillPercentage / 20;
    
    // Add time for supports
    const supportFactor = config.supportStructures ? 1.3 : 1;
    
    const totalHours = baseTime * layerFactor * infillFactor * supportFactor * config.quantity;
    
    return Math.round(totalHours * 10) / 10;
  }

  private calculateDeliveryDays(
    printTimeHours: number,
    materialLeadTime: number,
    config: PrintConfiguration,
  ): number {
    // Print days (8 working hours per day)
    const printDays = Math.ceil(printTimeHours / 8);
    
    // Post-processing days
    const postProcessDays = config.postProcessing.length > 0 ? 1 : 0;
    
    // Shipping (standard)
    const shippingDays = 2;
    
    return materialLeadTime + printDays + postProcessDays + shippingDays;
  }

  private mapToResponse(quote: Quote): QuoteResponseDto {
    return {
      id: quote.id,
      reference: quote.reference,
      fileId: quote.fileId,
      materialId: quote.materialId,
      configuration: quote.configuration,
      pricing: quote.pricing,
      estimatedPrintTimeHours: quote.estimatedPrintTimeHours,
      estimatedDeliveryDays: quote.estimatedDeliveryDays,
      status: quote.status,
      expiresAt: quote.expiresAt,
      createdAt: quote.createdAt,
    };
  }
}
