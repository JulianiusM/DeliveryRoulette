// src/types/global.d.ts

export {};

declare global {
    interface Window {
        DeliveryRouletteApp: {
            init?: () => void;
        };

        // Bootstrap types
        bootstrap?: {
            Modal: {
                getOrCreateInstance(element: HTMLElement): { show(): void; hide(): void };
                getInstance(element: HTMLElement): { show(): void; hide(): void } | null;
                new(element: HTMLElement): { show(): void; hide(): void };
            };
        };

    }
}
