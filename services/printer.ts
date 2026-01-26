import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Sale } from '../types';

export const PrinterService = {
    async shareReceipt(sale: Sale) {
        const html = this.generateReceiptHTML(sale);
        try {
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error('Error generating/sharing receipt:', error);
            throw error;
        }
    },

    generateReceiptHTML(sale: Sale) {
        const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        const date = new Date(sale.timestamp).toLocaleDateString('pt-BR');
        const time = new Date(sale.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const itemsHtml = sale.items.map(item => `
            <tr>
                <td style="padding: 4px 0;">
                    <div style="font-weight: bold;">${item.productName}</div>
                    <div style="font-size: 10px;">${item.quantity} x ${currency.format(item.unitPrice)}</div>
                </td>
                <td style="text-align: right; vertical-align: top; padding: 4px 0;">
                    ${currency.format(item.total)}
                </td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; margin: 0; padding: 20px; background: #fff; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                    .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
                    .info { font-size: 10px; margin-bottom: 2px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    .totals { border-top: 1px dashed #000; padding-top: 10px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 5px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">RECIBO DE VENDA</div>
                    <div class="info">Data: ${date} - ${time}</div>
                    <div class="info">Cliente: ${sale.clientName || 'Cliente Avulso'}</div>
                    ${sale.isDelivery ? `<div class="info">Entrega: ${sale.deliveryAddress}</div>` : ''}
                </div>

                <table>
                    ${itemsHtml}
                </table>

                <div class="totals">
                    <div class="row">
                        <span>Subtotal</span>
                        <span>${currency.format(sale.subtotal)}</span>
                    </div>
                    ${sale.discountOrAdjustment !== 0 ? `
                    <div class="row">
                        <span>Desconto/Ajuste</span>
                        <span>${currency.format(sale.discountOrAdjustment)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row">
                        <span>TOTAL</span>
                        <span>${currency.format(sale.finalTotal)}</span>
                    </div>
                    <div class="row" style="margin-top: 10px; font-size: 11px;">
                        <span>Forma Pagto:</span>
                        <span>${sale.paymentMethod === 'CREDIT_CARD' ? 'Cartão Crédito' :
                sale.paymentMethod === 'DEBIT_CARD' ? 'Cartão Débito' :
                    sale.paymentMethod === 'PIX' ? 'PIX' :
                        sale.type === 'CREDIT' ? 'A Prazo (Fiado)' : 'Dinheiro'}</span>
                    </div>
                     ${sale.type === 'CREDIT' ? `
                    <div class="row" style="font-size: 11px;">
                        <span>Saldo Devedor desta Venda:</span>
                        <span>${currency.format(sale.remainingBalance)}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="footer">
                    <p>Obrigado pela preferência!</p>
                </div>
            </body>
            </html>
        `;
    }
};
