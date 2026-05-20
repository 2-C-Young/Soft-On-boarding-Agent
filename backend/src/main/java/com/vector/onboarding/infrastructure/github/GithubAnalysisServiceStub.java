package com.vector.onboarding.infrastructure.github;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * GithubAnalysisService의 임시 Stub 구현체.
 * 팀원의 실제 구현이 완료되면 이 클래스를 제거하거나 @Primary를 제거합니다.
 */
@Slf4j
@Service
@Primary
public class GithubAnalysisServiceStub implements GithubAnalysisService {

    @Async("githubAnalysisExecutor")
    @Override
    public void analyzeAndSaveProjectStructure(Long spaceId, String repoUrl) {
        // TODO: 팀원 구현 대기 - GitHub 레포지토리 트리 추출 및 AI 분류 파이프라인 연동
        log.info("[GithubAnalysisService STUB] 비동기 분석 호출됨 - spaceId: {}, repoUrl: {}", spaceId, repoUrl);
    }
}
