# dsh-completion-notifier

实时监控对话任务完成的小插件：当一个会话（对话）的这一轮生成结束时，在屏幕上弹出提示文字，并播放一段提示音提醒你「对话已经完成」。

- 提示方式：右上角 **Toast 文字提醒** + **Web Audio 提示音**（无需任何音频资源）。
- 声音开关：注册到「设置 → 常规」里的一行开关，可关闭提示音（用 `localStorage` 持久化）。
- 双语：文案走 `completion-notifier` locale 命名空间，跟随界面的中 / 英文设置。
- 轻量：纯客户端插件，host 半边为空。

## 工作原理（检测「对话完成」）

运行时 `sessions` 列表里每个会话都带一个 `running` 布尔位：agent 生成期间为 `true`，这一轮结束后翻回 `false`。插件在 `shell.overlay`（全屏浮层插槽）里渲染一个监听组件，用 `useSessions` 订阅 `byId`，跨渲染比较每个会话的 `running` 位：

- `true -> false` ⇒ 该会话这一轮刚结束 ⇒ 弹 toast + 播提示音；
- 首次渲染只播种基线（已空闲的会话不会误报），只有真正经历「运行 → 结束」的会话才提醒。

## 目录结构

```
dsh-completion-notifier/
├── package.json          # dsh.client 清单 + exports["./client"] + peerDependencies
├── tsdown.config.ts      # 构建配置（见下方说明）
└── src/
    ├── index.ts          # host 半边（空 apply，占位让 host Loader 发现本包）
    └── client/
        ├── index.tsx     # 客户端 apply + 完成检测 + toast + 提示音 + 设置开关
        └── locales.ts    # zh/en 文案 + LocaleNamespaceMap 声明
```

## 使用方式一：静态插件包（正式、可发布）

这是文档 `docs/user/develop/basic/` 描述的标准路径。推荐在 deepseek-harness 仓库内构建：

1. `git clone https://github.com/deepseek-ai/deepseek-harness.git`
2. 把本目录放到 `packages/client/dsh-completion-notifier/`。
3. 在仓库根目录 `pnpm install`，然后 `pnpm build`（或进入本包 `pnpm build`）。
4. 构建产物需满足「构建不变量」（见下），其中 `lib/client.js` 的 `window.__ModuleLoader__.load` 包裹与 `lib/types/` 布局由仓库共享构建工具生成。

安装到 profile（以 `web` 为例）：

```sh
# 在本包目录里安装到 web profile（等价于在该 profile 的 package.json 加依赖）
dsh plugin --profile web add ./   # 或: dsh plugin --profile web add dsh-completion-notifier
```

然后在 profile 的组合里加入一行（`cordis.patch.yml` 或对应 profile 的插件列表）：

```yaml
- id: completion-notifier
  name: dsh-completion-notifier
```

重启 `dsh web` 后，插件即生效。

### 构建不变量（如果你用自己的构建工具）

产物必须满足，`dsh-client-modules` 才能正确发现并加载：

1. `package.json` 有 `dsh.client.platform = "web"`，且 `exports["./client"]` 指向 `lib/client.js`。
2. `lib/index.js` 是 ESM，导出 `apply`（host 半边，可为空函数）。
3. `lib/client.js` 是单个浏览器包，形如：

```js
window.__ModuleLoader__.load({
  id: "dsh-completion-notifier",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    // ... 你的代码，外部依赖用 require("react")、require("react/jsx-runtime") 等
    return module.exports;
  }
});
```

4. 所有 `@deepseek-ai/*` 与 `react` 依赖必须**外部化**（保留为 `require()`，不要打进包里）。
5. 客户端模块导出 `{ apply, inject }`，`inject` 为服务名数组 `["slots", "locale"]`。

## 使用方式二：动态插件（免构建、即改即用）

如果你的 DSH 环境提供动态插件工具（`cordis_define` / `cordis_run`），可跳过构建，直接把 `DYNAMIC_PLUGIN.md` 里的 `code.client` 代码作为插件运行。逻辑与本包完全一致。

## 已知限制

- 以 `running` 位作为「这一轮结束」的信号：连接断开 / 重连时若该位被重置，可能产生一次多余提醒（罕见）。
- 浏览器自动播放策略可能拦截提示音；此时 toast 仍然正常显示。
- 声音开关行只在带「设置」界面的 profile 里出现；无设置 UI 时开关被省略，toast + 声音照常工作。
