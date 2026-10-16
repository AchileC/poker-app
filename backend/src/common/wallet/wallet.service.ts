import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AppException, InsufficientFundsException } from '../errors/app.exception';
import { GameType, TransactionRecord, TransactionResult, TransactionType } from './wallet.types';

export const DEFAULT_BALANCE = 1000;

/**
 * Contrat Backend (Section 4.1 du Cahier des Charges)
 * Point de convergence unique pour le solde de jetons des joueurs.
 * Aucun jeu ne doit modifier directement la table users : tous passent par WalletService.
 *
 * Le contrat est asynchrone dès le Jour 1 : l'implémentation ci-dessous est un store mémoire
 * bouchonné (1 000 jetons par défaut), que le Dev 2 remplace par PostgreSQL (verrouillage
 * pessimiste + contrainte unique (referenceId, type)) sans changer les signatures.
 *
 * Règles :
 * - montants entiers strictement positifs ;
 * - `referenceId` unique par opération (clé d'idempotence) : rejouer un débit/crédit avec le même
 *   `referenceId` renvoie la transaction existante sans la rejouer.
 */
@Injectable()
export class WalletService {
  private readonly balances = new Map<string, number>();
  private readonly transactions: TransactionRecord[] = [];
  private readonly transactionsByReference = new Map<string, TransactionRecord>();

  async getBalance(userId: string): Promise<number> {
    return this.readBalance(userId);
  }

  async debit(
    userId: string,
    amount: number,
    gameType: GameType,
    referenceId: string,
  ): Promise<TransactionResult> {
    return this.apply('DEBIT', userId, amount, gameType, referenceId);
  }

  async credit(
    userId: string,
    amount: number,
    gameType: GameType,
    referenceId: string,
  ): Promise<TransactionResult> {
    return this.apply('CREDIT', userId, amount, gameType, referenceId);
  }

  async getHistory(userId: string): Promise<TransactionRecord[]> {
    return this.transactions.filter((tx) => tx.userId === userId);
  }

  // Pas d'await entre la lecture et l'écriture du solde : l'opération est atomique
  // vis-à-vis de la boucle d'événements Node.js.
  private apply(
    type: TransactionType,
    userId: string,
    amount: number,
    gameType: GameType,
    referenceId: string,
  ): TransactionResult {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppException(
        'VALIDATION_ERROR',
        'Le montant doit être un entier strictement positif.',
        HttpStatus.BAD_REQUEST,
        { amount },
      );
    }
    if (!referenceId) {
      throw new AppException('VALIDATION_ERROR', 'referenceId est obligatoire.');
    }

    const referenceKey = `${type}:${referenceId}`;
    const existing = this.transactionsByReference.get(referenceKey);
    if (existing) {
      if (
        existing.userId !== userId ||
        existing.amount !== amount ||
        existing.gameType !== gameType
      ) {
        throw new AppException(
          'CONFLICT',
          `referenceId « ${referenceId} » déjà utilisé pour une autre opération.`,
          HttpStatus.CONFLICT,
          { referenceId },
        );
      }
      return { success: true, newBalance: this.readBalance(userId), transaction: existing };
    }

    const currentBalance = this.readBalance(userId);
    if (type === 'DEBIT' && currentBalance < amount) {
      throw new InsufficientFundsException(currentBalance, amount);
    }

    const newBalance = type === 'DEBIT' ? currentBalance - amount : currentBalance + amount;
    this.balances.set(userId, newBalance);

    const transaction: TransactionRecord = {
      id: randomUUID(),
      userId,
      amount,
      type,
      gameType,
      referenceId,
      balanceAfter: newBalance,
      createdAt: new Date(),
    };
    this.transactions.push(transaction);
    this.transactionsByReference.set(referenceKey, transaction);

    return { success: true, newBalance, transaction };
  }

  private readBalance(userId: string): number {
    if (!this.balances.has(userId)) {
      this.balances.set(userId, DEFAULT_BALANCE);
    }
    return this.balances.get(userId)!;
  }
}
