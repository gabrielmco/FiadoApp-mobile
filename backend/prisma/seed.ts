import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INITIAL_PRODUCTS = [
    // --- PET SHOP / ALIMENTAÇÃO ---
    { name: 'HOT CAT MIX SEM CORANTES 10.1KG', price: 90.00, cost: 73.21, stock: 61, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'HOT DOG SEM CORANTES 20KG', price: 130.00, cost: 98.41, stock: 14, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'QUATREE ADULTOS CARNE 20KG', price: 120.00, cost: 85.71, stock: 50, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'QUATREE GOURMET ADULTOS RP 20KG', price: 150.00, cost: 126.55, stock: 80, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'QUATREE GOURMET FILHOTES 15KG', price: 140.00, cost: 102.51, stock: 2, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'SPECIAL DOG AD CARNE 15KG', price: 100.00, cost: 61.67, stock: 4, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'SPECIAL DOG PLUS AD CARNE 15KG', price: 110.00, cost: 89.47, stock: 5, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'SPECIAL DOG PLUS AD CARNE 20KG', price: 150.00, cost: 112.57, stock: 132, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'BIONATURAL GATOS CAST SALMAO 20KG', price: 300.00, cost: 262.90, stock: 2, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'BOOKER CAT SC 10,1KG - CARNE', price: 80.00, cost: 62.42, stock: 78, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'BOOKER DOG FILHOTE SC 25KG', price: 180.00, cost: 133.53, stock: 2, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'CAT CHOW GATOS CASTRADOS FRANGO 10,1KG', price: 180.00, cost: 129.90, stock: 1, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'SD GOLD PERF AD CARNE E FRANGO 15KG', price: 180.00, cost: 113.49, stock: 8, department: 'Pet Shop', subCategory: 'Ração Seca' },
    { name: 'ZAFIRA 15 40KG', price: 120.00, cost: 92.26, stock: 10, department: 'Pet Shop', subCategory: 'Ração Seca' },

    // --- PET SHOP / SACHÊS E PETISCOS ---
    { name: 'SACHE S CAT ULTRALIFE AD CARNE 85G', price: 80.00, cost: 26.58, stock: 10, department: 'Pet Shop', subCategory: 'Sachês' },
    { name: 'SACHE S DOG ULTRALIFE AD CARNE 100G', price: 80.00, cost: 26.57, stock: 3, department: 'Pet Shop', subCategory: 'Sachês' },
    { name: 'FRISKIES AO MOLHO CARNE 85GR', price: 68.00, cost: 29.90, stock: 14, department: 'Pet Shop', subCategory: 'Sachês' },
    { name: 'FRISKIES PETISCOS CARNE 40GR', price: 9.00, cost: 4.94, stock: 2, department: 'Pet Shop', subCategory: 'Petiscos' },
    { name: 'QUATREE SNACKS BIFINHOS CARNE 500G', price: 50.00, cost: 19.56, stock: 6, department: 'Pet Shop', subCategory: 'Petiscos' },
    { name: 'OSSO SUINO (FEMUR/UMERO)', price: 15.00, cost: 8.60, stock: 6, department: 'Pet Shop', subCategory: 'Petiscos' },
    { name: 'ORELHA BOVINA', price: 15.00, cost: 6.48, stock: 3, department: 'Pet Shop', subCategory: 'Petiscos' },
    { name: 'PE DE GALINHA (PCT 03)', price: 18.00, cost: 10.05, stock: 1, department: 'Pet Shop', subCategory: 'Petiscos' },
    { name: 'FROZEN CARNE E BACON 80GR', price: 13.00, cost: 9.28, stock: 2, department: 'Pet Shop', subCategory: 'Petiscos' },

    // --- PET SHOP / HIGIENE ---
    { name: 'KOMUNNA CLEAN SHAMPOO E COND 2X1 500ML', price: 15.00, cost: 9.40, stock: 12, department: 'Pet Shop', subCategory: 'Higiene' },
    { name: 'KOMUNNA CLEAN SHAMPOO FILHOTE 500ML', price: 15.00, cost: 10.05, stock: 3, department: 'Pet Shop', subCategory: 'Higiene' },
    { name: 'KOMUNNA CLEAN SHAMPOO NEUTRO 500ML', price: 15.00, cost: 10.05, stock: 5, department: 'Pet Shop', subCategory: 'Higiene' },

    // --- AGROPECUÁRIA / NUTRIÇÃO ---
    { name: 'BEZERRA CRESCIMENTO/NOVILHA 40 KG', price: 110.00, cost: 90.73, stock: 5, department: 'Agropecuária', subCategory: 'Nutrição Bovina' },
    { name: 'MAISPESO GRAO INTEIRO PELETIZADA 40KG', price: 160.00, cost: 132.74, stock: 2, department: 'Agropecuária', subCategory: 'Nutrição Bovina' },
    { name: 'NUTRIMAIS POEDEIRA PELETIZADA 20KG', price: 55.00, cost: 42.21, stock: 10, department: 'Agropecuária', subCategory: 'Aves' },
    { name: 'NUTRIMAIS FRANGO TRITURADA 20KG', price: 60.00, cost: 46.60, stock: 14, department: 'Agropecuária', subCategory: 'Aves' },
    { name: 'NUTRIMAIS PINTINHO TRITURADA FRD 6X5', price: 120.00, cost: 78.43, stock: 2, department: 'Agropecuária', subCategory: 'Aves' },
    { name: 'RACAO SUIMAIS 40KG', price: 110.00, cost: 88.92, stock: 5, department: 'Agropecuária', subCategory: 'Suínos' },
    { name: 'FUBA', price: 85.00, cost: 75.00, stock: 20, department: 'Agropecuária', subCategory: 'Grãos' },
    { name: 'ALPISTE 50 KG', price: 500.00, cost: 405.65, stock: 1, department: 'Agropecuária', subCategory: 'Grãos' },
    { name: 'GIRASSOL MIUDO 30 KG', price: 230.00, cost: 183.60, stock: 1, department: 'Agropecuária', subCategory: 'Grãos' },
    { name: 'MISTURA PERIQUITO E CALOPSITA 25 KG', price: 170.00, cost: 123.07, stock: 2, department: 'Agropecuária', subCategory: 'Pássaros' },

    // --- FARMÁCIA VETERINÁRIA ---
    { name: 'ALATOX 100ML', price: 22.00, cost: 14.38, stock: 1, department: 'Farmácia', subCategory: 'Defensivos' },
    { name: 'DECTOMAX INJ 250 ML', price: 190.00, cost: 144.05, stock: 3, department: 'Farmácia', subCategory: 'Medicamentos' },
    { name: 'DECTOMAX INJ 50ML', price: 45.00, cost: 27.09, stock: 25, department: 'Farmácia', subCategory: 'Medicamentos' },
    { name: 'RIPERCOL 150F 250ML', price: 78.00, cost: 51.89, stock: 25, department: 'Farmácia', subCategory: 'Medicamentos' },
    { name: 'TERRAMICINA MAIS 50ML', price: 32.00, cost: 26.18, stock: 26, department: 'Farmácia', subCategory: 'Medicamentos' },
    { name: 'TERRAMICINA PO SOLUVEL 100G', price: 38.00, cost: 25.22, stock: 8, department: 'Farmácia', subCategory: 'Medicamentos' },
    { name: 'TOP GARD PLUS 4 X 600 MG', price: 40.00, cost: 19.27, stock: 2, department: 'Farmácia', subCategory: 'Medicamentos' },
    { name: 'D-500 50ML', price: 38.00, cost: 19.55, stock: 9, department: 'Farmácia', subCategory: 'Medicamentos' },
    { name: 'K-OTHRINE SC 30ML', price: 350.00, cost: 298.75, stock: 5, department: 'Farmácia', subCategory: 'Defensivos' },

    // --- UTILIDADES / VESTUÁRIO / FERRAGENS ---
    { name: 'NOBUCK CHOCOLATE SOLADO CACTUS 38', price: 150.00, cost: 88.90, stock: 2, department: 'Utilidades', subCategory: 'Vestuário' },
    { name: 'NOBUCK MILHO BRETAO PU 40', price: 170.00, cost: 107.90, stock: 1, department: 'Utilidades', subCategory: 'Vestuário' },
    { name: 'BOTA 7LEGUAS PTA PVC 40', price: 60.00, cost: 42.00, stock: 2, department: 'Utilidades', subCategory: 'Vestuário' },
    { name: 'BOTA P.FORTE PT/AM 40', price: 150.00, cost: 97.72, stock: 2, department: 'Utilidades', subCategory: 'Vestuário' },
    { name: 'BOTINA LATEX', price: 65.00, cost: 21.90, stock: 31, department: 'Utilidades', subCategory: 'Vestuário' },
    { name: 'FERRADURA CAVALO C/ROMPAO 0', price: 60.00, cost: 37.57, stock: 3, department: 'Utilidades', subCategory: 'Ferragens' },
    { name: 'RATOEIRA PEGA RATO COLA', price: 90.00, cost: 71.49, stock: 1, department: 'Utilidades', subCategory: 'Uso Geral' }
];

async function main() {
    console.log('🌱 Starting seed...');

    // 1. Limpar banco (DISABLED TO PRESERVE DATA)
    // await prisma.saleItem.deleteMany();
    // await prisma.paymentRecord.deleteMany(); 
    // await prisma.sale.deleteMany();
    // await prisma.sale.deleteMany();
    // await prisma.product.deleteMany();
    // await prisma.client.deleteMany();
    // console.log('🧹 Database cleared');

    // 2. Criar Clientes (Only if not exist)
    const clients = ['João da Fazenda', 'Maria do Sítio', 'Carlos Leiteiro'];
    for (const name of clients) {
        const exists = await prisma.client.findFirst({ where: { name } });
        if (!exists) {
            await prisma.client.create({ data: { name } });
            console.log(`Created client: ${name}`);
        }
    }

    // 3. Criar Produtos (Check duplicates)
    for (const p of INITIAL_PRODUCTS) {
        // Check if product exists (by name)
        const existing = await prisma.product.findFirst({
            where: { name: p.name }
        });

        if (!existing) {
            await prisma.product.create({
                data: {
                    name: p.name,
                    price: p.price,
                    cost: p.cost,
                    stock: p.stock,
                    department: p.department,
                    subCategory: p.subCategory,
                    unit: 'UN', // Default unit
                    trackStock: true,
                    category: 'Outros', // Legacy field
                    animalType: 'Geral' // Legacy field
                }
            });
            console.log(`+ Added: ${p.name}`);
        } else {
            console.log(`= Skipped (exists): ${p.name}`);
        }
    }
    console.log(`✅ Seed process finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
