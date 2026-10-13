# 企好 BOM 图纸导入插件

此插件随 `agent-assets` 分发，不修改 DSH 内核。Profile 挂载 `@qihao/dsh-bom-import` 以加载浏览器确认界面；企好 preset 挂载 `@qihao/dsh-bom-import/tools`，提供 `read_bom_drawing_pages`、`read_business_document_pages`、`review_bom_import`。业务 MCP 命名空间为 `mom`。

DSH 浏览器模块只从 Profile 的 Loader 条目发现。只在会话 preset 中挂载工具，浏览器不会加载本插件，确认请求会退回通用问答框。Profile 入口不注册业务工具，不依赖会话附件；工具入口继续由 preset 的附件和用户问答服务管理。

## 构建与安装

在本目录执行 `npm ci --legacy-peer-deps`、`npm run check`。平台服务由 DSH 提供；客户端 React 使用 DSH 的实例，不能重复打包。随后执行现有 `runtime-bundle/scripts/install.ps1` 安装整套插件并重启 DSH。

Linux 单独安装 BOM 插件：`node scripts/install.mjs --dsh-home /path/to/dsh-home --dsh-root /path/to/deepseek-harness`。已有 DSH 命令时可以省略 `--dsh-root`。安装镜像放在 profile 内，运行依赖随平台安装，不共享 Windows 的 `node_modules`。当前已完成 Windows 的离线验证，Linux 启动仍需部署环境验收。

可执行 `node scripts/check-dsh-contract.mjs <DSH目录>`，使用实际 DSH 公共 API 离线验证工具定义与结果；它不会启动 DSH、模型或 MCP。浏览器入口与宿主入口分开打包，浏览器中只依赖宿主 React，不引入 Node/PDF 库。

验证的接口基线为 DSH `0.1.6-alpha.2` 的附件、工具、用户问答、`conversation.composer` 和 `tool.call.toolview`。升级时检查本插件构建、slot 注册、图片内容块和用户确认流程，不直接依赖 DSH 的内部文件。

## 配置

在 `assistant/agent.cordis.yml` 的 `bom-import` 行配置：

| 字段            |    默认值 | 用途                                    |
| --------------- | --------: | --------------------------------------- |
| maxPagesPerCall |         8 | 单次返回的图片数量，不是 PDF 总页数     |
| imageMaxEdge    |      2000 | 渲染图片的最长边；还受 DSH 图片限制约束 |
| maxFileBytes    |  33554432 | 单个 PDF 的最大字节数                   |
| maxSourceBytes  | 134217728 | 本批全部附件的最大字节数                |
| maxSourcePages  |       200 | 本批来源总页数，超限请拆批              |

PDF.js 和 Canvas 使用明确版本，不依赖其他插件偶然安装的包。无需 Python 或单独服务进程；Linux 安装时需保留 Canvas 对应平台的可选二进制包。

## 图纸读取

`read_business_document_pages` 使用同一套受控附件及 PDF 页面渲染能力，供产品实验检测表等业务资料使用；输入、分页和图片输出契约与图纸读取一致，不执行OCR或业务建单。BOM流程继续使用原工具名称。更新插件后须重新镜像安装并重启DSH，才能在新会话中发现新增入口。

首次调用 `read_bom_drawing_pages({})`，返回来源目录及前 8 页图片。后续传同一 `sourceSetId` 和 `pages`。本批按附件顺序、PDF 自然页序统一编号；界面显示原文件名与原页码。`remainingPages` 指本次调用未返回的页，Agent 应累计已处理页码，不能把它当作累计识别进度。

局部放大传单页和 `region: {x,y,width,height}`，坐标相对完整页面，范围为 0 到 1。局部放大不改变来源编号。图片缩放不能恢复源图已经丢失的细节。

调用 `mcp__mom__resolve_bom_materials_v2` 后，只有存在未找到的有效存货档案时才显示紧凑提示；全部命中时不显示卡片，以免打断导入流程。提示默认列出缺失编码，用户可展开完整核对结果，按请求顺序查看状态、档案信息和分页。这里的“未找到”表示当前组织没有返回有效（未停用、未删除）档案，不代表能据此断定系统里没有历史档案。

## 用户确认

`review_bom_import` 只接受最新真实校验结果的 `validationId`，以及可选 `sourceSetId`、`sourceLinks`（BOM、子件序号从 1 开始）。确认数据由宿主从本会话配对的 MCP 调用结果取得，不接受模型传入业务数据。

确认区默认显示摘要卡片，点击“核对 BOM”后打开居中弹窗。支持最大化和还原、关闭或 Escape 返回聊天；收起界面不提交任何决定。表格和来源图纸分别滚动，确认按钮固定在底部。颜色直接读取 DSH 语义主题变量，跟随明暗及自定义主题。组织显示后端档案名称；旧校验结果缺少名称时需重新校验。版本编码直接显示后端的 `versionCode`。

依赖树采用从左到右的节点和连接线，默认展开第一层；支持拖拽画布平移、逐节点展开/收起、全部展开/收起和缩放。树只预览本批编码关系；指定已有版本的子件不会被替换成同编码的本批 BOM，叶子和循环节点不能继续展开。损耗、虚拟件和 MRP 控制字段暂不在表格展示，原始确认数据保持不变。

确认组件只读。用户返回修改后，Agent 必须重新校验；确认时票据过期返回 `EXPIRED`。历史卡片不能再次确认。界面“已确认”不代表已经创建，必须继续调用后端创建工具并查看实际结果。

当前后端票据本身不包含人类确认凭证；本插件和 Skill 提供用户交互闸门，不改变后端权限规则。

`sourceSetId` 固定一条真实用户消息所上传的附件批次。多图片请作为同一批消息上传；跨消息补充资料需要明确新的批次，不能无声合并到旧票据。裁剪只用于识别小字，不替换确认界面的完整来源图。

## 测试边界

`npm run check` 运行静态检查、隔离单元/组件测试与构建，不连接业务 MCP，不创建单据。实际 DSH E2E 与隔离业务库写入测试须先取得用户确认。

E2E 先验收插件挂载、多图片/扫描 PDF、分页/局部放大、真实校验结果显示、返回修改和过期处理；真实建单应另在隔离测试库确认后执行，并按 `requestId` 核对重试结果。页面渲染测试不能证明模型识别结果一定准确，仍需要用户核对编码、用量和母子关系。
