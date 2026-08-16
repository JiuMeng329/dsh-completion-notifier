# 免构建动态插件版本

如果你的 DSH 环境提供动态插件工具（`cordis_define` / `cordis_run`），可以把下面的纯 JavaScript 作为**客户端插件代码**运行，无需 TypeScript、无需打包。逻辑与静态包完全一致：监听 `running` 位，`true -> false` 时弹 toast + 播提示音。

> 动态客户端插件约束：不能用 `import` / `require` / JSX / TypeScript 类型，React 用全局 `React.createElement`。服务用 `ctx.get('slots')` 并做缺省判断。

## code.client

```js
return {
  inject: [],
  apply(ctx) {
    var slots = ctx.get('slots');
    if (slots === undefined) return;

    var SOUND_KEY = 'dsh.completion-notifier.sound';
    var seq = 0;

    function isSoundEnabled() {
      try { return window.localStorage.getItem(SOUND_KEY) !== 'off'; }
      catch (e) { return true; }
    }

    function playChime() {
      try {
        var Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        var ac = new Ctor();
        var now = ac.currentTime;
        [[880, 0], [1174.66, 0.14]].forEach(function (n) {
          var osc = ac.createOscillator();
          var gain = ac.createGain();
          osc.type = 'sine';
          osc.frequency.value = n[0];
          gain.gain.setValueAtTime(0.0001, now + n[1]);
          gain.gain.exponentialRampToValueAtTime(0.28, now + n[1] + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + 0.6);
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.start(now + n[1]);
          osc.stop(now + n[1] + 0.65);
        });
        window.setTimeout(function () { try { ac.close(); } catch (e) {} }, 1400);
      } catch (e) {}
    }

    function Toast(props) {
      var useSessions = props.useSessions;
      var byId = useSessions(function (s) { return s.byId; });
      var prev = React.useRef(new Map());
      var state = React.useState([]);
      var notices = state[0];
      var setNotices = state[1];

      React.useEffect(function () {
        var current = new Map();
        Object.entries(byId).forEach(function (entry) {
          current.set(entry[0], entry[1].running);
        });
        var fired = [];
        current.forEach(function (running, id) {
          var was = prev.current.get(id) === true;
          if (was && !running) {
            fired.push({ key: seq++, title: (byId[id] && byId[id].displayTitle) || id, at: Date.now() });
          }
        });
        prev.current = current;
        if (fired.length) {
          setNotices(function (list) { return list.concat(fired); });
          if (isSoundEnabled()) {
            for (var i = 0; i < Math.min(fired.length, 3); i++) playChime();
          }
        }
      }, [byId]);

      React.useEffect(function () {
        if (!notices.length) return;
        var timer = window.setInterval(function () {
          setNotices(function (list) {
            var kept = list.filter(function (n) { return Date.now() - n.at < 6000; });
            return kept.length === list.length ? list : kept;
          });
        }, 1000);
        return function () { window.clearInterval(timer); };
      }, [notices.length]);

      if (!notices.length) return null;

      return React.createElement(
        'div',
        { style: { position: 'fixed', top: 16, right: 16, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340 } },
        notices.map(function (n) {
          return React.createElement(
            'div',
            { key: n.key, role: 'status', style: { background: 'rgba(20,24,30,.96)', color: '#f5f7fa', border: '1px solid #3a3f47', borderRadius: 12, padding: '12px 14px', boxShadow: '0 8px 24px rgba(0,0,0,.4)' } },
            React.createElement('div', { style: { fontWeight: 600, fontSize: 13, lineHeight: '18px' } }, '\u4efb\u52a1\u5b8c\u6210'),
            React.createElement('div', { style: { fontSize: 12, lineHeight: '18px', opacity: 0.75 } }, '\u300c' + n.title + '\u300d\u7684\u5bf9\u8bdd\u5df2\u5b8c\u6210')
          );
        })
      );
    }

    slots.inject('shell.overlay', function () {
      return slots.register(
        { name: 'shell.overlay', id: 'completion-notifier', order: 100 },
        Toast
      );
    });
  }
};
```

## 说明

- `slots.inject('shell.overlay', ...)` 等 `shell.overlay` 插槽被声明后注册；卸载时自动移除。
- 文案硬编码为中文（`\u4efb\u52a1\u5b8c\u6210` = 任务完成）；如需英文，替换字符串即可。
- `prev` 用 `React.useRef(new Map())` 在首帧播种基线，避免页面加载时对已空闲会话误报。
