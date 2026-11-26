import type { LabelRepository } from '../domain/label-repository.js';
import type { Label } from '../domain/label.js';
import { LabelNotFoundError } from '../domain/labels.errors.js';

export type LabelReference = {
  userId: string;
  labelId: string;
};

// Another user's label and an unknown id fail the same way, so a 404 never
// confirms that someone else's label exists.
export const findOwnedLabel = async (
  labelRepository: LabelRepository,
  reference: LabelReference,
): Promise<Label> => {
  const label = await labelRepository.findById(
    reference.userId,
    reference.labelId,
  );
  if (!label) {
    throw new LabelNotFoundError();
  }
  return label;
};
