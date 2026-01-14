import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartItem } from './entities/cart.entity';
import { QuotesService } from '../quotes/quotes.service';
import { AddToCartDto, UpdateCartItemDto, CartResponseDto, CartItemResponseDto } from './dto/cart.dto';
import { QuoteStatus } from '../quotes/entities/quote.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly quotesService: QuotesService,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId, items: [] });
      await this.cartRepository.save(cart);
    }

    return cart;
  }

  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    return this.mapToResponse(cart);
  }

  async addItem(userId: string, dto: AddToCartDto): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    
    // Get and validate quote
    const quote = await this.quotesService.getQuoteEntityById(dto.quoteId);
    
    if (quote.userId !== userId) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== QuoteStatus.ACTIVE) {
      throw new BadRequestException('Quote is not active or has expired');
    }

    if (new Date() > quote.expiresAt) {
      throw new BadRequestException('Quote has expired');
    }

    // Check if quote already in cart
    const existingItem = cart.items.find((item) => item.quoteId === dto.quoteId);
    
    if (existingItem) {
      // Update quantity
      existingItem.quantity += dto.quantity || 1;
      existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
      if (dto.notes) {
        existingItem.notes = dto.notes;
      }
      await this.cartItemRepository.save(existingItem);
    } else {
      // Add new item
      const quantity = dto.quantity || 1;
      const unitPrice = quote.pricing.total;
      
      const cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        quoteId: dto.quoteId,
        unitPrice,
        quantity,
        totalPrice: unitPrice * quantity,
        notes: dto.notes,
      });
      
      await this.cartItemRepository.save(cartItem);
    }

    // Refresh cart
    return this.getCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (dto.quantity !== undefined) {
      item.quantity = dto.quantity;
      item.totalPrice = item.unitPrice * item.quantity;
    }
    
    if (dto.notes !== undefined) {
      item.notes = dto.notes;
    }

    await this.cartItemRepository.save(item);

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    
    const itemIndex = cart.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepository.remove(cart.items[itemIndex]);

    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    
    if (cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
    }

    cart.items = [];
    return this.mapToResponse(cart);
  }

  async getCartEntity(userId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    return cart;
  }

  private async mapToResponse(cart: Cart): Promise<CartResponseDto> {
    const items: CartItemResponseDto[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      // Get quote details
      let quoteDetails;
      try {
        const quote = await this.quotesService.getQuoteEntityById(item.quoteId);
        quoteDetails = {
          reference: quote.reference,
          fileId: quote.fileId,
          materialId: quote.materialId,
          configuration: quote.configuration,
        };
      } catch {
        // Quote might have been deleted
        quoteDetails = undefined;
      }

      items.push({
        id: item.id,
        quoteId: item.quoteId,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        notes: item.notes,
        quote: quoteDetails,
      });

      subtotal += item.totalPrice;
    }

    return {
      id: cart.id,
      items,
      itemCount: items.length,
      subtotal: Math.round(subtotal * 100) / 100,
      currency: 'AED',
    };
  }
}
