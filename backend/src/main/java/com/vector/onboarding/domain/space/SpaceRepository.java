package com.vector.onboarding.domain.space;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpaceRepository extends JpaRepository<Space, Long> {

    Optional<Space> findByTeamCode(String teamCode);

    boolean existsByTeamCode(String teamCode);
}
