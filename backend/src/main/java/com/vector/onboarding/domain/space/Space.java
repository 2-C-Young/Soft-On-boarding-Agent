package com.vector.onboarding.domain.space;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "spaces")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Space {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String repoUrl;

    @Column(nullable = false, unique = true, length = 8)
    private String teamCode;

    /**
     * 스페이스를 생성한 유저의 ID (곧 최초 ADMIN)
     */
    @Column(nullable = false)
    private Long createdBy;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Space(String name, String repoUrl, String teamCode, Long createdBy) {
        this.name = name;
        this.repoUrl = repoUrl;
        this.teamCode = teamCode;
        this.createdBy = createdBy;
    }
}
