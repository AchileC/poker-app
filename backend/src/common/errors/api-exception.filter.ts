import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { Socket } from 'socket.io';
import { toApiError } from './app.exception';

/** Filtre global REST : toutes les erreurs HTTP suivent le format { code, message, details }. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const { status, body } = toApiError(exception);
    if (status >= 500) {
      this.logger.error(exception);
    }
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }
}

/**
 * Filtre WebSocket : émet l'erreur au client sur l'événement `exception`,
 * au même format que le REST. À poser sur chaque gateway avec @UseFilters.
 */
@Catch()
export class WsApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(WsApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const { status, body } = toApiError(exception);
    if (status >= 500) {
      this.logger.error(exception);
    }
    host.switchToWs().getClient<Socket>().emit('exception', body);
  }
}
