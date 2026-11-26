import {
  InvalidTransactionLabelsError,
  TransactionLabelNotFoundError,
  TransactionNotFoundError,
} from '../domain/transactions.errors.js';
import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import { SetTransactionLabelsUseCase } from './set-transaction-labels.use-case.js';
import { InMemoryLabelLookup } from './testing/label-lookup.fake.js';
import { InMemoryTransactionRepository } from './testing/transaction-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const TRIP = { id: 'label-trip', userId: ANA, name: 'Trip', color: '#2563eb' };
const GROCERIES = {
  id: 'label-groceries',
  userId: ANA,
  name: 'Groceries',
  color: '#15803d',
};
const BRUNO_LABEL = {
  id: 'label-bruno',
  userId: BRUNO,
  name: 'Work',
  color: '#7c3aed',
};

const withoutOwner = ({ id, name, color }: typeof TRIP) => ({
  id,
  name,
  color,
});

const ownLabels = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `label-${index}`,
    userId: ANA,
    name: `Label ${index}`,
    color: '#2563eb',
  }));

const setUp = async () => {
  const labelLookup = new InMemoryLabelLookup();
  labelLookup.labels.push(TRIP, GROCERIES, BRUNO_LABEL, ...ownLabels(11));
  const transactionRepository = new InMemoryTransactionRepository(labelLookup);
  const transaction = await transactionRepository.create({
    userId: ANA,
    accountId: 'account-ana',
    date: TransactionDate.create('2026-11-20'),
    amount: -4590,
    description: TransactionDescription.create('Market'),
  });
  return {
    transactionRepository,
    reference: { userId: ANA, transactionId: transaction.id },
    setLabels: new SetTransactionLabelsUseCase(
      transactionRepository,
      labelLookup,
      transactionRepository,
    ),
  };
};

describe('SetTransactionLabelsUseCase', () => {
  it('should tag the transaction and return its labels sorted by name', async () => {
    // Arrange
    const { reference, setLabels } = await setUp();

    // Act
    const labels = await setLabels.execute({
      ...reference,
      labelIds: [TRIP.id, GROCERIES.id],
    });

    // Assert
    expect(labels).toEqual([withoutOwner(GROCERIES), withoutOwner(TRIP)]);
  });

  it('should replace the whole set', async () => {
    // Arrange
    const { transactionRepository, reference, setLabels } = await setUp();
    await setLabels.execute({ ...reference, labelIds: [TRIP.id] });

    // Act
    await setLabels.execute({ ...reference, labelIds: [GROCERIES.id] });

    // Assert
    const stored = await transactionRepository.labelsOf([
      reference.transactionId,
    ]);
    expect(stored.get(reference.transactionId)).toEqual([
      withoutOwner(GROCERIES),
    ]);
  });

  it('should remove every label when the set is empty', async () => {
    // Arrange
    const { transactionRepository, reference, setLabels } = await setUp();
    await setLabels.execute({ ...reference, labelIds: [TRIP.id] });

    // Act
    const labels = await setLabels.execute({ ...reference, labelIds: [] });

    // Assert
    expect(labels).toEqual([]);
    expect(transactionRepository.links).toEqual([]);
  });

  it('should give the same result when the same set is sent twice', async () => {
    // Arrange
    const { transactionRepository, reference, setLabels } = await setUp();
    const command = { ...reference, labelIds: [TRIP.id, GROCERIES.id] };
    const first = await setLabels.execute(command);

    // Act
    const second = await setLabels.execute(command);

    // Assert
    expect(second).toEqual(first);
    expect(transactionRepository.links).toHaveLength(2);
  });

  it('should accept 10 labels', async () => {
    // Arrange
    const { reference, setLabels } = await setUp();
    const tenIds = ownLabels(10).map((label) => label.id);

    // Act
    const labels = await setLabels.execute({ ...reference, labelIds: tenIds });

    // Assert
    expect(labels).toHaveLength(10);
  });

  it('should reject 11 labels', async () => {
    // Arrange
    const { transactionRepository, reference, setLabels } = await setUp();
    const elevenIds = ownLabels(11).map((label) => label.id);

    // Act
    const set = setLabels.execute({ ...reference, labelIds: elevenIds });

    // Assert
    await expect(set).rejects.toThrow(InvalidTransactionLabelsError);
    expect(transactionRepository.links).toEqual([]);
  });

  it('should reject the same label twice', async () => {
    // Arrange
    const { reference, setLabels } = await setUp();

    // Act
    const set = setLabels.execute({
      ...reference,
      labelIds: [TRIP.id, TRIP.id],
    });

    // Assert
    await expect(set).rejects.toThrow(InvalidTransactionLabelsError);
  });

  it("should not tag another user's transaction", async () => {
    // Arrange
    const { reference, setLabels } = await setUp();

    // Act
    const set = setLabels.execute({
      ...reference,
      userId: BRUNO,
      labelIds: [BRUNO_LABEL.id],
    });

    // Assert
    await expect(set).rejects.toThrow(TransactionNotFoundError);
  });

  it("should not tag with another user's label", async () => {
    // Arrange
    const { transactionRepository, reference, setLabels } = await setUp();

    // Act
    const set = setLabels.execute({
      ...reference,
      labelIds: [TRIP.id, BRUNO_LABEL.id],
    });

    // Assert
    await expect(set).rejects.toThrow(TransactionLabelNotFoundError);
    expect(transactionRepository.links).toEqual([]);
  });

  it('should reject an unknown label', async () => {
    // Arrange
    const { reference, setLabels } = await setUp();

    // Act
    const set = setLabels.execute({
      ...reference,
      labelIds: ['label-unknown'],
    });

    // Assert
    await expect(set).rejects.toThrow(TransactionLabelNotFoundError);
  });
});
