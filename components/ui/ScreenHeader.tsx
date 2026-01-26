import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ViewStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';

interface ScreenHeaderProps {
    title: string;
    showBackButton?: boolean;
    rightAction?: React.ReactNode;
    style?: ViewStyle;
    onBack?: () => void;
}

export const ScreenHeader = ({
    title,
    showBackButton = true,
    rightAction,
    style,
    onBack
}: ScreenHeaderProps) => {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <View style={[styles.header, style]}>
            <View style={styles.leftContainer}>
                {showBackButton ? (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ArrowLeft size={24} color={Colors.text.primary} />
                    </TouchableOpacity>
                ) : (
                    // Spacer to keep title centered if needed, or just remove
                    <View style={styles.spacer} />
                )}
            </View>

            <Text style={styles.title} numberOfLines={1}>{title}</Text>

            <View style={styles.rightContainer}>
                {rightAction ? rightAction : <View style={styles.spacer} />}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingTop: Platform.OS === 'android' ? 40 : 12, // Handle StatusBar
    },
    leftContainer: {
        width: 40,
        alignItems: 'flex-start',
    },
    rightContainer: {
        width: 40,
        alignItems: 'flex-end',
    },
    title: {
        flex: 1,
        fontSize: 18, // Slightly smaller to prevent truncation on small screens
        fontWeight: 'bold',
        color: Colors.text.primary,
        textAlign: 'center',
    },
    backButton: {
        padding: 4,
        marginLeft: -8,
    },
    spacer: {
        width: 24,
    }
});
