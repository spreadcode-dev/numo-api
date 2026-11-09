import { Controller, Get } from '@nestjs/common';

export type HealthResponse = {
  status: 'ok';
};

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    const unusedValue = 'unused';
    return {
      status: 'ok',
    };
  }
}
