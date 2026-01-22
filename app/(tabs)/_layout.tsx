import { Tabs } from 'expo-router';
import { House, Users, Package, BarChart3, Wallet } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#203A43',
                tabBarInactiveTintColor: '#9CA3AF',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Vendas',
                    tabBarIcon: ({ color }) => <House size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="clients"
                options={{
                    title: 'Clientes',
                    tabBarIcon: ({ color }) => <Users size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="products"
                options={{
                    title: 'Produtos',
                    tabBarIcon: ({ color }) => <Package size={24} color={color} />,
                }}
            />

            <Tabs.Screen
                name="analysis"
                options={{
                    title: 'Análise',
                    tabBarIcon: ({ color }) => <BarChart3 size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
