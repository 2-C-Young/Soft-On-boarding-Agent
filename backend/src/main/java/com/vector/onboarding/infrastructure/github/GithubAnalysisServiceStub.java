package com.vector.onboarding.infrastructure.github;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Paths;

/**
 * GithubAnalysisService의 임시 Stub 구현체.
 * 팀원의 실제 구현이 완료되면 이 클래스를 제거하거나 @Primary를 제거합니다.
 */
@Slf4j
@Service
@Primary
public class GithubAnalysisServiceStub implements GithubAnalysisService {

    @Override
    public void analyzeAndSaveProjectStructure(Long spaceId, String repoUrl) {
        log.info("[GithubAnalysisService STUB] 동기(Synchronous) 분석 호출됨 - spaceId: {}, repoUrl: {}", spaceId, repoUrl);

        try {
            // 프로젝트 루트 기준 LLM-Pipeline 경로 설정 (백엔드 실행 위치에 따라 다를 수 있음)
            // 보통 backend 디렉토리에서 실행되므로 상위 디렉토리의 LLM-Pipeline을 가리키도록 설정
            String userDir = System.getProperty("user.dir");
            File pipelineDir = Paths.get(userDir, "..", "LLM-Pipeline").normalize().toFile();
            
            if (!pipelineDir.exists()) {
                log.error("LLM-Pipeline 디렉토리를 찾을 수 없습니다: {}", pipelineDir.getAbsolutePath());
                return;
            }

            // python 명령어 (OS에 따라 다를 수 있음, windows는 보통 python 또는 py)
            String pythonCmd = "python";
            
            ProcessBuilder pb = new ProcessBuilder(
                    pythonCmd,
                    "SOA_LLM_Model.py",
                    repoUrl,
                    String.valueOf(spaceId)
            );
            pb.directory(pipelineDir);
            pb.redirectErrorStream(true); // stderr를 stdout으로 병합

            log.info("파이썬 프로세스 시작: {} SOA_LLM_Model.py {} {}", pythonCmd, repoUrl, spaceId);
            Process process = pb.start();

            // 파이썬 스크립트의 로그 출력 읽기
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("[LLM-Pipeline] {}", line);
                }
            }

            int exitCode = process.waitFor();
            if (exitCode == 0) {
                log.info("[GithubAnalysisService] 파이썬 파이프라인 정상 종료. exitCode: {}", exitCode);
            } else {
                log.error("[GithubAnalysisService] 파이썬 파이프라인 비정상 종료. exitCode: {}", exitCode);
            }

        } catch (Exception e) {
            log.error("[GithubAnalysisService] 파이썬 프로세스 실행 중 오류 발생", e);
        }
    }
}
