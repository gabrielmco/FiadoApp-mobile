import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductController {
    async getAll(req: Request, res: Response) {
        try {
            const products = await prisma.product.findMany();
            res.json(products);
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar produtos" });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const data = req.body;
            const product = await prisma.product.create({
                data: {
                    name: data.name,
                    category: data.category,
                    animalType: data.animalType,
                    price: parseFloat(data.price),
                    cost: data.cost ? parseFloat(data.cost) : undefined,
                    unit: data.unit,
                    stock: data.stock ? parseFloat(data.stock) : 0,
                    trackStock: data.trackStock || false
                }
            });
            res.status(201).json(product);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Erro ao criar produto" });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const data = req.body;
            const product = await prisma.product.update({
                where: { id },
                data: {
                    name: data.name,
                    category: data.category,
                    animalType: data.animalType,
                    price: parseFloat(data.price),
                    cost: data.cost ? parseFloat(data.cost) : undefined,
                    unit: data.unit,
                    stock: data.stock ? parseFloat(data.stock) : undefined,
                    trackStock: data.trackStock
                }
            });
            res.json(product);
        } catch (error) {
            res.status(500).json({ error: "Erro ao atualizar produto" });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await prisma.product.delete({ where: { id } });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Erro ao deletar produto" });
        }
    }
}
