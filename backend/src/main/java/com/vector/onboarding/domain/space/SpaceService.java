package com.vector.onboarding.domain.space;

import com.vector.onboarding.domain.space.dto.CreateSpaceRequestDto;
import com.vector.onboarding.domain.space.dto.CreateSpaceResponseDto;
import com.vector.onboarding.domain.user.User;
import com.vector.onboarding.domain.user.UserRepository;
import com.vector.onboarding.global.exception.SpaceNotFoundException;
import com.vector.onboarding.infrastructure.github.GithubAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SpaceService {

    private final SpaceRepository spaceRepository;
    private final SpaceMemberRepository spaceMemberRepository;
    private final UserRepository userRepository;
    private final GithubAnalysisService githubAnalysisService;

    private static final int TEAM_CODE_LENGTH = 8;
    private static final String TEAM_CODE_CHARS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * 팀 스페이스를 생성합니다.
     * 생성자는 자동으로 ADMIN 역할의 SpaceMember로 등록됩니다.
     * GitHub 분석은 사용자 응답을 블로킹하지 않도록 비동기로 실행됩니다.
     */
    public CreateSpaceResponseDto createSpace(Long userId, CreateSpaceRequestDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        String teamCode = generateUniqueTeamCode();

        Space space = Space.builder()
                .name(dto.getName())
                .repoUrl(dto.getRepoUrl())
                .teamCode(teamCode)
                .createdBy(userId)
                .build();
        Space savedSpace = spaceRepository.save(space);

        // 생성자를 ADMIN으로 SpaceMember에 등록
        SpaceMember adminMember = SpaceMember.builder()
                .spaceId(savedSpace.getId())
                .userId(userId)
                .memberRole(SpaceMemberRole.ADMIN)
                .build();
        spaceMemberRepository.save(adminMember);

        // User의 소속 teamCode 업데이트
        user.updateTeamCode(teamCode);
        userRepository.save(user);

        // [팀원 연동부] GitHub 레포지토리 분석 - 비동기 실행 (응답 블로킹 없음)
        githubAnalysisService.analyzeAndSaveProjectStructure(savedSpace.getId(), dto.getRepoUrl());
        log.info("Space 생성 완료. spaceId={}, teamCode={}, 분석 비동기 시작", savedSpace.getId(), teamCode);

        return new CreateSpaceResponseDto(savedSpace.getId(), teamCode);
    }

    /**
     * teamCode를 통해 팀 스페이스에 참여합니다.
     * 존재하지 않는 코드일 경우 {@link SpaceNotFoundException}을 던집니다.
     */
    public void joinSpace(Long userId, String teamCode) {
        Space space = spaceRepository.findByTeamCode(teamCode)
                .orElseThrow(() -> new SpaceNotFoundException(teamCode));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        if (spaceMemberRepository.existsBySpaceIdAndUserId(space.getId(), userId)) {
            throw new IllegalArgumentException("이미 참여한 팀 스페이스입니다.");
        }

        // MEMBER 역할로 SpaceMember 등록
        SpaceMember member = SpaceMember.builder()
                .spaceId(space.getId())
                .userId(userId)
                .memberRole(SpaceMemberRole.MEMBER)
                .build();
        spaceMemberRepository.save(member);

        // User의 소속 teamCode 업데이트
        user.updateTeamCode(teamCode);
        userRepository.save(user);

        log.info("Space 참여 완료. userId={}, spaceId={}, teamCode={}", userId, space.getId(), teamCode);
    }

    /**
     * DB에 존재하지 않는 고유한 8자리 팀 코드를 생성합니다.
     * 패키지 수준 접근자(package-private)로 선언하여 단위 테스트에서 직접 검증 가능하게 합니다.
     */
    String generateUniqueTeamCode() {
        String code;
        do {
            code = generateRandomCode();
        } while (spaceRepository.existsByTeamCode(code));
        return code;
    }

    private String generateRandomCode() {
        StringBuilder sb = new StringBuilder(TEAM_CODE_LENGTH);
        for (int i = 0; i < TEAM_CODE_LENGTH; i++) {
            sb.append(TEAM_CODE_CHARS.charAt(RANDOM.nextInt(TEAM_CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
