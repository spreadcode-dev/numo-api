import type { AccountRepository } from '../domain/account-repository.js';
import { type AccountView, toAccountView } from './account-view.js';

// Portuguese, ignoring case and accents: "Itaú" sorts next to "itau", "Nubank" after "inter".
const byName = new Intl.Collator('pt-BR', { sensitivity: 'base' });

export class ListAccountsUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(userId: string): Promise<AccountView[]> {
    const accounts = await this.accountRepository.listByUser(userId);
    return accounts
      .map(toAccountView)
      .sort((left, right) => byName.compare(left.name, right.name));
  }
}
