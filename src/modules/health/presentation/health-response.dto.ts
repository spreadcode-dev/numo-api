export class HealthResponseDto {
  status: 'ok';
}

export class DatabaseHealthResponseDto {
  status: 'ok' | 'error';
  database: 'up' | 'down';
}
