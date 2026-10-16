import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '../errors/app.exception';
import { AuthUser } from './auth-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppException(
        'UNAUTHORIZED',
        'Token JWT manquant ou invalide.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = authHeader.slice('Bearer '.length);
    try {
      request.user = this.jwtService.verify<AuthUser>(token);
      return true;
    } catch {
      throw new AppException(
        'UNAUTHORIZED',
        'Token JWT expiré ou invalide.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
