window.__ModuleLoader__.load({
	id: "dsh-completion-notifier",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		const SOUND_KEY = "dsh.completion-notifier.sound";
		const TOAST_MS = 6000;
		let noticeSeq = 0;

		const zh = {
			"toast.title": "任务完成",
			"toast.body": "「{title}」的对话已完成",
			"settings.sound.label": "完成提示音",
			"settings.sound.description": "对话完成时播放提示音",
		};
		const en = {
			"toast.title": "Task complete",
			"toast.body": "Conversation \"{title}\" finished",
			"settings.sound.label": "Completion sound",
			"settings.sound.description": "Play a sound when a conversation finishes",
		};

		function isSoundEnabled() {
			try {
				return window.localStorage.getItem(SOUND_KEY) !== "off";
			} catch {
				return true;
			}
		}

		function playChime() {
			try {
				const Ctor = window.AudioContext || window.webkitAudioContext;
				if (!Ctor) return;
				const ac = new Ctor();
				const now = ac.currentTime;
				const notes = [
					{ freq: 880, at: 0 },
					{ freq: 1174.66, at: 0.14 },
				];
				for (const note of notes) {
					const osc = ac.createOscillator();
					const gain = ac.createGain();
					osc.type = "sine";
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
					try { void ac.close(); } catch {}
				}, 1400);
			} catch {}
		}

		const stackStyle = { position: "fixed", top: 16, right: 16, zIndex: 10000, display: "flex", flexDirection: "column", gap: 10, maxWidth: 340, pointerEvents: "none" };
		const toastStyle = { pointerEvents: "auto", background: "var(--dsw-specific-menu, #1f2328)", color: "var(--dsw-alias-label-primary, #f5f7fa)", border: "1px solid var(--dsw-alias-border-l2, #3a3f47)", borderRadius: 12, boxShadow: "var(--dsw-shadow-lv3, 0 8px 24px rgba(0, 0, 0, 0.4))", padding: "12px 14px" };
		const titleStyle = { fontSize: 13, fontWeight: 600, lineHeight: "18px" };
		const bodyStyle = { fontSize: 12, lineHeight: "18px", opacity: 0.75, overflowWrap: "anywhere" };

		function CompletionToastLayer(props) {
			const useSessions = props.useSessions;
			const t = props.t;
			const byId = useSessions((state) => state.byId);
			const prevRunning = react.useRef(new Map());
			const state = react.useState([]);
			const notices = state[0];
			const setNotices = state[1];

			react.useEffect(() => {
				const current = new Map();
				for (const id of Object.keys(byId)) current.set(id, byId[id].running);
				const fired = [];
				for (const [id, running] of current) {
					const was = prevRunning.current.get(id) ?? false;
					if (was && !running) {
						fired.push({ key: noticeSeq++, title: byId[id]?.displayTitle ?? id, at: Date.now() });
					}
				}
				prevRunning.current = current;
				if (fired.length > 0) {
					setNotices((list) => [...list, ...fired]);
					if (isSoundEnabled()) {
						for (let i = 0; i < Math.min(fired.length, 3); i++) playChime();
					}
				}
			}, [byId]);

			react.useEffect(() => {
				if (notices.length === 0) return;
				const timer = window.setInterval(() => {
					setNotices((list) => {
						const kept = list.filter((n) => Date.now() - n.at < TOAST_MS);
						return kept.length === list.length ? list : kept;
					});
				}, 1000);
				return () => window.clearInterval(timer);
			}, [notices.length]);

			if (notices.length === 0) return null;

			return react.createElement("div", { style: stackStyle, role: "region", "aria-label": t("toast.title") },
				notices.map((n) =>
					react.createElement("div", { key: n.key, style: toastStyle, role: "status" },
						react.createElement("div", { style: titleStyle }, t("toast.title")),
						react.createElement("div", { style: bodyStyle }, t("toast.body", { title: n.title })),
					),
				),
			);
		}

		const rowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0" };
		const rowTextStyle = { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 };
		const rowLabelStyle = { fontSize: 13, lineHeight: "18px", color: "var(--dsw-alias-label-primary, #f5f7fa)" };
		const rowDescStyle = { fontSize: 12, lineHeight: "16px", color: "var(--dsw-alias-label-tertiary, #9aa1ab)" };
		const switchStyle = { position: "relative", width: 34, height: 20, borderRadius: 999, border: "none", cursor: "pointer", background: "var(--dsw-alias-fill-l2, #3a3f47)", padding: 0, flex: "none" };
		const switchKnobStyle = (on) => ({ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: on ? "var(--dsw-alias-accent, #4d6bfe)" : "var(--dsw-alias-label-tertiary, #9aa1ab)", transition: "left .12s ease, background .12s ease" });

		function SoundToggleRow(props) {
			const t = props.t;
			const state = react.useState(isSoundEnabled);
			const enabled = state[0];
			const setEnabled = state[1];
			const onToggle = react.useCallback(() => {
				setEnabled((current) => {
					const next = !current;
					try { window.localStorage.setItem(SOUND_KEY, next ? "on" : "off"); } catch {}
					return next;
				});
			}, []);
			return react.createElement("div", { style: rowStyle },
				react.createElement("div", { style: rowTextStyle },
					react.createElement("div", { style: rowLabelStyle }, t("settings.sound.label")),
					react.createElement("div", { style: rowDescStyle }, t("settings.sound.description")),
				),
				react.createElement("button", { type: "button", role: "switch", "aria-checked": enabled, "aria-label": t("settings.sound.label"), onClick: onToggle, style: switchStyle },
					react.createElement("span", { style: switchKnobStyle(enabled) }),
				),
			);
		}

		const inject = ["slots", "locale"];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register("completion-notifier", { zh, en }), "completion-notifier: dictionaries");
			ctx.slots.inject("shell.overlay", () =>
				ctx.slots.register(
					{ name: "shell.overlay", id: "completion-notifier", order: 100, locale: "completion-notifier" },
					CompletionToastLayer,
				),
			);
			ctx.slots.inject("settings.general.item", () =>
				ctx.slots.register(
					{ name: "settings.general.item", id: "completion-notifier-sound", order: 100, locale: "completion-notifier" },
					SoundToggleRow,
				),
			);
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
