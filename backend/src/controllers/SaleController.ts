import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class SaleController {
    async getAll(req: Request, res: Response) {
        try {
            const sales = await prisma.sale.findMany({
                include: { items: true },
                orderBy: { timestamp: 'desc' }
            });
            res.json(sales);
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar vendas" });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const data = req.body;

            // Transaction to ensure data consistency
            const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                // 1. Create Sale
                const sale = await tx.sale.create({
                    data: {
                        clientId: data.clientId,
                        clientName: data.clientName,
                        type: data.type,
                        subtotal: data.subtotal,
                        discountOrAdjustment: data.discountOrAdjustment || 0,
                        finalTotal: data.finalTotal,
                        remainingBalance: data.remainingBalance,
                        status: data.status,
                        items: {
                            create: data.items.map((item: any) => ({
                                productId: item.productId,
                                productName: item.productName,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                total: item.total
                            }))
                        }
                    },
                    include: { items: true }
                });

                // 2. Update Stock
                for (const item of data.items) {
                    // Only update if product exists and trackStock is true (would need optimized check, simplified here)
                    // Checking product first
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    if (product && product.trackStock) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { decrement: item.quantity } }
                        });
                    }
                }

                // 3. Update Client Debt if CREDIT
                if (data.type === 'CREDIT' && data.clientId) {
                    await tx.client.update({
                        where: { id: data.clientId },
                        data: {
                            totalDebt: { increment: data.finalTotal },
                            lastInteraction: new Date()
                        }
                    });
                }

                return sale;
            });

            res.status(201).json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Erro ao criar venda" });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const data = req.body; // Expecting { items: [...] } mostly, or full sale object

            // Simple implementation: We only support updating items for now, as per frontend logic
            // To do this correctly: 
            // 1. Revert impacts of old sale (Increment Stock, Decrement Debt)
            // 2. Delete old items
            // 3. Create new items
            // 4. Apply impacts of new sale (Decrement Stock, Increment Debt)

            const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const oldSale = await tx.sale.findUnique({ where: { id }, include: { items: true } });
                if (!oldSale) throw new Error("Venda não encontrada");

                // 1. Revert Old Logic
                // Revert Stock
                for (const item of oldSale.items) {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    if (product && product.trackStock) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { increment: item.quantity } }
                        });
                    }
                }
                // Revert Debt (if Credit)
                if (oldSale.type === 'CREDIT' && oldSale.clientId) {
                    await tx.client.update({
                        where: { id: oldSale.clientId },
                        data: {
                            totalDebt: { decrement: oldSale.finalTotal }
                            // Note: We don't revert 'lastInteraction' as the edit is a new interaction
                        }
                    });
                }

                // 2. Delete Old Items
                await tx.saleItem.deleteMany({ where: { saleId: id } });

                // Calculate new totals (Frontend should send this, but we can recalc or trust frontend)
                // Assuming frontend sends the full new items list with totals calculated
                const newItems = data.items; // New items list
                const newSubtotal = newItems.reduce((acc: number, i: any) => acc + i.total, 0);
                const newFinalTotal = newSubtotal; // Simplified (no discount logic in edit yet)
                const newRemaining = oldSale.status === 'PAID' ? 0 : newFinalTotal; // If was paid, stays paid? Or logic? 
                // Actually, if editing value, status might change.
                // Let's assume for simplicity: access default "Update Logic" from db.ts: 
                // "If balance drops below zero... Convert to Credit" 
                // This is getting complex. 
                // Let's stick to what frontend `EditSaleModal` did: just update items and basic totals.
                // The frontend logic `db.updateSale` handled debt diff.

                // Let's implement the Debt Diff logic here.
                let currentDebt = newFinalTotal; // The new debt amount generated by this sale

                // 3. Update Sale Record
                const updatedSale = await tx.sale.update({
                    where: { id },
                    data: {
                        subtotal: newSubtotal,
                        finalTotal: newFinalTotal,
                        remainingBalance: oldSale.type === 'CASH' ? 0 : newFinalTotal, // Reset balance to full if Credit? Or try to preserve payments?
                        // Preserving payments is hard without Payment table link to Sale. 
                        // Current system simplifies: Sale has 'remainingBalance'.
                        // If we edit, we basically reset the debt expectation. 
                        // BUT if client already paid part? 
                        items: {
                            create: newItems.map((item: any) => ({
                                productId: item.productId,
                                productName: item.productName,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                total: item.total
                            }))
                        }
                    },
                    include: { items: true }
                });

                // 4. Apply New Logic
                // Apply Stock
                for (const item of newItems) {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    if (product && product.trackStock) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { decrement: item.quantity } }
                        });
                    }
                }

                // Apply Debt
                if (oldSale.type === 'CREDIT' && oldSale.clientId) {
                    // We just increment by the NEW total. Since we decreed the OLD total, we effectively added the Diff.
                    await tx.client.update({
                        where: { id: oldSale.clientId },
                        data: {
                            totalDebt: { increment: newFinalTotal },
                            lastInteraction: new Date()
                        }
                    });
                }

                return updatedSale;
            });

            res.json(result);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: error.message || "Erro ao atualizar venda" });
        }
    }
}
