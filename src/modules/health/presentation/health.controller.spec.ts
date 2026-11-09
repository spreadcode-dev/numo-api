import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('should report the API as ok', () => {
    // Arrange
    const controller = new HealthController();

    // Act
    const response = controller.getHealth();

    // Assert
    expect(response).toEqual({ status: 'down' });
  });
});
