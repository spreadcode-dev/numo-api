export const DATABASE_HEALTH_INDICATOR = Symbol('DATABASE_HEALTH_INDICATOR');

export interface DatabaseHealthIndicator {
  isUp(): Promise<boolean>;
}
