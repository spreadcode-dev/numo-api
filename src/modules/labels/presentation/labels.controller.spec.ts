import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { CreateLabelUseCase } from '../application/create-label.use-case.js';
import type { DeleteLabelUseCase } from '../application/delete-label.use-case.js';
import type { ListLabelsUseCase } from '../application/list-labels.use-case.js';
import type { UpdateLabelUseCase } from '../application/update-label.use-case.js';
import {
  InvalidLabelColorError,
  LabelNameAlreadyUsedError,
  LabelNotFoundError,
} from '../domain/labels.errors.js';
import { LabelsController } from './labels.controller.js';

const USER = { id: '6f1c1a9e-0000-4000-8000-000000000001' };

const LABEL = {
  id: '7b3c4d5e-0000-4000-8000-000000000001',
  name: 'Groceries',
  color: '#15803d',
};

const REFERENCE = { userId: USER.id, labelId: LABEL.id };

type UseCaseFakes = {
  createLabel?: CreateLabelUseCase['execute'];
  listLabels?: ListLabelsUseCase['execute'];
  updateLabel?: UpdateLabelUseCase['execute'];
  deleteLabel?: DeleteLabelUseCase['execute'];
};

const controllerWith = (fakes: UseCaseFakes) =>
  new LabelsController(
    { execute: fakes.createLabel ?? vi.fn() } as CreateLabelUseCase,
    { execute: fakes.listLabels ?? vi.fn() } as ListLabelsUseCase,
    { execute: fakes.updateLabel ?? vi.fn() } as UpdateLabelUseCase,
    { execute: fakes.deleteLabel ?? vi.fn() } as DeleteLabelUseCase,
  );

describe('LabelsController', () => {
  it('should create the label for the user in the token', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(LABEL);
    const controller = controllerWith({ createLabel: execute });

    // Act
    const response = await controller.create(USER, {
      name: 'Groceries',
      color: '#15803d',
    });

    // Assert
    expect(response).toEqual(LABEL);
    expect(execute).toHaveBeenCalledWith({
      userId: USER.id,
      name: 'Groceries',
      color: '#15803d',
    });
  });

  it('should answer 409 when the name is already used', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new LabelNameAlreadyUsedError());
    const controller = controllerWith({ createLabel: execute });

    // Act
    const create = controller.create(USER, { name: 'x', color: '#15803d' });

    // Assert
    await expect(create).rejects.toBeInstanceOf(ConflictException);
  });

  it("should list the token user's labels", async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue([LABEL]);
    const controller = controllerWith({ listLabels: execute });

    // Act
    const response = await controller.list(USER);

    // Assert
    expect(response).toEqual([LABEL]);
    expect(execute).toHaveBeenCalledWith(USER.id);
  });

  it("should edit the token user's label with the fields sent", async () => {
    // Arrange
    const recolored = { ...LABEL, color: '#f97316' };
    const execute = vi.fn().mockResolvedValue(recolored);
    const controller = controllerWith({ updateLabel: execute });

    // Act
    const response = await controller.update(USER, LABEL.id, {
      color: '#f97316',
    });

    // Assert
    expect(response).toEqual(recolored);
    expect(execute).toHaveBeenCalledWith({
      ...REFERENCE,
      name: undefined,
      color: '#f97316',
    });
  });

  it('should answer 400 when editing to a color outside the palette', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new InvalidLabelColorError());
    const controller = controllerWith({ updateLabel: execute });

    // Act
    const update = controller.update(USER, LABEL.id, { color: '#3b82f6' });

    // Assert
    await expect(update).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should delete the token user's label", async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(undefined);
    const controller = controllerWith({ deleteLabel: execute });

    // Act
    await controller.delete(USER, LABEL.id);

    // Assert
    expect(execute).toHaveBeenCalledWith(REFERENCE);
  });

  it('should answer 404 when deleting a label the user does not own', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new LabelNotFoundError());
    const controller = controllerWith({ deleteLabel: execute });

    // Act
    const remove = controller.delete(USER, LABEL.id);

    // Assert
    await expect(remove).rejects.toBeInstanceOf(NotFoundException);
  });
});
