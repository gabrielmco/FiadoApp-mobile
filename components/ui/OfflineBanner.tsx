import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { FadeIn } from './FadeIn';

export const OfflineBanner = () => {
    const [isConnected, setIsConnected] = useState<boolean | null>(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
        });
        return () => unsubscribe();
    }, []);

    if (isConnected !== false) return null;

    return (
        <FadeIn>
            <View style={styles.container}>
                <WifiOff size={16} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.text}>Você está offline. Mostrando dados salvos.</Text>
            </View>
        </FadeIn>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.text.primary, // Dark bg
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        width: Dimensions.get('window').width,
    },
    text: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: 'bold',
    }
});
