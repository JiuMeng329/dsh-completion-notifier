/**
 * Client half of the completion notifier.
 *
 * How completion is detected: every session row in the runtime's `sessions`
 * list carries a `running` boolean (flipped by the host stream while the agent
 * is generating, and back to `false` when the turn ends). We diff that bit
 * across renders — a `true -> false` transition is "this session's turn just
 * finished". We seed the previous-bit map on first render (so sessions that
 * were already idle never fire), then on every transition we (a) push an
 * on-screen toast and (b) play a short Web Audio chime, both driven from the
 * `shell.overlay` list slot.
 *
 * All UI text goes through the `completion-notifier` locale namespace, so it
 * follows the shell's zh/en preference. Styling uses theme CSS variables with
 * fallbacks, so the toast matches the shell's look without shipping a stylesheet.
 */
import * as React from 'react';
import type { ClientContext, SessionListState } from '@deepseek-ai/dsh-client-runtime';
import type { SnapshotSelectorHook, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { en, zh } from './locales';

const SOUND_KEY = 'dsh.completion-notifier.sound';
const TOAST_MS = 6000;

/** Monotonic id so concurrent notices keep stable React keys. */
let noticeSeq = 0;

function isSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * A short two-note chime generated with the Web Audio API. No audio asset is
 * shipped, and failures (autoplay policy, missing Web Audio) degrade silently —
 * the toast still appears either way.
 */
function playChime(): void {
  try {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    const ac = new Ctor();
    const now = ac.currentTime;
    const notes: ReadonlyArray<{ freq: number; at: number }> = [
      { freq: 880, at: 0 },
      { freq: 1174.66, at: 0.14 },
    ];
    for (const note of notes) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0.0001, now + note.at);
      gain.gain.exponentialRampToValueAtTime(0.28, now + note.at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + 0.6);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now + note.at);
      osc.stop(now + note.at + 0.65);
    }
    window.setTimeout(() => {
      try {
        void ac.close();
      } catch {
        // already closed
      }
    }, 1400);
  } catch {
    // no-op
  }
}

interface Notice {
  key: number;
  title: string;
  at: number;
}

interface ToastProps {
  useSessions: SnapshotSelectorHook<SessionListState>;
  t: TranslateNS<'completion-notifier'>;
}

function CompletionToastLayer({ useSessions, t }: ToastProps): React.ReactNode {
  const byId = useSessions((state) => state.byId);
  const prevRunning = React.useRef<Map<string, boolean>>(new Map());
  const [notices, setNotices] = React.useState<Notice[]>([]);

  React.useEffect(() => {
    const current = new Map<string, boolean>();
    for (const [id, summary] of Object.entries(byId)) {
      current.set(id, summary.running);
    }

    const fired: Notice[] = [];
    for (const [id, running] of current) {
      const was = prevRunning.current.get(id) ?? false;
      if (was && !running) {
        fired.push({
          key: noticeSeq++,
          title: byId[id]?.displayTitle ?? id,
          at: Date.now(),
        });
      }
    }
    // Seed / advance the previous-bit map. Doing this at the end also makes
    // React StrictMode's dev double-invoke of the effect idempotent.
    prevRunning.current = current;

    if (fired.length > 0) {
      setNotices((list) => [...list, ...fired]);
      if (isSoundEnabled()) {
        for (let i = 0; i < Math.min(fired.length, 3); i += 1) playChime();
      }
    }
  }, [byId]);

  React.useEffect(() => {
    if (notices.length === 0) return;
    const timer = window.setInterval(() => {
      setNotices((list) => {
        const kept = list.filter((notice) => Date.now() - notice.at < TOAST_MS);
        return kept.length === list.length ? list : kept;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [notices.length]);

  if (notices.length === 0) return null;

  return (
    <div style={stackStyle} role="region" aria-label={t('toast.title')}>
      {notices.map((notice) => (
        <div key={notice.key} style={toastStyle} role="status">
          <div style={titleStyle}>{t('toast.title')}</div>
          <div style={bodyStyle}>{t('toast.body', { title: notice.title })}</div>
        </div>
      ))}
    </div>
  );
}

interface ToggleProps {
  t: TranslateNS<'completion-notifier'>;
}

/**
 * Optional General-settings row that toggles the chime. Registered into
 * `settings.general.item`; when a profile has no settings UI, `slots.inject`
 * simply never fires and the row is omitted — the toast still works.
 */
function SoundToggleRow({ t }: ToggleProps): React.ReactNode {
  const [enabled, setEnabled] = React.useState<boolean>(isSoundEnabled);
  const onToggle = React.useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
      } catch {
        // storage unavailable — keep the in-memory state only
      }
      return next;
    });
  }, []);

  return (
    <div style={rowStyle}>
      <div style={rowTextStyle}>
        <div style={rowLabelStyle}>{t('settings.sound.label')}</div>
        <div style={rowDescStyle}>{t('settings.sound.description')}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t('settings.sound.label')}
        onClick={onToggle}
        style={switchStyle}
      >
        <span style={switchKnobStyle(enabled)} />
      </button>
    </div>
  );
}

const stackStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 10000,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  maxWidth: 340,
  pointerEvents: 'none',
};

const toastStyle: React.CSSProperties = {
  pointerEvents: 'auto',
  background: 'var(--dsw-specific-menu, #1f2328)',
  color: 'var(--dsw-alias-label-primary, #f5f7fa)',
  border: '1px solid var(--dsw-alias-border-l2, #3a3f47)',
  borderRadius: 12,
  boxShadow: 'var(--dsw-shadow-lv3, 0 8px 24px rgba(0, 0, 0, 0.4))',
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const titleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  lineHeight: '18px',
};

const bodyStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: '18px',
  opacity: 0.75,
  overflowWrap: 'anywhere',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 0',
};

const rowTextStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
};

const rowLabelStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: '18px',
  color: 'var(--dsw-alias-label-primary, #f5f7fa)',
};

const rowDescStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: '16px',
  color: 'var(--dsw-alias-label-tertiary, #9aa1ab)',
};

const switchStyle: React.CSSProperties = {
  position: 'relative',
  width: 34,
  height: 20,
  borderRadius: 999,
  border: 'none',
  cursor: 'pointer',
  background: 'var(--dsw-alias-fill-l2, #3a3f47)',
  padding: 0,
  flex: 'none',
};

const switchKnobStyle = (on: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: 2,
  left: on ? 16 : 2,
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: on ? 'var(--dsw-alias-accent, #4d6bfe)' : 'var(--dsw-alias-label-tertiary, #9aa1ab)',
  transition: 'left .12s ease, background .12s ease',
});

/** Required services: the slot registry and the locale registry. */
export const inject: string[] = ['slots', 'locale'];

/**
 * Client plugin body: register the dictionaries, then contribute the toast
 * into `shell.overlay` and the sound toggle into the General settings section.
 * Both slot contributions ride `slots.inject`, so they wait for their target
 * slots to be declared and are torn down automatically on plugin unload.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.locale.register('completion-notifier', { zh, en }),
    'completion-notifier: dictionaries',
  );

  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'completion-notifier',
        order: 100,
        locale: 'completion-notifier',
      },
      CompletionToastLayer,
    ),
  );

  ctx.slots.inject('settings.general.item', () =>
    ctx.slots.register(
      {
        name: 'settings.general.item',
        id: 'completion-notifier-sound',
        order: 100,
        locale: 'completion-notifier',
      },
      SoundToggleRow,
    ),
  );
}
