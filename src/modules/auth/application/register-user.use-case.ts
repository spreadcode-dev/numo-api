import { EmailAlreadyRegisteredError } from '../domain/auth.errors.js';
import { Email } from '../domain/email.js';
import type { PasswordHasher } from '../domain/password-hasher.js';
import { Password } from '../domain/password.js';
import type { UserRepository } from '../domain/user-repository.js';

export type RegisterUserCommand = {
  email: string;
  password: string;
};

export type RegisteredUser = {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisteredUser> {
    const email = Email.create(command.email);
    const password = Password.create(command.password);
    await this.ensureEmailIsNotRegistered(email);

    const passwordHash = await this.passwordHasher.hash(password);
    const user = await this.userRepository.create({ email, passwordHash });

    return {
      id: user.id,
      email: user.email.value,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async ensureEmailIsNotRegistered(email: Email): Promise<void> {
    const exists = await this.userRepository.existsByEmail(email);
    if (exists) {
      throw new EmailAlreadyRegisteredError();
    }
  }
}
