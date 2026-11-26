import type { TransferRepository } from '../domain/transfer-repository.js';
import { TransferNotFoundError } from '../domain/transactions.errors.js';

export type TransferReference = {
  userId: string;
  transferId: string;
};

export class DeleteTransferUseCase {
  constructor(private readonly transferRepository: TransferRepository) {}

  // Another user's transfer and an unknown id fail the same way, so a 404
  // never confirms that someone else's transfer exists.
  async execute(reference: TransferReference): Promise<void> {
    const legs = await this.transferRepository.findTransferLegs(
      reference.userId,
      reference.transferId,
    );
    if (legs.length === 0) {
      throw new TransferNotFoundError();
    }
    await this.transferRepository.deleteTransfer(
      reference.userId,
      reference.transferId,
    );
  }
}
