import { AccountName } from '../domain/account-name.js';
import type { AccountRepository } from '../domain/account-repository.js';
import { toAccountType } from '../domain/account-type.js';
import type { Account } from '../domain/account.js';
import { AccountNameAlreadyUsedError } from '../domain/accounts.errors.js';
import { toCents } from '../domain/money.js';
import { type AccountView, toAccountView } from './account-view.js';
import {
  type AccountReference,
  findOwnedAccount,
} from './find-owned-account.js';

// Currency is deliberately absent: one currency per user in this phase.
export type UpdateAccountCommand = AccountReference & {
  name?: string;
  type?: string;
  openingBalance?: number;
};

// Only the fields sent are validated, with the same rules as create.
const applyChanges = (
  account: Account,
  command: UpdateAccountCommand,
): Account => ({
  ...account,
  name:
    command.name === undefined
      ? account.name
      : AccountName.create(command.name),
  type: command.type === undefined ? account.type : toAccountType(command.type),
  openingBalance:
    command.openingBalance === undefined
      ? account.openingBalance
      : toCents(command.openingBalance),
});

export class UpdateAccountUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(command: UpdateAccountCommand): Promise<AccountView> {
    const account = await findOwnedAccount(this.accountRepository, command);
    const edited = applyChanges(account, command);
    await this.ensureNameIsFree(account, edited.name);

    const saved = await this.accountRepository.update(edited);
    return toAccountView(saved);
  }

  private async ensureNameIsFree(
    account: Account,
    newName: AccountName,
  ): Promise<void> {
    if (account.name.matches(newName)) {
      return;
    }
    const exists = await this.accountRepository.existsByName(
      account.userId,
      newName,
    );
    if (exists) {
      throw new AccountNameAlreadyUsedError();
    }
  }
}
