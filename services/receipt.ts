import { Linking, Share, Alert } from 'react-native';
import { Sale } from '../types';

export const ReceiptService = {
    async shareReceipt(sale: Sale) {
        const date = new Date(sale.timestamp).toLocaleDateString('pt-BR');
        const itemsList = sale.items.map(i => `• ${i.quantity}x ${i.productName} (R$ ${i.total.toFixed(2).replace('.', ',')})`).join('\n');

        const message = `🧾 *RECIBO DE COMPRA*
📅 *Data:* ${date}
👤 *Cliente:* ${sale.clientName || 'Cliente Avulso'}

📦 *ITENS:*
${itemsList}

💰 *TOTAL: R$ ${sale.finalTotal.toFixed(2).replace('.', ',')}*

Obrigado pela preferência!`;

        const encodedMessage = encodeURIComponent(message);
        const url = `whatsapp://send?text=${encodedMessage}`;

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                // Fallback
                Share.share({ message: message });
            }
        } catch (e) {
            Share.share({ message: message });
        }
    },

    async sharePaymentReceipt(payment: any) {
        // Payment can be PaymentRecord & { clientName: string }
        const date = new Date(payment.timestamp).toLocaleDateString('pt-BR');
        const amount = payment.amount;
        const clientName = payment.clientName || 'Cliente';

        const message = `🧾 *COMPROVANTE DE PAGAMENTO*
📅 *Data:* ${date}
👤 *Cliente:* ${clientName}

💰 *VALOR PAGO: R$ ${amount.toFixed(2).replace('.', ',')}*

Obrigado!`;

        const encodedMessage = encodeURIComponent(message);
        const url = `whatsapp://send?text=${encodedMessage}`;

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Share.share({ message: message });
            }
        } catch (e) {
            Share.share({ message: message });
        }
    }
};
