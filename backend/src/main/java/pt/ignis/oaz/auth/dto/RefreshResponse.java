package pt.ignis.oaz.auth.dto;

public record RefreshResponse(String accessToken, String refreshToken) {}
