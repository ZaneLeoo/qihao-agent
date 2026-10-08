---
name: purchase-order-create
description: 用户根据采购清单、商品照片、二维码/条码、XLSX、DOCX、文本型 PDF 或文字要求向供应商下采购订单时使用。先查询真实供应商和存货，再校验、确认并创建未审核采购订单；缺失商品档案时先停下来补齐档案。不用于采购入库、审核、弃审或修改已有采购订单。
whenToUse: 用户要求创建采购订单、按采购清单下单或先建采购商品档案后下单时。
user-invocable: true
---

# 采购订单新增

先加载 `business-multimodal-input`，再按本技能处理采购资料。创建结果始终是**未审核**采购订单。

## 工具

- `mcp__mom__query_inventory_master_v2`：查询已有采购商品。
- `mcp__mom__query_inventory_classification_v2`：需要建议分类时查询真实分类。
- `mcp__mom__query_vendor_master_v2`：查询采购供应商。
- `mcp__mom__validate_purchase_order_create_v2`：校验订单并取得十分钟有效的 `validationId`。
- `mcp__mom__create_purchase_order_v2`：用户确认后仅凭 `validationId` 创建订单。
- `mcp__mom__query_purchase_write_result_v2`：创建响应不明时按 `requestId` 查询结果。

工具密钥和用户上下文由宿主注入。不得要求用户提供、展示或修改它们。

## 商品与供应商

1. 从资料提取适合查询的短名称、规格或精确解码的编码，调用 `query_inventory_master_v2`，限定 `isPurchase=yes`、`isEnd=no`。多个候选时展示编码、名称、规格、单位并让用户选择；唯一候选也要求确认。查询结果是全公司档案，能查到不代表当前组织能用；以订单校验结果为准。
2. 无合适商品时，才进入建档。清晰可见或用户明确提供的信息可作为名称、通用名和规格候选；不得从图片或文档猜价格、分类编码、单位编码。
3. 当前 MCP2 没有存货建档工具。找不到合适商品时，告知用户需要先建档或选择已有档案，不要调用未发现的旧 MCP 工具。
4. 资料里直接写明了供应商时，调用 `query_vendor_master_v2`，限定 `purchaseSupplyType=yes`、`isEnd=no`，使用用户确认的供应商编码；没有指定供应商时展示实际查询到的候选并让用户选择。

## 价格

当前 MCP2 没有供应商报价查询工具。含税采购单价由用户明确提供并确认；存货档案参考价、图片和历史成本不能自动当作本次采购单价。不要调用未发现的 `query_vendor_quotation`。

## 校验与创建

- 一个采购订单只对应一个已确认供应商。明细归属不清时，先分组展示并让用户选择，必要时拆成多张单。
- 每条明细必须有真实 `inventoryCode`、大于 0 的 `quantity`，以及用户明确确认的含税单价。文档、图片、历史成本和参考价都不能自动成为含税采购单价。
- 为采购订单生成独立的 UUID `requestId`。调用 `validate_purchase_order_create_v2`；失败时逐项说明 `issues`，用同一 `requestId` 修正并重校验，禁止创建。若返回 `INVENTORY_NOT_IN_ORGANIZATION`，说明当前组织没有该存货档案，不能换工具强行建单。
- 校验通过后展示服务端 `normalizedData` 中的供应商、组织、订单日期、每行商品编码和名称、规格、单位、数量、含税单价、税率、含税金额及备注。必须取得**采购订单确认**，才调用 `create_purchase_order_v2`，且只传最后一次校验返回的 `validationId`，不传原订单参数。
- 创建成功时展示订单号与“未审核”状态。创建超时、返回 `RESULT_UNKNOWN` 或响应丢失时，用原 `requestId` 调用 `query_purchase_write_result_v2`。`CREATED` 才能确认建单；`NOT_FOUND` 只表示当前没有已提交结果，不能断言绝不会稍后落单，也不要擅自换 `requestId`。`UNKNOWN` 时停止自动重试并提示人工核对。

## 禁止事项

- 不查询商品、分类、单位或供应商就编造系统编码。
- 用一次确认同时创建商品档案和采购订单。
- 用存货档案参考价代替用户确认的含税采购单价建单。
- 在校验失败、金额未确认或字段来源不明确时创建订单。
