import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useDeviceStore = defineStore('device', () => {
    const isConnected = ref(false);
    const connectedPort = ref('');
    const deviceId = ref<number | null>(null);

    const setConnection = (value: boolean, port = '', id: number | null = null) => {
        isConnected.value = value;
        connectedPort.value = port;
        deviceId.value = id;
    };

    const disconnect = () => {
        isConnected.value = false;
        connectedPort.value = '';
        deviceId.value = null;
    };

    return { isConnected, connectedPort, deviceId, setConnection, disconnect };
});
