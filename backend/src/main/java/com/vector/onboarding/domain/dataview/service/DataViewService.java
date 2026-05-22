package com.vector.onboarding.domain.dataview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vector.onboarding.domain.dataview.entity.DataView;
import com.vector.onboarding.domain.dataview.entity.SchemaAnalysisResult;
import com.vector.onboarding.domain.dataview.repository.DataViewRepository;
import com.vector.onboarding.domain.dataview.repository.SchemaAnalysisResultRepository;
import com.vector.onboarding.domain.space.Space;
import com.vector.onboarding.domain.space.SpaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataViewService {

    private final DataViewRepository dataViewRepository;
    private final SchemaAnalysisResultRepository schemaAnalysisResultRepository;
    private final GithubFileFetchService githubFileFetchService;
    private final SchemaParserService schemaParserService;
    private final SpaceRepository spaceRepository;
    private final ObjectMapper objectMapper;

    /**
     * 특정 spaceId의 전체 데이터에 대한 스키마를 제공합니다.
     * 캐시가 존재하면 병합하여 반환하고, 미분석된 파일이 있는 경우 온디맨드로 분석해 캐싱을 업데이트한 후 병합합니다.
     */
    @Transactional
    public String getOrAnalyzeSchema(Long spaceId) {
        Space space = spaceRepository.findById(spaceId)
                .orElseThrow(() -> new IllegalArgumentException("스페이스를 찾을 수 없습니다."));
        String repositoryUrl = space.getRepoUrl();

        List<DataView> dataViews = dataViewRepository.findAllBySpaceId(spaceId);

        Set<String> uniqueFilePaths = new HashSet<>();

        for (DataView dataView : dataViews) {
            String filePath = dataView.getFilePath();
            if (filePath != null && !filePath.isEmpty()) {
                uniqueFilePaths.add(filePath);
            }
        }

        Set<String> entityFiles = getAllEntityFilesFromGithub(repositoryUrl);
        uniqueFilePaths.addAll(entityFiles);

        if (uniqueFilePaths.isEmpty()) {
            log.warn("DB에 분석 대상 파일(DataView)이 없습니다. spaceId: {}, repositoryUrl: {}", spaceId, repositoryUrl);
            return "{ \"nodes\": [], \"edges\": [] }";
        }

        // 각 파일별 캐시를 검사하고 미분석된 파일은 온디맨드로 즉시 파싱 (안전 장치)
        for (String filePath : uniqueFilePaths) {

            Optional<SchemaAnalysisResult> cached = schemaAnalysisResultRepository.findBySpaceIdAndFilePath(spaceId, filePath);
            boolean needsAnalysis = true;
            if (cached.isPresent()) {
                String cachedJson = cached.get().getAnalyzedJson();
                boolean isEmptyCache = cachedJson == null || cachedJson.trim().isEmpty();
                if (!isEmptyCache) {
                    needsAnalysis = false;
                }
            }

            if (needsAnalysis) {
                log.info("온디맨드 캐시 빌드: 미분석된 파일을 발견하여 즉시 파싱을 실행합니다. file: {}", filePath);
                try {
                    analyzeAndSaveSingleFile(spaceId, repositoryUrl, filePath);
                } catch (Exception e) {
                    log.error("온디맨드 파일 분석 실패 - filePath: " + filePath, e);
                }
            }
        }

        // 전체 레코드 다시 조회 후 병합
        List<SchemaAnalysisResult> results = schemaAnalysisResultRepository.findAllBySpaceId(spaceId);
        return mergeSchemaJsons(results);
    }

    /**
     * 특정 스페이스의 한 파일에 대해 단독으로 분석을 수행하고 DB에 캐싱합니다.
     */
    @Transactional
    public SchemaAnalysisResult analyzeAndSaveSingleFile(Long spaceId, String repositoryUrl, String filePath) {
        log.info("파일 개별 스키마 분석 시작 - spaceId: {}, filePath: {}", spaceId, filePath);
        String content = githubFileFetchService.fetchFileContent(repositoryUrl, filePath);
        String analyzedJson = schemaParserService.parseSchema(content);

        Optional<SchemaAnalysisResult> existing = schemaAnalysisResultRepository.findBySpaceIdAndFilePath(spaceId, filePath);
        String dummyCommitHash = "fetched-at-" + System.currentTimeMillis();

        SchemaAnalysisResult result;
        if (existing.isPresent()) {
            result = existing.get();
            result.updateAnalysis(dummyCommitHash, analyzedJson);
        } else {
            result = SchemaAnalysisResult.builder()
                    .spaceId(spaceId)
                    .filePath(filePath)
                    .repositoryUrl(repositoryUrl)
                    .commitHash(dummyCommitHash)
                    .analyzedJson(analyzedJson)
                    .build();
        }
        return schemaAnalysisResultRepository.save(result);
    }

    /**
     * 특정 스페이스에 대한 미분석 데이터들을 백그라운드 스레드에서 비동기 분석 및 사전 캐싱합니다.
     */
    @Async
    @Transactional
    public void preloadAndCacheForSpaceAsync(Long spaceId) {
        log.info("비동기 사전 캐싱 요청 수신 - spaceId: {}", spaceId);
        Optional<Space> spaceOpt = spaceRepository.findById(spaceId);
        if (spaceOpt.isEmpty()) {
            log.warn("비동기 사전 캐싱 실패: 스페이스 정보가 존재하지 않습니다. spaceId: {}", spaceId);
            return;
        }

        String repositoryUrl = spaceOpt.get().getRepoUrl();
        if (repositoryUrl == null || repositoryUrl.isEmpty()) {
            log.warn("비동기 사전 캐싱 실패: 스페이스의 레포지토리 URL이 없습니다. spaceId: {}", spaceId);
            return;
        }

        List<DataView> dataViews = dataViewRepository.findAllBySpaceId(spaceId);

        Set<String> uniqueFilePaths = new HashSet<>();

        for (DataView dataView : dataViews) {
            String filePath = dataView.getFilePath();
            if (filePath != null && !filePath.isEmpty()) {
                uniqueFilePaths.add(filePath);
            }
        }

        Set<String> entityFiles = getAllEntityFilesFromGithub(repositoryUrl);
        uniqueFilePaths.addAll(entityFiles);

        for (String filePath : uniqueFilePaths) {

            Optional<SchemaAnalysisResult> cached = schemaAnalysisResultRepository.findBySpaceIdAndFilePath(spaceId, filePath);
            boolean needsAnalysis = true;
            if (cached.isPresent()) {
                String cachedJson = cached.get().getAnalyzedJson();
                boolean isEmptyCache = cachedJson == null || cachedJson.trim().isEmpty();
                if (!isEmptyCache) {
                    needsAnalysis = false;
                }
            }

            if (needsAnalysis) {
                try {
                    analyzeAndSaveSingleFile(spaceId, repositoryUrl, filePath);
                    log.info("비동기 사전 캐싱 성공 - spaceId: {}, filePath: {}", spaceId, filePath);
                } catch (Exception e) {
                    log.error("비동기 사전 캐싱 실패 - spaceId: {}, filePath: {}, error: {}", spaceId, filePath, e.getMessage());
                }
            }
        }
    }

    /**
     * 전체 스페이스에 대해 미분석 파일이 존재하면 백그라운드 스레드에서 사전 캐싱합니다. (앱 구동 시 호출용)
     */
    @Async
    @Transactional
    public void preloadAndCacheAllSpacesAsync() {
        log.info("비동기 전체 스페이스 사전 캐싱을 수행합니다.");
        List<Space> spaces = spaceRepository.findAll();
        for (Space space : spaces) {
            try {
                preloadAndCacheForSpaceAsync(space.getId());
            } catch (Exception e) {
                log.error("스페이스 비동기 사전 캐싱 실패 - spaceId: " + space.getId(), e);
            }
        }
    }

    /**
     * 여러 SchemaAnalysisResult 레코드들의 개별 JSON을 읽어 하나의 { nodes, edges } 구조로 병합합니다.
     */
    @SuppressWarnings("unchecked")
    public String mergeSchemaJsons(List<SchemaAnalysisResult> results) {
        Map<String, Object> mergedNodes = new LinkedHashMap<>();
        Map<String, Object> mergedEdges = new LinkedHashMap<>();

        for (SchemaAnalysisResult result : results) {
            String json = result.getAnalyzedJson();
            if (json == null || json.trim().isEmpty()) continue;
            try {
                Map<String, Object> map = objectMapper.readValue(json, Map.class);
                List<Map<String, Object>> nodes = (List<Map<String, Object>>) map.get("nodes");
                List<Map<String, Object>> edges = (List<Map<String, Object>>) map.get("edges");

                if (nodes != null) {
                    for (Map<String, Object> node : nodes) {
                        String id = (String) node.get("id");
                        if (id != null) {
                            mergedNodes.put(id, node);
                        }
                    }
                }

                if (edges != null) {
                    for (Map<String, Object> edge : edges) {
                        String id = (String) edge.get("id");
                        if (id != null) {
                            mergedEdges.put(id, edge);
                        }
                    }
                }
            } catch (Exception e) {
                log.error("병합 도중 JSON 파싱 실패 - result id: " + result.getId(), e);
            }
        }

        Map<String, Object> finalResult = new HashMap<>();
        finalResult.put("nodes", new ArrayList<>(mergedNodes.values()));
        finalResult.put("edges", new ArrayList<>(mergedEdges.values()));

        try {
            return objectMapper.writeValueAsString(finalResult);
        } catch (Exception e) {
            log.error("병합 데이터 직렬화 실패", e);
            return "{ \"nodes\": [], \"edges\": [] }";
        }
    }

    /**
     * GitHub Git Tree API를 사용하여 레포지토리의 전체 파일 경로를 가져온 뒤,
     * 엔티티/도메인 또는 POJO 데이터 모델 파일들을 휴리스틱으로 찾아냅니다.
     */
    private Set<String> getAllEntityFilesFromGithub(String repositoryUrl) {
        Set<String> paths = new HashSet<>();
        try {
            String urlPath = repositoryUrl.replace("https://github.com/", "").replace(".git", "");
            String[] parts = urlPath.split("/");
            if (parts.length < 2) return paths;
            String owner = parts[0];
            String repo = parts[1];

            // 1. main 브랜치 시도, 실패 시 master 브랜치 시도
            JsonNode tree = null;
            try {
                tree = githubFileFetchService.fetchGitTree(owner, repo, "main");
            } catch(Exception e) {
                try {
                    tree = githubFileFetchService.fetchGitTree(owner, repo, "master");
                } catch(Exception e2) {
                    log.error("GitHub Tree fetch 실패 (main, master 모두 실패): {}/{}", owner, repo);
                    return paths;
                }
            }

            // 2. 도메인/엔티티/POJO 휴리스틱 필터링
            if (tree != null && tree.has("tree")) {
                for (JsonNode node : tree.get("tree")) {
                    String path = node.path("path").asText();
                    if (path == null) continue;
                    String lowerPath = path.toLowerCase();
                    String fileName = path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : path;
                    
                    if (path.endsWith(".sql") || path.endsWith(".prisma")) {
                        paths.add(path);
                    } else if (path.endsWith(".java")) {
                        // 명시적인 도메인 폴더에 있거나
                        if (lowerPath.contains("domain") || lowerPath.contains("entity") || lowerPath.contains("model") || lowerPath.contains("dto")) {
                            paths.add(path);
                        } 
                        // 이름이 대문자로 시작하면서 특정 키워드로 끝나지 않는 순수 객체(POJO) 형태일 경우
                        else if (fileName.length() > 0 && Character.isUpperCase(fileName.charAt(0))) {
                            if (!fileName.endsWith("Controller.java") &&
                                !fileName.endsWith("Service.java") &&
                                !fileName.endsWith("Repository.java") &&
                                !fileName.endsWith("Config.java") &&
                                !fileName.endsWith("Configuration.java") &&
                                !fileName.endsWith("Application.java") &&
                                !fileName.endsWith("Exception.java") &&
                                !fileName.endsWith("Filter.java") &&
                                !fileName.endsWith("Interceptor.java")) {
                                paths.add(path);
                            }
                        }
                    }
                }
            }
            log.info("Github API에서 찾은 추가 POJO/도메인 파일 개수: {}", paths.size());
        } catch (Exception e) {
            log.error("GitHub Tree fetch 중 에러 발생", e);
        }
        return paths;
    }
}

