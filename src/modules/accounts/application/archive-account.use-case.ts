import type { AccountRepository } from '../domain/account-repository.js';
import { type AccountView, toAccountView } from './account-view.js';
import {
  type AccountReference,
  findOwnedAccount,
} from './find-owned-account.js';

export class ArchiveAccountUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  // Idempotent: archiving again keeps the date of the first archive.
  async execute(reference: AccountReference): Promise<AccountView> {
    const account = await findOwnedAccount(this.accountRepository, reference);
    if (account.archivedAt) {
      return toAccountView(account);
    }
    const archived = await this.accountRepository.archive(
      reference.userId,
      reference.accountId,
    );
    return toAccountView(archived);
  }
}
