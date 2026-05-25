package pt.ignis.oaz.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ignis.oaz.auth.dto.*;
import pt.ignis.oaz.auth.exception.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern PASSWORD_UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern PASSWORD_LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern PASSWORD_DIGIT = Pattern.compile("[0-9]");

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final LoginRateLimiter rateLimiter;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       JwtService jwtService,
                       PasswordEncoder passwordEncoder,
                       LoginRateLimiter rateLimiter) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        // Validate password criteria
        validatePassword(request.password());

        // Check duplicate email
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateEmailException("Email já registado");
        }

        // Create user
        User user = new User(
                request.email().trim(),
                request.name().trim(),
                passwordEncoder.encode(request.password()),
                Role.USER
        );

        user = userRepository.save(user);
        return new RegisterResponse(user.getId(), user.getEmail(), user.getName());
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();

        // Check rate limit
        if (rateLimiter.isBlocked(email)) {
            throw new RateLimitExceededException("Demasiadas tentativas. Tente novamente em 15 minutos");
        }

        // Find user
        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            rateLimiter.recordFailedAttempt(email);
            throw new InvalidCredentialsException("Credenciais inválidas");
        }

        // Reset rate limiter on success
        rateLimiter.resetAttempts(email);

        // Generate tokens
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        // Store refresh token hash
        RefreshToken tokenEntity = new RefreshToken(
                user,
                hashToken(refreshToken),
                Instant.now().plusMillis(jwtService.getRefreshTokenExpiration())
        );
        refreshTokenRepository.save(tokenEntity);

        UserInfo userInfo = new UserInfo(user.getId(), user.getEmail(), user.getName(), user.getRole().name());
        return new LoginResponse(accessToken, refreshToken, userInfo);
    }

    @Transactional
    public RefreshResponse refresh(RefreshRequest request) {
        String tokenHash = hashToken(request.refreshToken());

        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidTokenException("Token inválido"));

        // Detect reuse of revoked token — revoke all tokens for user
        if (storedToken.isRevoked()) {
            refreshTokenRepository.revokeAllByUserId(storedToken.getUser().getId());
            throw new InvalidTokenException("Token inválido");
        }

        // Check expiry
        if (storedToken.isExpired()) {
            storedToken.revoke();
            refreshTokenRepository.save(storedToken);
            throw new SessionExpiredException("Sessão expirada");
        }

        // Revoke old token
        storedToken.revoke();
        refreshTokenRepository.save(storedToken);

        // Generate new token pair
        User user = storedToken.getUser();
        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user);

        // Store new refresh token
        RefreshToken newTokenEntity = new RefreshToken(
                user,
                hashToken(newRefreshToken),
                Instant.now().plusMillis(jwtService.getRefreshTokenExpiration())
        );
        refreshTokenRepository.save(newTokenEntity);

        return new RefreshResponse(newAccessToken, newRefreshToken);
    }

    @Transactional
    public void logout(LogoutRequest request) {
        String tokenHash = hashToken(request.refreshToken());
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.revoke();
            refreshTokenRepository.save(token);
        });
    }

    private void validatePassword(String password) {
        StringBuilder errors = new StringBuilder();
        if (!PASSWORD_UPPERCASE.matcher(password).find()) {
            errors.append("Deve conter pelo menos uma letra maiúscula. ");
        }
        if (!PASSWORD_LOWERCASE.matcher(password).find()) {
            errors.append("Deve conter pelo menos uma letra minúscula. ");
        }
        if (!PASSWORD_DIGIT.matcher(password).find()) {
            errors.append("Deve conter pelo menos um dígito. ");
        }
        if (!errors.isEmpty()) {
            throw new PasswordValidationException(errors.toString().trim());
        }
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
