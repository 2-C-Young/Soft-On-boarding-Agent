package com.vector.onboarding.infrastructure.github;

/**
 * GitHub 레포지토리 분석 서비스 인터페이스.
 * 팀원이 별도로 개발 중이며, 현재는 {@link GithubAnalysisServiceStub}이 주입됩니다.
 */
public interface GithubAnalysisService {

    /**
     * 주어진 레포지토리를 분석하여 프로젝트 구조를 저장합니다.
     * 시간이 오래 걸리는 작업이므로 비동기(@Async)로 실행됩니다.
     *
     * @param spaceId 분석 결과를 귀속시킬 스페이스 ID
     * @param repoUrl 분석 대상 GitHub 레포지토리 주소
     */
    void analyzeAndSaveProjectStructure(Long spaceId, String repoUrl);
}
