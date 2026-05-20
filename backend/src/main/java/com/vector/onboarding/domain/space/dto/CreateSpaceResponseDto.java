package com.vector.onboarding.domain.space.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CreateSpaceResponseDto {

    private Long spaceId;
    private String teamCode;
}
