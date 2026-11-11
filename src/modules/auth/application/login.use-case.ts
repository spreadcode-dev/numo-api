import type { AccessToken, AccessTokenIssuer } from '../domain/access-token.js';
import { InvalidCredentialsError } from '../domain/auth.errors.js';
import { Email } from '../domain/email.js';
import type { PasswordHasher } from '../domain/password-hasher.js';
import type { User } from '../domain/user.js';
import type { UserRepository } from '../domain/user-repository.js';

export type LoginCommand = {
  email: string;
  password: string;
};

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokenIssuer: AccessTokenIssuer,
  ) {}

  async execute(command: LoginCommand): Promise<AccessToken> {
    const user = await this.authenticate(command);
    return this.accessTokenIssuer.issue(user.id);
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
