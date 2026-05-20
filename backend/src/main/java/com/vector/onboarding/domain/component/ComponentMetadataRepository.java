package com.vector.onboarding.domain.component;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ComponentMetadataRepository extends JpaRepository<ComponentMetadata, Long> {
    Optional<ComponentMetadata> findByComponentName(String componentName);
}
