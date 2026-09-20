package com.hgsoft.agent.platform.system.domain;

import java.time.OffsetDateTime;

/**
 * 服务自身的状态快照，用于存活探针与版本确认。
 *
 * @param name    应用名
 * @param version 构建版本
 * @param time    生成时刻（带时区偏移，避免部署到 UTC 服务器时产生歧义）
 */
public record SystemStatus(String name, String version, OffsetDateTime time) {}
