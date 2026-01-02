import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class PaymentController {
    async getAll(req: Request, res: Response) {
        try {
            const payments = await prisma.paymentRecord.findMany({
                orderBy: { timestamp: 'desc' }
            });
            res.json(payments);
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar pagamentos" });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { clientId, amount } = req.body;

            const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                // 1. Get Client
                const client = await tx.client.findUnique({ where: { id: clientId } });
                if (!client) throw new Error("Cliente não encontrado");

                // 2. Register Payment
                const payment = await tx.paymentRecord.create({
                    data: {
                        clientId,
                        amount,
                        usedCredit: false,
                        timestamp: new Date()
                    }
                });

                // 3. FIFO Logic - Get unpaid sales ordered by date
                const unpaidSales = await tx.sale.findMany({
                    where: {
                        clientId,
                        status: { not: 'PAID' }
                    },
                    orderBy: { timestamp: 'asc' }
                });

                let remainingPayment = amount;

                // 4. Distribute payment across sales
                for (const sale of unpaidSales) {
                    if (remainingPayment <= 0) break;

                    const debt = sale.remainingBalance;
                    const amountToPay = Math.min(debt, remainingPayment);

                    const newBalance = sale.remainingBalance - amountToPay;
                    const newStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIAL';

                    await tx.sale.update({
                        where: { id: sale.id },
                        data: {
                            remainingBalance: newStatus === 'PAID' ? 0 : newBalance,
                            status: newStatus
                        }
                    });

                    remainingPayment -= amountToPay;
                }

                // 5. Handle Surplus (Credit)
                let newCredit = client.credit;
                if (remainingPayment > 0) {
                    newCredit += remainingPayment;
                }

                // 6. Recalculate Total Debt (Source of Truth is the sum of remaining balances)
                const totalDebtAgg = await tx.sale.aggregate({
                    where: { clientId },
                    _sum: { remainingBalance: true }
                });
                const totalDebt = totalDebtAgg._sum.remainingBalance || 0;

                await tx.client.update({
                    where: { id: clientId },
                    data: {
                        credit: newCredit,
                        totalDebt: totalDebt,
                        lastInteraction: new Date()
                    }
                });

                return payment;
            });

            res.status(201).json(result);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: error.message || "Erro ao processar pagamento" });
        }
    }
}
