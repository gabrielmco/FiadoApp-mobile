import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const NotificationService = {
    async registerForPushNotificationsAsync() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return;
            }
        } else {
            console.log('Must use physical device for Push Notifications');
        }
    },

    async notifyLowStock(productName: string, remaining: number) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "⚠️ Estoque Baixo!",
                body: `O produto "${productName}" está acabando! Restam apenas ${remaining} unidades.`,
                sound: true,
            },
            trigger: null, // Send immediately
        });
    },

    async notifyPaymentDue(clientName: string, debt: number) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "💲 Promessa de Pagamento",
                body: `Hoje é o dia de receber de ${clientName}. Valor pendente: R$ ${debt.toFixed(2).replace('.', ',')}.`,
                sound: true,
            },
            trigger: null, // Send immediately
        });
    }
};
