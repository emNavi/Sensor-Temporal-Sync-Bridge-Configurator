import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        camTrigFps: 30,
        syncBoardId: 1,
        syncMode: 'internal' as 'internal' | 'external' | 'gps',
        paramsLoaded: false,
    }),
});
