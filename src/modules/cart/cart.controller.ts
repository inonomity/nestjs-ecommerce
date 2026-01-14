import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto, CartResponseDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current cart' })
  @ApiResponse({ status: 200, description: 'Cart details', type: CartResponseDto })
  async getCart(@CurrentUser() user: User): Promise<CartResponseDto> {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added', type: CartResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid quote' })
  async addItem(
    @CurrentUser() user: User,
    @Body() dto: AddToCartDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addItem(user.id, dto);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update cart item' })
  @ApiResponse({ status: 200, description: 'Item updated', type: CartResponseDto })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async updateItem(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.updateItem(user.id, id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed', type: CartResponseDto })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async removeItem(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CartResponseDto> {
    return this.cartService.removeItem(user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared', type: CartResponseDto })
  async clearCart(@CurrentUser() user: User): Promise<CartResponseDto> {
    return this.cartService.clearCart(user.id);
  }
}
