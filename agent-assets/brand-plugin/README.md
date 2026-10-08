# 企好品牌插件

使用 DSH 已有的 `sidebar.brand.mark`、`sidebar.brand.name`、`conversation.hero.brand.mark` 插槽，显示原始蓝底 QH Logo 和侧栏名称“企好AI”。图片直接打入插件，无需给 DSH 的 public 目录追加资源。网页标题、favicon 和 PWA 信息使用 DSH 默认值。

当前 DSH 源码保留首屏定制：`ui-conversation/src/client/locales.ts` 的标题为“企好AI智能助手”，`skeleton/EmptyHero.tsx` 不显示预览徽标。该定制不由本插件提供，升级 DSH 时须保留这些改动及对应样式、测试。

执行 `npm ci --legacy-peer-deps` 和 `npm test` 构建、验证后，通过 `runtime-bundle/scripts/install.ps1` 安装。运行时 bundle 禁用官方品牌插件并挂载本插件；React 使用 DSH 提供的实例。

插件依赖 DSH 的公开插槽接口，升级仍需验证插件加载与品牌显示，不保证跨版本免测试。

Linux 可在本目录构建后，将包体镜像到已部署的 profile，再安装（需先设置实际的 `DSH_HOME`）：

```sh
stage="$DSH_HOME/profiles/web/vendor/qihao-brand"
mkdir -p "$stage"
cp package.json README.md "$stage/"
cp -R lib "$stage/"
dsh plugin --profile web add "link:$stage"
```

同时部署更新后的 `runtime-bundle/cordis.patch.yml`，由它禁用默认品牌并挂载本插件。Linux 安装尚未实机验证。
