import { ConfigService } from '@nestjs/config';
import { createDatabasePool } from './create-database-pool.js';

const APP_DATABASE_ENV = {
  DB_HOST: 'db.local',
  DB_PORT: '6543',
  DB_NAME: 'numo_db',
  DB_APP_USER: 'numo_app_user',
  DB_APP_PASSWORD: 'app-secret',
};

describe('createDatabasePool', () => {
  it('should connect as the app user with the configured host, port and database', async () => {
    // Arrange
    const config = new ConfigService(APP_DATABASE_ENV);

    // Act
    const pool = createDatabasePool(config);

    // Assert
    expect(pool.options).toMatchObject({
      host: 'db.local',
      port: 6543,
      database: 'numo_db',
      user: 'numo_app_user',
      password: 'app-secret',
    });
  });

  it('should fail when a required variable is missing', () => {
    // Arrange
    const { DB_APP_PASSWORD: _omitted, ...incompleteEnv } = APP_DATABASE_ENV;
    const config = new ConfigService(incompleteEnv);

    // Act
    const create = () => createDatabasePool(config);

    // Assert
    expect(create).toThrow('DB_APP_PASSWORD');
  });
});
