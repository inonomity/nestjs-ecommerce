import {
  Controller,
  Get,
  Post,
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
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, QuoteResponseDto } from './dto/quote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('quotes')
@Controller('quotes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quote' })
  @ApiResponse({ status: 201, description: 'Quote created', type: QuoteResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiResponse({ status: 404, description: 'File or material not found' })
  async createQuote(
    @CurrentUser() user: User,
    @Body() dto: CreateQuoteDto,
  ): Promise<QuoteResponseDto> {
    return this.quotesService.createQuote(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user quotes' })
  @ApiResponse({ status: 200, description: 'List of quotes', type: [QuoteResponseDto] })
  async getUserQuotes(@CurrentUser() user: User): Promise<QuoteResponseDto[]> {
    return this.quotesService.getUserQuotes(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quote by ID' })
  @ApiResponse({ status: 200, description: 'Quote details', type: QuoteResponseDto })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async getQuote(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuoteResponseDto> {
    return this.quotesService.getQuoteById(id, user.id);
  }
}
