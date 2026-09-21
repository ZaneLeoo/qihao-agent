---
name: purchase-order-create
description: 用户根据采购清单、商品照片、二维码/条码、XLSX、DOCX、文本型 PDF 或文字要求向供应商下采购订单时使用。可先为缺失商品建档，但商品建档与采购订单必须分别校验和确认。不用于采购入库、审核、弃审或修改已有采购订单。
whenToUse: 用户要求创建采购订单、按采购清单下单或先建采购商品档案后下单时。
user-invocable: true
---

# 采购订单新增

先加载 `business-multimodal-input`，再按本技能处理采购资料。创建结果始终是**未审核**采购订单。

## 工具

- `mcp__mom__query_inventory_master`：查询已有采购商品。
- `mcp__mom__query_inventory_classification`、`mcp__mom__query_measurement_unit`：缺失商品建档时选择真实分类和单位。
- `mcp__mom__validate_inventory_master_create`、`mcp__mom__create_inventory_master`：校验并创建采购用途商品档案。
- `mcp__mom__query_vendor_master`：查询采购供应商。
- `mcp__mom__query_vendor_quotation`：按物料查询可报价供应商、含税单价与推荐供应商。
- `mcp__mom__validate_purchase_order_create`、`mcp__mom__create_purchase_order`：校验并创建采购订单。

工具密钥和用户上下文由宿主注入。不得要求用户提供、展示或修改它们。

## 商品与供应商

1. 从资料提取适合查询的短名称、规格或精确解码的编码，调用 `query_inventory_master`，限定 `isPurchase=yes`、`isEnd=no`。多个候选时展示编码、名称、规格、单位并让用户选择；唯一候选也要求确认。
2. 无合适商品时，才进入建档。清晰可见或用户明确提供的信息可作为名称、通用名和规格候选；不得从图片或文档猜价格、分类编码、单位编码。
3. 建档时查询末级分类和主计量单位，使用接口返回的编码；用独立 `requestId` 调用 `validate_inventory_master_create`。通过后展示服务端规范化结果、默认控制项和警告，取得**建档确认**才调用 `create_inventory_master`。
4. 资料里直接写明了供应商时，调用 `query_vendor_master`，限定 `purchaseSupplyType=yes`、`isEnd=no`，使用用户确认的供应商编码；没有指定供应商时走下面的报价环节挑选。

## 供应商报价与推荐

物料确认后、进入校验前，调用 `query_vendor_quotation`，`lines` **一次传入本单全部物料**，这样服务端才能判断能否由一家供应商供货：

- 数量已知就填 `quantity`。平价报价（单个「下限 1、上限留空」的阶梯）不需要数量；分档报价没有数量就没有可比单价。数量缺失时先向用户确认数量，不得用单价合计冒充金额合计。
- 展示候选时逐条给出供应商、含税单价、币种、数量下限、报价有效期，并原样说明服务端的 `recommendation.reason`。推荐口径是「能覆盖全部物料的单一供应商、合计含税金额最低」。
- 没有推荐时必须说明 `recommendationUnavailableReason`：无人完整覆盖、币种不一致，还是报价低于数量下限；然后让用户决定，不得自行拼单。
- 单价只认 `effectiveTaxPrice`。`taxPrice`、`price` 是已废弃的历史字段，不得作为报价展示或下单依据；`effectivePriceSource` 为 `legacyTaxPrice`、`legacyPrice` 时提示用户核对，为 `unmatched` 时说明该数量没有对应报价。

## 校验与创建

- 一个采购订单只对应一个已确认供应商。推荐供应商不能覆盖全部物料、或明细归属不清时，先分组展示并让用户选择要创建的订单草稿，必要时拆成多张单。
- 每条明细必须有真实 `inventoryCode`、大于 0 的 `quantity`，以及用户明确确认的含税单价（取自 `query_vendor_quotation` 的 `effectiveTaxPrice`，或用户直接给出）。文档、图片、历史成本和参考价都不能自动成为含税采购单价。
- 为采购订单生成不同于建档的 `requestId`。调用 `validate_purchase_order_create`；失败时逐项说明问题并用同一 `requestId` 重校验，禁止创建。
- 校验通过后展示供应商、订单日期、每行商品编码和名称、规格、单位、数量、含税单价、税率、含税金额及备注。必须取得**采购订单确认**，才用最后一次成功校验的原始参数调用 `create_purchase_order`。
- `duplicated=true` 只说明该请求已经处理，不声称重复创建。成功时展示订单号与“未审核”状态。

## 禁止事项

- 不查询商品、分类、单位或供应商就编造系统编码。
- 用一次确认同时创建商品档案和采购订单。
- 用废弃的 `taxPrice`、`price` 字段或参考价代替报价单价建单。
- 数量未知时按分档报价的单价直接建单。
- 在校验失败、金额未确认或字段来源不明确时创建订单。
