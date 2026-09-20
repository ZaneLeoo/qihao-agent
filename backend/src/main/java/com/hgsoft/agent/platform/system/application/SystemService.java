package com.hgsoft.agent.platform.system.application;

import com.hgsoft.agent.platform.system.domain.SystemStatus;
import java.time.OffsetDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 系统状态用例。
 *
 * <p>M0 阶段唯一的业务用例，用来验证 Web 层、分层与接口契约是否按规范落地。
 */
@Service
public class SystemService {

    private static final String BUILD_VERSION = "0.1.0-SNAPSHOT";

    private final String applicationName;

    /**
     * @param applicationName 应用名，由配置注入
     */
    public SystemService(@Value("${spring.application.name}") String applicationName) {
        this.applicationName = applicationName;
    }

    /**
     * 读取当前服务状态。
     *
     * @return 状态快照，时间使用系统默认时区（部署时由 JVM 参数固定为 Asia/Shanghai）
     */
    public SystemStatus currentStatus() {
        return new SystemStatus(applicationName, BUILD_VERSION, OffsetDateTime.now());
    }
}
