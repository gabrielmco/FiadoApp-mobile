import AsyncStorage from '@react-native-async-storage/async-storage';

export const CacheService = {
    async set(key: string, data: any): Promise<void> {
        try {
            await AsyncStorage.setItem(`@cache:${key}`, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save to cache:', e);
        }
    },

    async get<T>(key: string): Promise<T | null> {
        try {
            const json = await AsyncStorage.getItem(`@cache:${key}`);
            return json ? JSON.parse(json) : null;
        } catch (e) {
            console.error('Failed to read from cache:', e);
            return null;
        }
    },

    async clear(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(`@cache:${key}`);
        } catch (e) {
            console.error('Failed to clear cache:', e);
        }
    },

    async clearAll(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(k => k.startsWith('@cache:'));
            await AsyncStorage.multiRemove(cacheKeys);
        } catch (e) {
            console.error('Failed to clear all cache:', e);
        }
    },

    /**
     * AGGRESSIVE CLEAR: Removes ALL user data from AsyncStorage.
     * Preserves only system-critical keys (Expo device tokens, etc.)
     * Use this on LOGOUT to ensure complete data isolation between accounts.
     */
    async clearAllUserData(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            // Preserve only Expo system keys and Supabase persistent tokens we DON'T want to delete
            // Everything else (user data, cache, settings) gets wiped
            const systemPrefixes = ['@expo', 'expo-', 'EXPO_'];
            const userKeys = keys.filter(k => !systemPrefixes.some(prefix => k.startsWith(prefix)));

            if (userKeys.length > 0) {
                await AsyncStorage.multiRemove(userKeys);
                console.log(`🧹 Cleared ${userKeys.length} user data keys on logout`);
            }
        } catch (e) {
            console.error('Failed to clear all user data:', e);
        }
    }
};
