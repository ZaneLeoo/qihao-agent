---
name: purchase-in-stock-create
description: 用户根据到货标签、到货单照片、二维码/条码、XLSX、DOCX、文本型 PDF 或文字办理采购入库时使用。先校验到货来源和数量，展示服务端补齐的数据并取得确认后创建未审核单据。不用于查询、审核、弃审或其他类型入库。
whenToUse: 用户提供到货资料并要求创建采购入库单时。
user-invocable: true
---

# 采购入库单新增

先加载 `business-multimodal-input`，再按本技能处理到货资料。创建结果是**未审核**采购入库单。

## 工具

- `mcp__mom__validate_purchase_in_stock_create`：校验来源、明细和可入库数量。
- `mcp__mom__create_purchase_in_stock`：创建未审核采购入库单。

工具密钥和用户上下文由宿主注入。不得要求用户提供、展示或修改它们。

## 必要信息

每条明细必须提供来源单 `sourceDocumentId` 或 `sourceDocumentCode`，以及以下任一定位方式：`sourceLineId` / `sourceLineNo`，或 `inventoryCode`。

`quantity` 可省略，服务端会取该来源行的全部剩余可入库数量；指定时必须大于 0。`warehouseCode` 可省略，服务端从来源行补齐。货位、批号、生产日期、失效日期、日期和备注按需传入。

仓库启用了货位管理时必须逐行提供属于该仓库的 `goodsAllocationCode`；未启用时服务端会忽略货位。演示用的 `J`（包材仓）启用了货位管理，入这个仓必须逐行给货位。

不要把资料中的名称、规格、单位、供应商、价格、税率、仓库名称、货位名称或累计入库量当作可直接写入的数据；服务端以来源单和主数据为准。采购订单号不能替代采购到货单号。

## 执行顺序

1. 整理并复述资料中的到货单、行号或物料编码、数量、仓库和批次候选。缺少来源单，或既没有行定位也没有物料编码时，才立即追问。
2. 生成一个 `requestId`，用于同一意图的校验、修正、创建和网络失败重试。
3. 调用 `validate_purchase_in_stock_create`。`valid=false` 时解释 `issues`，收集修正后沿用同一 `requestId` 重校验，禁止创建。
4. `valid=true` 时展示服务端确定的来源行、物料、数量、仓库、货位及批次日期。默认“全部剩余数量”也必须展示。
5. 用户明确确认后，用最后一次成功校验相同的原始参数调用 `create_purchase_in_stock`；不得回传整个 `normalizedData`。
6. 成功时展示单据号和未审核状态。`duplicated=true` 表示该请求已处理。随后按「上架入口」给出链接，并提醒用户审核。

## 上架入口

入库单创建成功后**主动**给出一条可点击链接，不要等用户开口：

```
https://www.yy9cloud.com/#/dispatchTaskAGV?warehouseCode=<仓库编码>&goodsAllocationCode=<本单货位编码>
```

- 两个参数都取自本单真实字段：`warehouseCode` 用单据的仓库编码，`goodsAllocationCode` 用明细里写进去的货位编码。不得编造，也不要填单据号、物料编码或行号。
- 域名是 MOM 前端地址，换部署环境时同步修改这一行。
- 话术固定为「点击后在右侧边栏打开 AGV 上架页，AGV 会走到该货位」。**不得**声称已经完成上架，也不得说货已经放好——上架动作在 MOM 页面里完成。
- 只有货位档案里配了排/列的仓库能打开这个页面（当前只有 `J` 包材仓）。仓库不满足时不给链接，改为提示用户到 MOM 手工上架。

## 禁止事项

- 编造来源单、来源行、物料编码、数量、仓库、货位、批号、日期或 `requestId`。
- 在校验失败、缺少到货来源或最终数据未确认时创建。
- 以二维码/条码图片猜测编码；需要精确值时遵循公共技能的桥接流程。
