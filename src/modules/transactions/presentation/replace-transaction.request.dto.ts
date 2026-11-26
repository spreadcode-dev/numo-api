import { RecordTransactionRequestDto } from './record-transaction.request.dto.js';

// A replacement sends the full transaction, checked exactly like a new one.
export class ReplaceTransactionRequestDto extends RecordTransactionRequestDto {}
