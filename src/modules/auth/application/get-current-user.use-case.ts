import { UserNotFoundError } from '../domain/auth.errors.js';
import type { UserRepository } from '../domain/user-repository.js';

export type CurrentUser = {
  id: string;
  email: string;
};

export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string): Promise<CurrentUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return {
      id: user.id,
      email: user.email.value,
    };
  }
}
