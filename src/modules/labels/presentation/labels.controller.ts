import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@shared/auth/authenticated-request.js';
import { CurrentUser } from '@shared/auth/current-user.decorator.js';
import { CreateLabelUseCase } from '../application/create-label.use-case.js';
import { DeleteLabelUseCase } from '../application/delete-label.use-case.js';
import { ListLabelsUseCase } from '../application/list-labels.use-case.js';
import { UpdateLabelUseCase } from '../application/update-label.use-case.js';
import { CreateLabelRequestDto } from './create-label.request.dto.js';
import { LabelResponseDto } from './label.response.dto.js';
import { toHttpError } from './labels-error.mapper.js';
import { UpdateLabelRequestDto } from './update-label.request.dto.js';

// A malformed id can't match any label, so it gets the same 404 as an
// unknown one instead of reaching Postgres as an invalid uuid (a 500).
const LABEL_ID_PIPE = new ParseUUIDPipe({
  errorHttpStatusCode: HttpStatus.NOT_FOUND,
});

const NAME_ALREADY_USED =
  'The user already has a label with this name (any casing)';
const LABEL_NOT_FOUND =
  'No label with this id belongs to the user in the token';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token',
})
@Controller('labels')
export class LabelsController {
  constructor(
    @Inject(CreateLabelUseCase)
    private readonly createLabelUseCase: CreateLabelUseCase,
    @Inject(ListLabelsUseCase)
    private readonly listLabelsUseCase: ListLabelsUseCase,
    @Inject(UpdateLabelUseCase)
    private readonly updateLabelUseCase: UpdateLabelUseCase,
    @Inject(DeleteLabelUseCase)
    private readonly deleteLabelUseCase: DeleteLabelUseCase,
  ) {}

  @ApiCreatedResponse({ type: LabelResponseDto })
  @ApiBadRequestResponse({
    description:
      'Name outside 1-30 characters, color outside the palette, or unexpected fields',
  })
  @ApiConflictResponse({ description: NAME_ALREADY_USED })
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateLabelRequestDto,
  ): Promise<LabelResponseDto> {
    try {
      const label = await this.createLabelUseCase.execute({
        userId: user.id,
        name: body.name,
        color: body.color,
      });
      return label;
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiOkResponse({
    type: [LabelResponseDto],
    description: 'Sorted by name, ignoring case and accents',
  })
  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<LabelResponseDto[]> {
    return this.listLabelsUseCase.execute(user.id);
  }

  @ApiOkResponse({ type: LabelResponseDto })
  @ApiBadRequestResponse({
    description: 'Same rules as create, a null field, or unexpected fields',
  })
  @ApiNotFoundResponse({ description: LABEL_NOT_FOUND })
  @ApiConflictResponse({ description: NAME_ALREADY_USED })
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', LABEL_ID_PIPE) labelId: string,
    @Body() body: UpdateLabelRequestDto,
  ): Promise<LabelResponseDto> {
    try {
      const label = await this.updateLabelUseCase.execute({
        userId: user.id,
        labelId,
        name: body.name,
        color: body.color,
      });
      return label;
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiNoContentResponse({ description: 'Label deleted' })
  @ApiNotFoundResponse({ description: LABEL_NOT_FOUND })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', LABEL_ID_PIPE) labelId: string,
  ): Promise<void> {
    try {
      await this.deleteLabelUseCase.execute({ userId: user.id, labelId });
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
