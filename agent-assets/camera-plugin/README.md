# 企好摄像头插件

提供拍照按钮、设备选择、实时预览和 JPEG 拍照。照片通过 DSH 插槽传入的 `onAddFiles` 回调加入聊天附件，继续使用宿主的图片限制、预览和发送流程；关闭或卸载时释放摄像头。文案和主题适配样式由插件维护。

在本目录执行 `npm ci --legacy-peer-deps`、`npm run check`，然后通过 `../runtime-bundle/scripts/install.ps1` 安装到 profile。Linux 可将 `package.json`、`README.md`、`lib/` 复制到 `$DSH_HOME/profiles/web/vendor/qihao-camera`，运行 `dsh plugin --profile web add "link:$DSH_HOME/profiles/web/vendor/qihao-camera"`，并部署更新后的 runtime-bundle patch。Linux 尚未实机验证。

本插件要求 DSH 保留 `conversation.input.camera` 插槽（`disabled`、`onAddFiles`）；这不是当前上游自带接口。DSH 的附件插件保持原样，摄像头功能不再写入其源码。React 和 Button、Modal、Tooltip 使用 DSH 浏览器模块表提供的实例，不打包副本。构建不引用固定的 DSH 本地路径。

摄像头需浏览器授权和安全上下文；云端部署使用 HTTPS，摄像头来自打开网页的用户电脑。自动化组件测试模拟设备和界面原子组件，涵盖切换设备、JPEG 附件、失败重试与释放；实际插件加载和宿主组件另做浏览器检查。
