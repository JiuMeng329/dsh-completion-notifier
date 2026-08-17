window.__ModuleLoader__.load({
	id: "dsh-completion-notifier",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		react = __toESM(react, 1);
		//#region lib/types/client/locales.js
		const zh = {
			"toast.title": "任务完成",
			"toast.body": "「{title}」的对话已完成",
			"settings.sound.label": "完成提示音",
			"settings.sound.description": "对话完成时播放提示音"
		};
		const en = {
			"toast.title": "Task complete",
			"toast.body": "Conversation \"{title}\" finished",
			"settings.sound.label": "Completion sound",
			"settings.sound.description": "Play a sound when a conversation finishes"
		};
		//#endregion
		//#region lib/types/client/index.js
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
		const SOUND_KEY = "dsh.completion-notifier.sound";
		const TOAST_MS = 6e3;
		/** Monotonic id so concurrent notices keep stable React keys. */
		let noticeSeq = 0;
		function isSoundEnabled() {
			try {
				return window.localStorage.getItem(SOUND_KEY) !== "off";
			} catch {
				return true;
			}
		}
		/**
		* A short two-note chime generated with the Web Audio API. No audio asset is
		* shipped, and failures (autoplay policy, missing Web Audio) degrade silently —
		* the toast still appears either way.
		*/
		function playChime() {
			try {
				const w = window;
				const Ctor = w.AudioContext ?? w.webkitAudioContext;
				if (!Ctor) return;
				const ac = new Ctor();
				const now = ac.currentTime;
				for (const note of [{
					freq: 880,
					at: 0
				}, {
					freq: 1174.66,
					at: .14
				}]) {
					const osc = ac.createOscillator();
					const gain = ac.createGain();
					osc.type = "sine";
					osc.frequency.value = note.freq;
					gain.gain.setValueAtTime(1e-4, now + note.at);
					gain.gain.exponentialRampToValueAtTime(.28, now + note.at + .02);
					gain.gain.exponentialRampToValueAtTime(1e-4, now + note.at + .6);
					osc.connect(gain);
					gain.connect(ac.destination);
					osc.start(now + note.at);
					osc.stop(now + note.at + .65);
				}
				window.setTimeout(() => {
					try {
						ac.close();
					} catch {}
				}, 1400);
			} catch {}
		}
		function CompletionToastLayer({ useSessions, t }) {
			const byId = useSessions((state) => state.byId);
			const prevRunning = react.useRef(/* @__PURE__ */ new Map());
			const [notices, setNotices] = react.useState([]);
			react.useEffect(() => {
				const current = /* @__PURE__ */ new Map();
				const fired = [];
				for (const [id, summary] of Object.entries(byId)) {
					const running = summary.running;
					current.set(id, running);
					if ((prevRunning.current.get(id) ?? false) && !running) fired.push({
						key: noticeSeq++,
						title: summary.displayTitle,
						at: Date.now()
					});
				}
				prevRunning.current = current;
				if (fired.length > 0) {
					setNotices((list) => [...list, ...fired]);
					if (isSoundEnabled()) for (let i = 0; i < Math.min(fired.length, 3); i += 1) playChime();
				}
			}, [byId]);
			react.useEffect(() => {
				if (notices.length === 0) return;
				const timer = window.setInterval(() => {
					setNotices((list) => {
						const kept = list.filter((notice) => Date.now() - notice.at < TOAST_MS);
						return kept.length === list.length ? list : kept;
					});
				}, 1e3);
				return () => window.clearInterval(timer);
			}, [notices.length]);
			if (notices.length === 0) return null;
			return (0, react_jsx_runtime.jsx)("div", {
				style: stackStyle,
				role: "region",
				"aria-label": t("toast.title"),
				children: notices.map((notice) => (0, react_jsx_runtime.jsxs)("div", {
					style: toastStyle,
					role: "status",
					children: [(0, react_jsx_runtime.jsx)("div", {
						style: titleStyle,
						children: t("toast.title")
					}), (0, react_jsx_runtime.jsx)("div", {
						style: bodyStyle,
						children: t("toast.body", { title: notice.title })
					})]
				}, notice.key))
			});
		}
		/**
		* Optional General-settings row that toggles the chime. Registered into
		* `settings.general.item`; when a profile has no settings UI, `slots.inject`
		* simply never fires and the row is omitted — the toast still works.
		*/
		function SoundToggleRow({ t }) {
			const [enabled, setEnabled] = react.useState(isSoundEnabled);
			const onToggle = react.useCallback(() => {
				setEnabled((current) => {
					const next = !current;
					try {
						window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
					} catch {}
					return next;
				});
			}, []);
			return (0, react_jsx_runtime.jsxs)("div", {
				style: rowStyle,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					style: rowTextStyle,
					children: [(0, react_jsx_runtime.jsx)("div", {
						style: rowLabelStyle,
						children: t("settings.sound.label")
					}), (0, react_jsx_runtime.jsx)("div", {
						style: rowDescStyle,
						children: t("settings.sound.description")
					})]
				}), (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					role: "switch",
					"aria-checked": enabled,
					"aria-label": t("settings.sound.label"),
					onClick: onToggle,
					style: switchStyle,
					children: (0, react_jsx_runtime.jsx)("span", { style: switchKnobStyle(enabled) })
				})]
			});
		}
		const stackStyle = {
			position: "fixed",
			top: 16,
			right: 16,
			zIndex: 1e4,
			display: "flex",
			flexDirection: "column",
			gap: 10,
			maxWidth: 340,
			pointerEvents: "none"
		};
		const toastStyle = {
			pointerEvents: "auto",
			background: "var(--dsw-specific-menu, #1f2328)",
			color: "var(--dsw-alias-label-primary, #f5f7fa)",
			border: "1px solid var(--dsw-alias-border-l2, #3a3f47)",
			borderRadius: 12,
			boxShadow: "var(--dsw-shadow-lv3, 0 8px 24px rgba(0, 0, 0, 0.4))",
			padding: "12px 14px",
			display: "flex",
			flexDirection: "column",
			gap: 4
		};
		const titleStyle = {
			fontSize: 13,
			fontWeight: 600,
			lineHeight: "18px"
		};
		const bodyStyle = {
			fontSize: 12,
			lineHeight: "18px",
			opacity: .75,
			overflowWrap: "anywhere"
		};
		const rowStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
			padding: "10px 0"
		};
		const rowTextStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 2,
			minWidth: 0
		};
		const rowLabelStyle = {
			fontSize: 13,
			lineHeight: "18px",
			color: "var(--dsw-alias-label-primary, #f5f7fa)"
		};
		const rowDescStyle = {
			fontSize: 12,
			lineHeight: "16px",
			color: "var(--dsw-alias-label-tertiary, #9aa1ab)"
		};
		const switchStyle = {
			position: "relative",
			width: 34,
			height: 20,
			borderRadius: 999,
			border: "none",
			cursor: "pointer",
			background: "var(--dsw-alias-fill-l2, #3a3f47)",
			padding: 0,
			flex: "none"
		};
		const switchKnobStyle = (on) => ({
			position: "absolute",
			top: 2,
			left: on ? 16 : 2,
			width: 16,
			height: 16,
			borderRadius: "50%",
			background: on ? "var(--dsw-alias-accent, #4d6bfe)" : "var(--dsw-alias-label-tertiary, #9aa1ab)",
			transition: "left .12s ease, background .12s ease"
		});
		/** Required services: the slot registry and the locale registry. */
		const inject = ["slots", "locale"];
		/**
		* Client plugin body: register the dictionaries, then contribute the toast
		* into `shell.overlay` and the sound toggle into the General settings section.
		* Both slot contributions ride `slots.inject`, so they wait for their target
		* slots to be declared and are torn down automatically on plugin unload.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register("completion-notifier", {
				zh,
				en
			}), "completion-notifier: dictionaries");
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "completion-notifier",
				order: 100,
				locale: "completion-notifier"
			}, CompletionToastLayer));
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "completion-notifier-sound",
				order: 100,
				locale: "completion-notifier"
			}, SoundToggleRow));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map