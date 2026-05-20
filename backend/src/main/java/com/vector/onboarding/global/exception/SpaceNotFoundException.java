package com.vector.onboarding.global.exception;

public class SpaceNotFoundException extends RuntimeException {

    public SpaceNotFoundException() {
        super("팀을 찾을 수 없습니다.");
    }

    public SpaceNotFoundException(String teamCode) {
        super("팀을 찾을 수 없습니다. (teamCode: " + teamCode + ")");
    }
}
