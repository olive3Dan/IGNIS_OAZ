package pt.ignis.oaz.auth.dto;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        UserInfo user
) {}
