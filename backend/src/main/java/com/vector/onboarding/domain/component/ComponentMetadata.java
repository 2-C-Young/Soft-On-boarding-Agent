package com.vector.onboarding.domain.component;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "component_metadata")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ComponentMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String componentName;

    @Column
    private String filePath;

    @Column(length = 1000)
    private String figmaUrl;

    @Column(length = 1000)
    private String storybookUrl;

    @Builder
    public ComponentMetadata(String componentName, String filePath, String figmaUrl, String storybookUrl) {
        this.componentName = componentName;
        this.filePath = filePath;
        this.figmaUrl = figmaUrl;
        this.storybookUrl = storybookUrl;
    }
}
