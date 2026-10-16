import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Payload du JWT : l'identité du joueur ne provient QUE de là (Section 5.2). */
export interface AuthUser {
  sub: string;
  username: string;
}

/** Récupère le joueur authentifié par JwtAuthGuard dans un contrôleur REST. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
