package com.vector.onboarding.domain.component;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/components")
@RequiredArgsConstructor
public class ComponentMetadataController {

    private final ComponentMetadataRepository componentMetadataRepository;

    /**
     * 특정 컴포넌트의 Figma / Storybook 연동 정보를 반환합니다.
     * GET /api/components/{componentName}/interface
     */
    @GetMapping("/{componentName}/interface")
    public ResponseEntity<ComponentInterfaceResponse> getComponentInterface(
            @PathVariable String componentName) {

        return componentMetadataRepository.findByComponentName(componentName)
                .map(meta -> ResponseEntity.ok(ComponentInterfaceResponse.from(meta)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 전체 컴포넌트 메타데이터 목록을 반환합니다.
     * GET /api/components
     */
    @GetMapping
    public ResponseEntity<List<ComponentInterfaceResponse>> getAllComponents() {
        List<ComponentInterfaceResponse> result = componentMetadataRepository.findAll()
                .stream()
                .map(ComponentInterfaceResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Python 파이프라인에서 분석한 컴포넌트 메타데이터를 일괄 저장(Upsert)합니다.
     * POST /api/components/sync
     * Body: [{ "componentName": "...", "filePath": "...", "figmaUrl": "...", "storybookUrl": "..." }]
     */
    @PostMapping("/sync")
    public ResponseEntity<Void> syncComponents(
            @RequestBody List<ComponentSyncRequest> requests) {

        for (ComponentSyncRequest req : requests) {
            componentMetadataRepository.findByComponentName(req.componentName())
                    .ifPresentOrElse(
                            existing -> {
                                // 이미 존재하면 아무것도 하지 않음 (필요 시 update 로직 추가 가능)
                            },
                            () -> componentMetadataRepository.save(
                                    ComponentMetadata.builder()
                                            .componentName(req.componentName())
                                            .filePath(req.filePath())
                                            .figmaUrl(req.figmaUrl())
                                            .storybookUrl(req.storybookUrl())
                                            .build()
                            )
                    );
        }
        return ResponseEntity.ok().build();
    }

    record ComponentSyncRequest(
            String componentName,
            String filePath,
            String figmaUrl,
            String storybookUrl
    ) {}
}
