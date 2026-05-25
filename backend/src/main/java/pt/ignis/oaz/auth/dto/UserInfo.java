package pt.ignis.oaz.auth.dto;

import java.util.UUID;

public record UserInfo(UUID id, String email, String name, String role) {}
