package com.vector.onboarding.domain.space;

import com.vector.onboarding.domain.space.dto.CreateSpaceRequestDto;
import com.vector.onboarding.domain.space.dto.CreateSpaceResponseDto;
import com.vector.onboarding.domain.space.dto.JoinSpaceRequestDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/spaces")
@RequiredArgsConstructor
public class SpaceController {

    private final SpaceService spaceService;

    /**
     * 팀 스페이스를 생성합니다.
     * POST /api/spaces
     *
     * @param userDetails 현재 로그인한 유저 (JWT 인증 필요)
     * @param request     { "name": "팀 이름", "repoUrl": "https://github.com/..." }
     * @return 201 Created { "spaceId": 1, "teamCode": "Ab3Cd9Ef" }
     */
    @PostMapping
    public ResponseEntity<CreateSpaceResponseDto> createSpace(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateSpaceRequestDto request) {

        Long userId = Long.valueOf(userDetails.getUsername());
        CreateSpaceResponseDto response = spaceService.createSpace(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 팀 코드로 팀 스페이스에 참여합니다.
     * POST /api/spaces/join
     *
     * @param userDetails 현재 로그인한 유저 (JWT 인증 필요)
     * @param request     { "teamCode": "Ab3Cd9Ef" }
     * @return 200 OK (성공) / 404 Not Found (존재하지 않는 팀 코드)
     */
    @PostMapping("/join")
    public ResponseEntity<Void> joinSpace(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody JoinSpaceRequestDto request) {

        Long userId = Long.valueOf(userDetails.getUsername());
        spaceService.joinSpace(userId, request.getTeamCode());
        return ResponseEntity.ok().build();
    }
}
