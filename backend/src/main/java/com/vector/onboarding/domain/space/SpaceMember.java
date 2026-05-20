package com.vector.onboarding.domain.space;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 팀 스페이스 멤버 매핑 테이블.
 * 추후 역할 변경, 멤버 추방 등 멤버 관리 기능의 기반이 됩니다.
 */
@Entity
@Table(
    name = "space_members",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_space_members_space_user",
        columnNames = {"space_id", "user_id"}
    )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class SpaceMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "space_id", nullable = false)
    private Long spaceId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SpaceMemberRole memberRole;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Builder
    public SpaceMember(Long spaceId, Long userId, SpaceMemberRole memberRole) {
        this.spaceId = spaceId;
        this.userId = userId;
        this.memberRole = memberRole;
    }

    /**
     * 추후 멤버 역할 변경 시 사용
     */
    public void changeRole(SpaceMemberRole newRole) {
        this.memberRole = newRole;
    }
}
