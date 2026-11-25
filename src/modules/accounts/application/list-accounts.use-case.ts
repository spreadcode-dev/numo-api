import type { AccountRepository } from '../domain/account-repository.js';
import { type AccountView, toAccountView } from './account-view.js';

// Portuguese, ignoring case and accents: "Itaú" sorts next to "itau", "Nubank" after "inter".
const byName = new Intl.Collator('pt-BR', { sensitivity: 'base' });

export type ListAccountsQuery = {
  userId: string;
  includeArchived: boolean;
};

export class ListAccountsUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  // Archived accounts are hidden unless asked for; they still exist for history.
  async execute(query: ListAccountsQuery): Promise<AccountView[]> {
    const accounts = await this.accountRepository.listByUser(query.userId);
    return accounts
      .filter((account) => query.includeArchived || !account.archivedAt)
      .map(toAccountView)
      .sort((left, right) => byName.compare(left.name, right.name));
  }
}
