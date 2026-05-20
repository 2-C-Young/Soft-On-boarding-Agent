package com.vector.onboarding.domain.space.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class JoinSpaceRequestDto {

    @NotBlank(message = "팀 코드를 입력해주세요.")
    private String teamCode;

    public JoinSpaceRequestDto(String teamCode) {
        this.teamCode = teamCode;
    }
}
