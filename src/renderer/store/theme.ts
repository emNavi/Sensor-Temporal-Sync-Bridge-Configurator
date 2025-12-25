import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'

export const useThemeStore = defineStore('theme', {
    state: () => ({
        mode: (localStorage.getItem('theme') as ThemeMode) || 'light',
    }),

    actions: {
        setMode(mode: ThemeMode) {
        this.mode = mode
        document.documentElement.classList.toggle('dark', mode === 'dark')
        localStorage.setItem('theme', mode)
        },

        toggle() {
        this.setMode(this.mode === 'dark' ? 'light' : 'dark')
        }
    }
})