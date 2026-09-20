package com.hgsoft.agent.platform;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * 用可执行的断言守住分层约定。
 *
 * <p>文档没人看，测试红了必须改。新增模块时这些规则自动生效，不需要额外登记。
 */
@AnalyzeClasses(packages = "com.hgsoft.agent.platform")
class ArchitectureTest {

    /** 领域层只表达业务规则，不得依赖 Web 框架或持久化框架。 */
    @ArchTest
    static final ArchRule domainMustNotDependOnFrameworks = noClasses()
            .that()
            .resideInAPackage("..domain..")
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage("org.springframework.web..", "com.baomidou.mybatisplus..", "jakarta.servlet..");

    /** api 层是入口，不允许被领域层或基础设施层反向依赖。 */
    @ArchTest
    static final ArchRule apiMustNotBeDependedOnByInnerLayers = noClasses()
            .that()
            .resideInAnyPackage("..domain..", "..infrastructure..")
            .should()
            .dependOnClassesThat()
            .resideInAPackage("..api..");
}
