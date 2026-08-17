/**
 * Dictionary for the `completion-notifier` locale namespace. Declaring the
 * namespace in `LocaleNamespaceMap` (like SlotMap, merged via declaration
 * merging) makes the slot's `locale: 'completion-notifier'` option deliver a
 * typed `t` seat, and makes `ctx.locale.register(ns, { zh, en })` compile-time
 * checked for complete, bilingual dictionaries.
 */
export type CompletionNotifierKey =
  | 'toast.title'
  | 'toast.body'
  | 'settings.sound.label'
  | 'settings.sound.description'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'completion-notifier': CompletionNotifierKey
  }
}

export const zh: Record<CompletionNotifierKey, string> = {
  'toast.title': '任务完成',
  'toast.body': '「{title}」的对话已完成',
  'settings.sound.label': '完成提示音',
  'settings.sound.description': '对话完成时播放提示音',
}

export const en: Record<CompletionNotifierKey, string> = {
  'toast.title': 'Task complete',
  'toast.body': 'Conversation "{title}" finished',
  'settings.sound.label': 'Completion sound',
  'settings.sound.description': 'Play a sound when a conversation finishes',
}
