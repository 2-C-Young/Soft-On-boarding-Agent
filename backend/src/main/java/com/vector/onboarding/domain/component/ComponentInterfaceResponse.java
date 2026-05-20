package com.vector.onboarding.domain.component;

public record ComponentInterfaceResponse(
    String componentName,
    String filePath,
    String figmaUrl,
    String storybookUrl
) {
    public static ComponentInterfaceResponse from(ComponentMetadata entity) {
        return new ComponentInterfaceResponse(
            entity.getComponentName(),
            entity.getFilePath(),
            entity.getFigmaUrl(),
            entity.getStorybookUrl()
        );
    }
}
