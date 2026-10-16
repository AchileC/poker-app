import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Format d'erreur API commun (Section 4.5 du Cahier des Charges).
 * Toutes les erreurs REST et WebSocket sont renvoyées sous la forme { code, message, details }.
 */
export type CommonErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'INSUFFICIENT_FUNDS'
  | 'NOT_YOUR_TURN'
  | 'INVALID_ACTION'
  | 'GAME_NOT_FOUND'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export type ErrorCode =
  CommonErrorCode | `POKER_${string}` | `BLACKJACK_${string}` | `ROULETTE_${string}`;

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details: Record<string, unknown>;
}

export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    readonly details: Record<string, unknown> = {},
  ) {
    super({ code, message, details } satisfies ApiErrorBody, status);
  }
}

export class InsufficientFundsException extends AppException {
  constructor(available: number, required: number) {
    super(
      'INSUFFICIENT_FUNDS',
      `Solde insuffisant (${available} jetons disponibles, ${required} requis).`,
      HttpStatus.BAD_REQUEST,
      { available, required },
    );
  }
}

const CODE_BY_STATUS: Partial<Record<number, CommonErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'UNAUTHORIZED',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
};

/** Convertit n'importe quelle exception en { status, body } au format commun. */
export function toApiError(exception: unknown): { status: number; body: ApiErrorBody } {
  if (exception instanceof AppException) {
    return {
      status: exception.getStatus(),
      body: { code: exception.code, message: exception.message, details: exception.details },
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    // ValidationPipe renvoie { message: string[] } : on expose la liste dans details.errors
    const rawMessage =
      typeof response === 'object' && response !== null && 'message' in response
        ? (response as { message: unknown }).message
        : exception.message;
    const errors = Array.isArray(rawMessage) ? rawMessage : undefined;

    return {
      status,
      body: {
        code: CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR',
        message: errors ? errors.join(', ') : String(rawMessage),
        details: errors ? { errors } : {},
      },
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur.', details: {} },
  };
}
