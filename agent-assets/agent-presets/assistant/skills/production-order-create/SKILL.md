---
name: production-order-create
description: 用户根据生产任务单照片、二维码/条码、XLSX、DOCX、文本型 PDF 或文字要求开生产订单时使用。选择已存在的自制商品，校验并展示服务端带出的工艺路线和物料清单后创建未提交订单。不用于采购、入库、派工、排产、审核或修改已有生产订单。
whenToUse: 用户要求开生产订单、下生产单或安排生产时。
user-invocable: true
---

# 生产订单新增

先加载 `business-multimodal-input`，再按本技能处理生产资料。创建结果是**未提交**生产订单。

## 工具

- `mcp__mom__query_inventory_master`：把资料中的产品名称或精确编码映射到真实自制商品。
- `mcp__mom__validate_production_order_create`：校验生产订单并补齐服务端数据。
- `mcp__mom__create_production_order`：创建未提交生产订单。

工具密钥和用户上下文由宿主注入。不得要求用户提供、展示或修改它们。

## 必要信息

每行必须有真实 `inventoryCode`、大于 0 的 `productionQuantity`、`startDate` 和 `endDate`。用户用“下周一”“月底”等相对日期时，换算为 `YYYY-MM-DD` 并在草稿中写明结果。

组织、部门、单据号、生产批号、行号、订单类别、全阶/单阶、产品名称规格单位、工艺路线、BOM 和领料子件由服务端带出。用户只在明确指定时提供 `productionProcessRouteCode`、`bomId`、`projectCode` 或 `remark`。

## 执行顺序

1. 调用 `query_inventory_master`，以名称查询并限定 `materialAttribute=manufacture`。多个候选时展示编码、名称、规格和单位；唯一候选也要确认。查不到时请用户核对，不得建档或猜编码。
2. 为本次意图生成 `requestId`。用它调用 `validate_production_order_create`；修正后的重校验、创建和网络失败重试复用该值。
3. `valid=false` 时逐项说明 `issues`，禁止创建。`valid=true` 时展示服务端规范化后的产品、数量、日期、工艺路线、BOM、领料子件、组织、部门及警告。
4. 用户明确确认后，以最后一次成功校验相同的原始参数调用 `create_production_order`，不得把 `normalizedData` 整体回传。
5. 成功时展示生产订单号和未提交状态；`duplicated=true` 表示该请求已处理。

## 禁止事项

- 根据图片、文档或二维码内容编造自制商品编码、BOM、工艺路线或日期。
- 在校验失败、产品未确认或最终草稿未确认时创建。
- 用一次确认执行多个写操作。
