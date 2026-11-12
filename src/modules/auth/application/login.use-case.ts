import { InvalidCredentialsError } from '../domain/auth.errors.js';
import { Email } from '../domain/email.js';
import type { PasswordHasher } from '../domain/password-hasher.js';
import type { User } from '../domain/user.js';
import type { UserRepository } from '../domain/user-repository.js';
import type { Session, SessionIssuer } from './session-issuer.js';

export type LoginCommand = {
  email: string;
  password: string;
};

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(command: LoginCommand): Promise<Session> {
    const user = await this.authenticate(command);
    return this.sessionIssuer.start(user.id);
  }

  private async authenticate(command: LoginCommand): Promise<User> {
    const email = Email.create(command.email);
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      await this.passwordHasher.verifyWithoutUser(command.password);
      throw new InvalidCredentialsError();
    }

    const isPasswordCorrect = await this.passwordHasher.verify(
      command.password,
      user.passwordHash,
    );
    if (!isPasswordCorrect) {
      throw new InvalidCredentialsError();
    }

    return user;
  }
}
