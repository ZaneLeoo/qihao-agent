package com.hgsoft.agent.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 企业 Agent 平台后端的启动类。
 *
 * <p>本服务同时承担三个角色：面向用户的门户（登录 + 反向代理到各自的 dsh 实例）、
 * 面向管理员的控制面（组织、人员、智能体、授权），以及不对外暴露的运行时编排
 * （进程池、能力物化、空闲回收）。三者在代码中按功能模块分开，不按技术分层平铺。
 */
@SpringBootApplication
public class AgentPlatformApplication {

    /**
     * 应用入口。
     *
     * @param args 命令行参数
     */
    public static void main(String[] args) {
        SpringApplication.run(AgentPlatformApplication.class, args);
    }
}
