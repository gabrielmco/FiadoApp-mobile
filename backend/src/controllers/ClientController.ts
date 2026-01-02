import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ClientController {
    async getAll(req: Request, res: Response) {
        try {
            const clients = await prisma.client.findMany();
            res.json(clients);
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar clientes" });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const data = req.body;
            const client = await prisma.client.create({
                data: {
                    name: data.name,
                    phone: data.phone,
                    credit: data.credit || 0,
                    totalDebt: data.totalDebt || 0,
                    lastInteraction: new Date()
                }
            });
            res.status(201).json(client);
        } catch (error) {
            res.status(500).json({ error: "Erro ao criar cliente" });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const data = req.body;
            const client = await prisma.client.update({
                where: { id },
                data: {
                    name: data.name,
                    phone: data.phone,
                    credit: data.credit,
                    totalDebt: data.totalDebt
                }
            });
            res.json(client);
        } catch (error) {
            res.status(500).json({ error: "Erro ao atualizar cliente" });
        }
    }
}
