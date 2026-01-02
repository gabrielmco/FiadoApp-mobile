import axios from 'axios';

// Detect if running on device or browser to choose localhost or IP
const getBaseUrl = () => {
    // If running in browser, use the current hostname (e.g., 192.168.x.x or localhost)
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:3000/api`;
    }
    return 'http://localhost:3000/api';
};

export const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});
