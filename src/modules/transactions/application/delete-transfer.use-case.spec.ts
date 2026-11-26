import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import { TransferNotFoundError } from '../domain/transactions.errors.js';
import { DeleteTransferUseCase } from './delete-transfer.use-case.js';
import { InMemoryTransactionRepository } from './testing/transaction-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const leg = (accountId: string, amount: number) => ({
  userId: ANA,
  accountId,
  date: TransactionDate.create('2026-11-20'),
  amount,
  description: TransactionDescription.create('Card bill'),
});

const setUp = async () => {
  const transactionRepository = new InMemoryTransactionRepository();
  const market = await transactionRepository.create(
    leg('account-checking', -4590),
  );
  const { transferId } = await transactionRepository.createTransfer({
    outgoing: leg('account-checking', -50000),
    incoming: leg('account-card', 50000),
  });
  return {
    transactionRepository,
    market,
    transferId,
    deleteTransfer: new DeleteTransferUseCase(transactionRepository),
  };
};

describe('DeleteTransferUseCase', () => {
  it('should remove both legs and nothing else', async () => {
    // Arrange
    const { transactionRepository, market, transferId, deleteTransfer } =
      await setUp();

    // Act
    await deleteTransfer.execute({ userId: ANA, transferId });

    // Assert
    expect(transactionRepository.transactions).toEqual([market]);
  });

  it("should not delete another user's transfer", async () => {
    // Arrange
    const { transactionRepository, transferId, deleteTransfer } = await setUp();

    // Act
    const remove = deleteTransfer.execute({ userId: BRUNO, transferId });

    // Assert
    await expect(remove).rejects.toThrow(TransferNotFoundError);
    expect(transactionRepository.transactions).toHaveLength(3);
  });

  it('should reject an unknown transfer', async () => {
    // Arrange
    const { deleteTransfer } = await setUp();

    // Act
    const remove = deleteTransfer.execute({
      userId: ANA,
      transferId: 'transfer-unknown',
    });

    // Assert
    await expect(remove).rejects.toThrow(TransferNotFoundError);
  });
});
