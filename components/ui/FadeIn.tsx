import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeInProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    style?: ViewStyle;
}

export const FadeIn = ({ children, delay = 0, duration = 600, style }: FadeInProps) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: duration,
                delay: delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: duration,
                delay: delay,
                useNativeDriver: true,
            })
        ]).start();
    }, [delay, duration]);

    return (
        <Animated.View
            style={[
                {
                    opacity: fadeAnim,
                    transform: [{ translateY }]
                },
                style
            ]}
        >
            {children}
        </Animated.View>
    );
};
