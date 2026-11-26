import { InvalidYearMonthError } from '../domain/reports.errors.js';
import { GetSpendingByLabelUseCase } from './get-spending-by-label.use-case.js';
import {
  InMemorySpendingByLabelReport,
  type LabelledTransaction,
} from './testing/spending-by-label-report.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const HOUSING = { id: 'housing', name: 'Housing', color: '#2563eb' };
const FOOD = { id: 'food', name: 'Food', color: '#15803d' };
const TRIP = { id: 'trip', name: 'Trip', color: '#f97316' };

const RENT: LabelledTransaction = {
  userId: ANA,
  date: '2026-11-05',
  amount: -200000,
  labels: [HOUSING],
};
const MARKET: LabelledTransaction = {
  userId: ANA,
  date: '2026-11-12',
  amount: -30000,
  labels: [FOOD, TRIP],
};
const PARKING: LabelledTransaction = {
  userId: ANA,
  date: '2026-11-30',
  amount: -5000,
  labels: [],
};

const NOVEMBER = { userId: ANA, month: '2026-11' };

const setUp = () => {
  const report = new InMemorySpendingByLabelReport();
  return { report, getSpending: new GetSpendingByLabelUseCase(report) };
};

describe('GetSpendingByLabelUseCase', () => {
  it('should give each label the full amount it tags, with unlabeled expenses apart', async () => {
    // Arrange
    const { report, getSpending } = setUp();
    report.givenTransactions(RENT, MARKET, PARKING);

    // Act
    const spending = await getSpending.execute(NOVEMBER);

    // Assert
    expect(spending).toEqual({
      month: '2026-11',
      total: 235000,
      labels: [
        {
          labelId: 'housing',
          name: 'Housing',
          color: '#2563eb',
          amount: 200000,
        },
        { labelId: 'food', name: 'Food', color: '#15803d', amount: 30000 },
        { labelId: 'trip', name: 'Trip', color: '#f97316', amount: 30000 },
        { name: 'Unlabeled', amount: 5000 },
      ],
    });
  });

  it('should leave income and transfers out', async () => {
    // Arrange
    const { report, getSpending } = setUp();
    report.givenTransactions(
      { ...RENT, amount: 500000 },
      { ...MARKET, transferId: 'card-bill' },
    );

    // Act
    const spending = await getSpending.execute(NOVEMBER);

    // Assert
    expect(spending).toEqual({ month: '2026-11', total: 0, labels: [] });
  });

  it('should only count expenses dated in the month', async () => {
    // Arrange
    const { report, getSpending } = setUp();
    report.givenTransactions({ ...RENT, date: '2026-12-01' });

    // Act
    const spending = await getSpending.execute(NOVEMBER);

    // Assert
    expect(spending.total).toBe(0);
  });

  it("should only count the caller's expenses", async () => {
    // Arrange
    const { report, getSpending } = setUp();
    report.givenTransactions({ ...RENT, userId: BRUNO });

    // Act
    const spending = await getSpending.execute(NOVEMBER);

    // Assert
    expect(spending.labels).toEqual([]);
  });

  it('should have no Unlabeled entry when every expense has a label', async () => {
    // Arrange
    const { report, getSpending } = setUp();
    report.givenTransactions(RENT);

    // Act
    const spending = await getSpending.execute(NOVEMBER);

    // Assert
    expect(spending.labels.map((entry) => entry.name)).toEqual(['Housing']);
  });

  it('should order labels with the same amount by name', async () => {
    // Arrange
    const { report, getSpending } = setUp();
    report.givenTransactions({ ...MARKET, labels: [TRIP, FOOD] });

    // Act
    const spending = await getSpending.execute(NOVEMBER);

    // Assert
    expect(spending.labels.map((entry) => entry.name)).toEqual([
      'Food',
      'Trip',
    ]);
  });

  it('should reject a month that does not exist', async () => {
    // Arrange
    const { getSpending } = setUp();

    // Act
    const execute = getSpending.execute({ userId: ANA, month: '2026-13' });

    // Assert
    await expect(execute).rejects.toBeInstanceOf(InvalidYearMonthError);
  });
});
