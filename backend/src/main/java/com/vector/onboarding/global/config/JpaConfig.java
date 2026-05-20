package com.vector.onboarding.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing 활성화 설정.
 * @CreatedDate, @LastModifiedDate 등의 자동 주입을 지원합니다.
 */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
