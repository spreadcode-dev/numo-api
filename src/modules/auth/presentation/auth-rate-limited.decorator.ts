import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

const RETRY_AFTER_HEADER = {
  'Retry-After': {
    description: 'Seconds to wait before trying again',
    schema: { type: 'integer' },
  },
};

// A per-route guard instead of a global one: only login and registration are
// brute-force targets, every other route must stay unlimited.
export const AuthRateLimited = () =>
  applyDecorators(
    UseGuards(ThrottlerGuard),
    ApiTooManyRequestsResponse({
      description:
        'Too many attempts from this IP. Retry after Retry-After seconds.',
      headers: RETRY_AFTER_HEADER,
    }),
  );
