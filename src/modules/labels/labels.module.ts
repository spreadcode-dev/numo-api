import { Module } from '@nestjs/common';
import { CreateLabelUseCase } from './application/create-label.use-case.js';
import { DeleteLabelUseCase } from './application/delete-label.use-case.js';
import { ListLabelsUseCase } from './application/list-labels.use-case.js';
import { UpdateLabelUseCase } from './application/update-label.use-case.js';
import {
  LABEL_REPOSITORY,
  type LabelRepository,
} from './domain/label-repository.js';
import { PgLabelRepository } from './infrastructure/pg-label-repository.js';
import { LabelsController } from './presentation/labels.controller.js';

@Module({
  controllers: [LabelsController],
  providers: [
    { provide: LABEL_REPOSITORY, useClass: PgLabelRepository },
    {
      provide: CreateLabelUseCase,
      inject: [LABEL_REPOSITORY],
      useFactory: (labelRepository: LabelRepository) =>
        new CreateLabelUseCase(labelRepository),
    },
    {
      provide: ListLabelsUseCase,
      inject: [LABEL_REPOSITORY],
      useFactory: (labelRepository: LabelRepository) =>
        new ListLabelsUseCase(labelRepository),
    },
    {
      provide: UpdateLabelUseCase,
      inject: [LABEL_REPOSITORY],
      useFactory: (labelRepository: LabelRepository) =>
        new UpdateLabelUseCase(labelRepository),
    },
    {
      provide: DeleteLabelUseCase,
      inject: [LABEL_REPOSITORY],
      useFactory: (labelRepository: LabelRepository) =>
        new DeleteLabelUseCase(labelRepository),
    },
  ],
})
export class LabelsModule {}
