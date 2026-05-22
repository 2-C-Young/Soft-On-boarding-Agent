package com.vector.onboarding.domain.user;

import com.vector.onboarding.domain.dataview.service.DataViewService;
import com.vector.onboarding.domain.space.SpaceMember;
import com.vector.onboarding.domain.space.SpaceMemberRepository;
import com.vector.onboarding.domain.user.dto.UserResponseDto;
import com.vector.onboarding.global.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final SpaceMemberRepository spaceMemberRepository;
    private final DataViewService dataViewService;

    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> getMyInfo(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        Long userId = Long.valueOf(userDetails.getUsername());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        // 로그인(/me 호출) 성공 시점에 소속된 모든 스페이스의 미분석 데이터 비동기 선행 분석 트리거
        // 이 부분은 data view의 비동기 선행 트리거 입니다. (작성자 : 이시영)
        try {
            List<SpaceMember> members = spaceMemberRepository.findAllByUserId(userId);
            for (SpaceMember member : members) {
                dataViewService.preloadAndCacheForSpaceAsync(member.getSpaceId());
            }
        } catch (Exception e) {
            log.error("로그인 시 사전 캐싱 트리거 중 오류 발생", e);
        }

        return ResponseEntity.ok(new UserResponseDto(user));
    }

    @GetMapping("/me/profile")
    public ResponseEntity<com.vector.onboarding.domain.user.dto.UserProfileResponseDto> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        Long userId = Long.valueOf(userDetails.getUsername());
        com.vector.onboarding.domain.user.dto.UserProfileResponseDto response = userService.getUserProfile(userId);

        return ResponseEntity.ok(response);
    }
}

