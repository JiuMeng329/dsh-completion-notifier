/**
 * Dictionary for the `completion-notifier` locale namespace. Declaring the
 * namespace in `LocaleNamespaceMap` (like SlotMap, merged via declaration
 * merging) makes the slot's `locale: 'completion-notifier'` option deliver a
 * typed `t` seat, and makes `ctx.locale.register(ns, { zh, en })` compile-time
 * checked for complete, bilingual dictionaries.
 */
export type CompletionNotifierKey = 'toast.title' | 'toast.body' | 'settings.sound.label' | 'settings.sound.description';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'completion-notifier': CompletionNotifierKey;
    }
}
export declare const zh: Record<CompletionNotifierKey, string>;
export declare const en: Record<CompletionNotifierKey, string>;
//# sourceMappingURL=locales.d.ts.map