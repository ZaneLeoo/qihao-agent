package com.hgsoft.agent.platform.system.api;

import com.hgsoft.agent.platform.system.application.SystemService;
import com.hgsoft.agent.platform.system.domain.SystemStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 系统状态接口。
 *
 * <p>成功响应直接返回资源，不套 {@code {code,message,data}} 信封；失败响应由
 * RFC 9457 Problem Details 统一表达。
 */
@RestController
@RequestMapping("/api/v1/system")
@Tag(name = "系统", description = "服务状态与版本")
public class SystemController {

    private final SystemService systemService;

    /**
     * @param systemService 系统状态用例
     */
    public SystemController(SystemService systemService) {
        this.systemService = systemService;
    }

    /**
     * 返回服务当前状态。
     *
     * @return 状态快照
     */
    @GetMapping("/status")
    @Operation(summary = "服务状态", description = "返回应用名、版本与服务器当前时间")
    public SystemStatus status() {
        return systemService.currentStatus();
    }
}
