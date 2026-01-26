import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    withDelay,
    runOnJS,
    Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export const AnimatedSplash = ({ onFinish }: { onFinish: () => void }) => {
    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(1);
    const logoOpacity = useSharedValue(0);

    useEffect(() => {
        // Fade in logo quickly
        logoOpacity.value = withTiming(1, { duration: 300 });

        // Subtle scale animation
        scale.value = withSequence(
            withSpring(1, { damping: 15, stiffness: 150 }),
            withDelay(400, withTiming(1.05, { duration: 200, easing: Easing.ease })),
            withTiming(1, { duration: 150 })
        );

        // Fade out entire splash after 1.2 seconds total
        opacity.value = withDelay(
            1000,
            withTiming(0, { duration: 300 }, (finished?: boolean) => {
                if (finished) {
                    runOnJS(onFinish)();
                }
            })
        );
    }, []);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: logoOpacity.value,
    }));

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            <LinearGradient
                colors={['#0f2027', '#203a43', '#2c5364']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <Animated.View style={[styles.logoContainer, logoStyle]}>
                <Image
                    source={require('../../assets/images/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 140,
        height: 140,
        borderRadius: 28,
    }
});
