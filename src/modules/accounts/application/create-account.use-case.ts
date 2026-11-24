import { AccountName } from '../domain/account-name.js';
import type { AccountRepository } from '../domain/account-repository.js';
import { toAccountType } from '../domain/account-type.js';
import { AccountNameAlreadyUsedError } from '../domain/accounts.errors.js';
import { DEFAULT_CURRENCY, toCurrency } from '../domain/currency.js';
import { toCents } from '../domain/money.js';
import { type AccountView, toAccountView } from './account-view.js';

export type CreateAccountCommand = {
  userId: string;
  name: string;
  type: string;
  openingBalance: number;
  currency?: string;
};

export class CreateAccountUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(command: CreateAccountCommand): Promise<AccountView> {
    const name = AccountName.create(command.name);
    const type = toAccountType(command.type);
    const currency = toCurrency(command.currency ?? DEFAULT_CURRENCY);
    const openingBalance = toCents(command.openingBalance);
    await this.ensureNameIsFree(command.userId, name);

    const account = await this.accountRepository.create({
      userId: command.userId,
      name,
      type,
      currency,
      openingBalance,
    });
    return toAccountView(account);
  }

  private async ensureNameIsFree(
    userId: string,
    name: AccountName,
  ): Promise<void> {
    const exists = await this.accountRepository.existsByName(userId, name);
    if (exists) {
      throw new AccountNameAlreadyUsedError();
    }
  }
}
