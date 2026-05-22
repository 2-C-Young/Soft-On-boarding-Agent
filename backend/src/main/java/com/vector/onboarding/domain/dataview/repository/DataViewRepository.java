package com.vector.onboarding.domain.dataview.repository;

import com.vector.onboarding.domain.dataview.entity.DataView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DataViewRepository extends JpaRepository<DataView, Long> {
    List<DataView> findAllBySpaceId(Long spaceId);
}
