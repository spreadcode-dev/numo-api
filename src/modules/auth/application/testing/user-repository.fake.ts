import type { Email } from '../../domain/email.js';
import type { NewUser, UserRepository } from '../../domain/user-repository.js';
import type { User } from '../../domain/user.js';

export class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = [];

  existsByEmail(email: Email): Promise<boolean> {
    return Promise.resolve(
      this.users.some((user) => user.email.value === email.value),
    );
  }

  findByEmail(email: Email): Promise<User | undefined> {
    const user = this.users.find((user) => user.email.value === email.value);
    return Promise.resolve(user);
  }

  findById(id: string): Promise<User | undefined> {
    const user = this.users.find((user) => user.id === id);
    return Promise.resolve(user);
  }

  create(newUser: NewUser): Promise<User> {
    const now = new Date();
    const user: User = {
      id: `user-${this.users.length + 1}`,
      ...newUser,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(user);
    return Promise.resolve(user);
  }
}
