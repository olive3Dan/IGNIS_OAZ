package pt.ignis.oaz.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 100, message = "Nome deve ter no máximo 100 caracteres")
        String name,

        @NotBlank(message = "Email é obrigatório")
        @Email(message = "Formato de email inválido")
        @Size(max = 254, message = "Email deve ter no máximo 254 caracteres")
        String email,

        @NotBlank(message = "Palavra-passe é obrigatória")
        @Size(min = 8, max = 128, message = "Palavra-passe deve ter entre 8 e 128 caracteres")
        String password
) {}
