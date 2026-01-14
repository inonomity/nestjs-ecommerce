import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { PaginatedResponseDto } from '../decorators/api-paginated.decorator';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export async function paginate<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  options: PaginationOptions,
): Promise<PaginatedResponseDto<T>> {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 10;

  const skip = (page - 1) * limit;

  const [items, totalItems] = await queryBuilder
    .skip(skip)
    .take(limit)
    .getManyAndCount();

  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    meta: {
      totalItems,
      itemCount: items.length,
      itemsPerPage: limit,
      totalPages,
      currentPage: page,
    },
  };
}
