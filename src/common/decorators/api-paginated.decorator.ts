import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, getSchemaPath } from '@nestjs/swagger';

export interface PaginatedResponseDto<T> {
  items: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export const ApiPaginatedResponse = <TModel extends Type>(model: TModel) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                properties: {
                  items: {
                    type: 'array',
                    items: { $ref: getSchemaPath(model) },
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      totalItems: { type: 'number' },
                      itemCount: { type: 'number' },
                      itemsPerPage: { type: 'number' },
                      totalPages: { type: 'number' },
                      currentPage: { type: 'number' },
                    },
                  },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        ],
      },
    }),
    ApiQuery({ name: 'page', required: false, type: Number }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
  );
};
