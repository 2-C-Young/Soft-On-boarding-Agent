package com.vector.onboarding.domain.dataview.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataViewPreCacheListener {

    private final DataViewService dataViewService;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("애플리케이션 구동 완료: 미분석 데이터에 대해 비동기 사전 캐싱(Pre-caching)을 트리거합니다.");
        try {
            dataViewService.preloadAndCacheAllSpacesAsync();
        } catch (Exception e) {
            log.error("애플리케이션 구동 시 사전 캐싱 트리거 실패", e);
        }
    }
}
