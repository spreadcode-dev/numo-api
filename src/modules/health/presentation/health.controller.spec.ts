import { ServiceUnavailableException } from '@nestjs/common';
import type { DatabaseHealthIndicator } from '../application/database-health-indicator.js';
import { HealthController } from './health.controller.js';

class FakeDatabaseHealthIndicator implements DatabaseHealthIndicator {
  constructor(private readonly isUpValue: boolean) {}

  async isUp(): Promise<boolean> {
    return Promise.resolve(this.isUpValue);
  }
}

describe('HealthController', () => {
  it('should report the API as ok', () => {
    // Arrange
    const controller = new HealthController(
      new FakeDatabaseHealthIndicator(true),
    );

    // Act
    const response = controller.getHealth();

    // Assert
    expect(response).toEqual({ status: 'ok' });
  });

  it('should report the database as up when it answers', async () => {
    // Arrange
    const controller = new HealthController(
      new FakeDatabaseHealthIndicator(true),
    );

    // Act
    const response = await controller.getDatabaseHealth();

    // Assert
    expect(response).toEqual({ status: 'ok', database: 'up' });
  });

  it('should answer 503 with the database down when it does not answer', async () => {
    // Arrange
    const controller = new HealthController(
      new FakeDatabaseHealthIndicator(false),
    );

    // Act
    const error = await controller.getDatabaseHealth().catch((err) => err);

    // Assert
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    const exception = error as ServiceUnavailableException;
    expect(exception.getStatus()).toBe(503);
    expect(exception.getResponse()).toEqual({
      status: 'error',
      database: 'down',
    });
  });
});
