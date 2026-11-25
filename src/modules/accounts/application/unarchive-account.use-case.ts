import type { AccountRepository } from '../domain/account-repository.js';
import { type AccountView, toAccountView } from './account-view.js';
import {
  type AccountReference,
  findOwnedAccount,
} from './find-owned-account.js';

export class UnarchiveAccountUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  // Idempotent: unarchiving an active account changes nothing.
  async execute(reference: AccountReference): Promise<AccountView> {
    const account = await findOwnedAccount(this.accountRepository, reference);
    if (!account.archivedAt) {
      return toAccountView(account);
    }
    const unarchived = await this.accountRepository.unarchive(
      reference.userId,
      reference.accountId,
    );
    return toAccountView(unarchived);
  }
}
