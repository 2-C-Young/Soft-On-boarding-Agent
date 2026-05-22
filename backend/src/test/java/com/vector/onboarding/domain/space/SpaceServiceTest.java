package com.vector.onboarding.domain.space;

import com.vector.onboarding.domain.space.dto.CreateSpaceRequestDto;
import com.vector.onboarding.domain.space.dto.CreateSpaceResponseDto;
import com.vector.onboarding.domain.space.dto.JoinSpaceRequestDto;
import com.vector.onboarding.domain.user.Role;
import com.vector.onboarding.domain.user.User;
import com.vector.onboarding.domain.user.UserRepository;
import com.vector.onboarding.global.exception.SpaceNotFoundException;
import com.vector.onboarding.infrastructure.github.GithubAnalysisService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SpaceServiceTest {

    @Mock
    private SpaceRepository spaceRepository;

    @Mock
    private SpaceMemberRepository spaceMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GithubAnalysisService githubAnalysisService;

    @InjectMocks
    private SpaceService spaceService;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .githubId("test-github-id")
                .username("testuser")
                .email("test@test.com")
                .profileImageUrl("http://example.com/avatar.png")
                .githubAccessToken("test-token")
                .role(Role.USER)
                .build();
    }

    // =====================================================================
    // createSpace 테스트
    // =====================================================================

    @Test
    @DisplayName("팀 스페이스 생성 성공 - Space, SpaceMember, User 저장 및 분석 서비스 호출")
    void createSpace_성공() {
        // given
        Long userId = 1L;
        CreateSpaceRequestDto dto = new CreateSpaceRequestDto("My Team", "https://github.com/test/repo", "DEVELOPER");

        Space savedSpace = Space.builder()
                .name("My Team")
                .repoUrl("https://github.com/test/repo")
                .teamCode("ABCD1234")
                .createdBy(userId)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(spaceRepository.existsByTeamCode(anyString())).thenReturn(false);
        when(spaceRepository.save(any(Space.class))).thenReturn(savedSpace);
        when(spaceMemberRepository.save(any(SpaceMember.class))).thenReturn(mock(SpaceMember.class));
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        // when
        CreateSpaceResponseDto result = spaceService.createSpace(userId, dto);

        // then
        assertNotNull(result);
        assertNotNull(result.getTeamCode());
        verify(spaceRepository).save(any(Space.class));
        verify(spaceMemberRepository).save(argThat(member ->
                member.getMemberRole() == SpaceMemberRole.ADMIN
        ));
        verify(userRepository).save(any(User.class));
        verify(githubAnalysisService).analyzeAndSaveProjectStructure(any(), eq("https://github.com/test/repo"));
    }

    @Test
    @DisplayName("teamCode 중복 시 재시도하여 성공")
    void createSpace_teamCode중복재시도() {
        // given
        Long userId = 1L;
        CreateSpaceRequestDto dto = new CreateSpaceRequestDto("My Team", "https://github.com/test/repo", "DEVELOPER");

        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        // 첫 번째 코드는 중복, 두 번째부터 성공
        when(spaceRepository.existsByTeamCode(anyString()))
                .thenReturn(true)
                .thenReturn(false);
        when(spaceRepository.save(any(Space.class))).thenReturn(mock(Space.class));
        when(spaceMemberRepository.save(any(SpaceMember.class))).thenReturn(mock(SpaceMember.class));
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        // when
        spaceService.createSpace(userId, dto);

        // then: existsByTeamCode가 2번 호출되어야 함 (1번 중복 + 1번 성공)
        verify(spaceRepository, times(2)).existsByTeamCode(anyString());
    }

    @Test
    @DisplayName("생성된 팀 코드는 8자리 alphanumeric 이어야 한다")
    void generateUniqueTeamCode_8자리알파뉴메릭형식검증() {
        // given
        when(spaceRepository.existsByTeamCode(anyString())).thenReturn(false);

        // when
        String code = spaceService.generateUniqueTeamCode();

        // then
        assertNotNull(code);
        assertEquals(8, code.length());
        assertTrue(code.matches("[A-Za-z0-9]{8}"),
                "팀 코드는 영문 대소문자 + 숫자 8자리여야 합니다. 실제: " + code);
    }

    // =====================================================================
    // joinSpace 테스트
    // =====================================================================

    @Test
    @DisplayName("팀 스페이스 참여 성공 - MEMBER로 SpaceMember 등록, User teamCode 업데이트")
    void joinSpace_성공() {
        // given
        Long userId = 1L;
        String teamCode = "ABCD1234";
        Space space = Space.builder()
                .name("Test Team")
                .repoUrl("https://github.com/test/repo")
                .teamCode(teamCode)
                .createdBy(2L)
                .build();

        when(spaceRepository.findByTeamCode(teamCode)).thenReturn(Optional.of(space));
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(spaceMemberRepository.save(any(SpaceMember.class))).thenReturn(mock(SpaceMember.class));
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        // when
        spaceService.joinSpace(userId, teamCode, "DEVELOPER");

        // then
        verify(spaceMemberRepository).save(argThat(member ->
                member.getMemberRole() == SpaceMemberRole.MEMBER
        ));
        verify(userRepository).save(any(User.class));
        // GitHub 분석은 join 시에는 호출하지 않음
        verifyNoInteractions(githubAnalysisService);
    }

    @Test
    @DisplayName("존재하지 않는 팀 코드로 참여 시 SpaceNotFoundException 발생")
    void joinSpace_존재하지않는코드_예외발생() {
        // given
        Long userId = 1L;
        String invalidCode = "INVALID1";

        when(spaceRepository.findByTeamCode(invalidCode)).thenReturn(Optional.empty());

        // when & then
        SpaceNotFoundException exception = assertThrows(
                SpaceNotFoundException.class,
                () -> spaceService.joinSpace(userId, invalidCode, "DEVELOPER")
        );

        assertNotNull(exception.getMessage());
        assertTrue(exception.getMessage().contains("팀을 찾을 수 없습니다"));
        verifyNoInteractions(userRepository);
        verifyNoInteractions(spaceMemberRepository);
    }
}
