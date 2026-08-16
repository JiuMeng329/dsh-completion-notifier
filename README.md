# dsh-completion-notifier

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) **client plugin** that watches conversations in real time and notifies you the moment a turn finishes — with an on-screen toast and a chime.

一个实时监控对话任务完成的 DSH 插件：当会话的这一轮生成结束时，右上角弹出文字提醒并播放提示音。

## 功能特性

- ✅ 实时检测「对话完成」：agent 停止生成的那一刻即触发
- ✅ 屏上文字提醒：右上角 Toast，自动消失
- ✅ 提示音：Web Audio 现场合成，**无需任何音频资源文件**
- ✅ 声音开关：设置 → 常规 →「完成提示音」（`localStorage` 持久化）
- ✅ 双语文案：跟随界面中 / 英文设置
- ✅ 纯客户端插件，无 host 侧副作用

## 安装

> 前置：已安装 DSH，且有一个 web profile（`dsh web`）。

### 方式一：手动安装（推荐，开箱即用）

仓库里已带预构建产物 `lib/`，无需再编译。

1. 把本仓库放到 DSH 的 profile 依赖目录：

```powershell
# Windows 默认 DSH_HOME = %USERPROFILE%\.dsh
$dst = "$env:USERPROFILE\.dsh\profiles\node_modules\dsh-completion-notifier"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item package.json, lib $dst -Recurse -Force
```

2. 在 profile 的 patch 层加入一行。编辑 `%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml`：

```yaml
- insert:
    - id: completion-notifier
      name: dsh-completion-notifier
```

3. 重启：

```powershell
dsh web
```

### 方式二：dsh plugin（官方包管理器）

```sh
dsh plugin --profile web add dsh-completion-notifier
```

然后再按上面的方式把那一行写进 `cordis.patch.yml`，并重启。

## 使用

1. 打开 web 界面，正常发起一轮对话；
2. 等 agent 这一轮回答结束，右上角会弹「任务完成」Toast，同时响两声提示音；
3. 想关掉声音：设置 → 常规 →「完成提示音」。

## 工作原理

DSH 运行时的 `sessions` 列表里，每个会话带一个 `running` 布尔位：agent 生成期间为 `true`，本轮结束翻回 `false`。插件在 `shell.overlay`（全屏浮层插槽）里渲染一个监听组件，跨渲染比较该位：

- `true → false` ⇒ 判定「这一轮刚完成」⇒ 弹 Toast + 播提示音；
- 首帧只播种基线，已空闲的会话不会误报。

## 开发 / 构建

源码用 TypeScript + React（JSX），构建用 `tsdown`。推荐在 deepseek-harness 仓库内开发（共享构建工具会生成 `window.__ModuleLoader__.load` 包裹与 `lib/types/` 布局）：

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
# 把本目录放到 packages/client/dsh-completion-notifier/
pnpm install
pnpm build
```

关键不变量（自建构建时需满足）见 `tsdown.config.ts` 注释与构建说明。

## 目录结构

```
dsh-completion-notifier/
├── package.json          # dsh.client 清单 + exports["./client"]
├── tsdown.config.ts      # 构建配置
├── LICENSE               # MIT
├── lib/                  # 预构建产物（index.js / client.js）
└── src/
    ├── index.ts          # host 半边（空 apply）
    └── client/
        ├── index.tsx     # 完成检测 + Toast + 提示音 + 设置开关
        └── locales.ts    # zh/en 文案
```

## License

[MIT](./LICENSE)
