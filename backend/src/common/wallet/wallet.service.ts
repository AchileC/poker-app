import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GameType, TransactionRecord, TransactionResult } from './wallet.types';

/**
 * Contrat Backend (Section 4.1 du Cahier des Charges)
 * Point de convergence unique pour le solde de jetons des joueurs.
 * Aucun jeu ne doit modifier directement la table users : tous passent par WalletService.
 *
 * Au Jour 1, un store mémoire bouchonné (1 000 jetons par défaut) est pré-configuré
 * pour permettre aux 4 développeurs de travailler en parallèle immédiatement,
 * avant que le Dev 2 ne branche la persistance PostgreSQL avec verrouillage pessimiste.
 */
@Injectable()
export class WalletService {
  private readonly balances = new Map<string, number>([['demo-player-1', 1000]]);
  private readonly transactions: TransactionRecord[] = [];

  getBalance(userId: string): number {
    if (!this.balances.has(userId)) {
      this.balances.set(userId, 1000);
    }
    return this.balances.get(userId)!;
  }

  debit(
    userId: string,
    amount: number,
    gameType: GameType,
    referenceId: string,
  ): TransactionResult {
    if (amount <= 0 || !Number.isFinite(amount)) {
      throw new BadRequestException('Le montant du débit doit être strictement positif.');
    }

    const currentBalance = this.getBalance(userId);
    if (currentBalance < amount) {
      throw new BadRequestException(
        `Solde insuffisant (${currentBalance} jetons disponibles, ${amount} requis).`,
      );
    }

    const newBalance = currentBalance - amount;
    this.balances.set(userId, newBalance);

    const transaction: TransactionRecord = {
      id: randomUUID(),
      userId,
      amount,
      type: 'DEBIT',
      gameType,
      referenceId,
      balanceAfter: newBalance,
      createdAt: new Date(),
    };
    this.transactions.push(transaction);

    return {
      success: true,
      newBalance,
      transaction,
    };
  }

  credit(
    userId: string,
    amount: number,
    gameType: GameType,
    referenceId: string,
  ): TransactionResult {
    if (amount <= 0 || !Number.isFinite(amount)) {
      throw new BadRequestException('Le montant du crédit doit être strictement positif.');
    }

    const currentBalance = this.getBalance(userId);
    const newBalance = currentBalance + amount;
    this.balances.set(userId, newBalance);

    const transaction: TransactionRecord = {
      id: randomUUID(),
      userId,
      amount,
      type: 'CREDIT',
      gameType,
      referenceId,
      balanceAfter: newBalance,
      createdAt: new Date(),
    };
    this.transactions.push(transaction);

    return {
      success: true,
      newBalance,
      transaction,
    };
  }

  getHistory(userId: string): TransactionRecord[] {
    if (!userId) {
      throw new NotFoundException('Identifiant joueur manquant.');
    }
    return this.transactions.filter((tx) => tx.userId === userId);
  }
}
