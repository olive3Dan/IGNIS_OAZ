package pt.ignis.oaz.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoginRateLimiter {

    private final int maxAttempts;
    private final long windowMinutes;
    private final ConcurrentHashMap<String, AttemptInfo> attempts = new ConcurrentHashMap<>();

    public LoginRateLimiter(
            @Value("${auth.rate-limit.max-attempts:5}") int maxAttempts,
            @Value("${auth.rate-limit.window-minutes:15}") long windowMinutes) {
        this.maxAttempts = maxAttempts;
        this.windowMinutes = windowMinutes;
    }

    public boolean isBlocked(String email) {
        String key = email.toLowerCase();
        AttemptInfo info = attempts.get(key);
        if (info == null) return false;

        // Check if window has expired
        if (info.isExpired(windowMinutes)) {
            attempts.remove(key);
            return false;
        }

        return info.count >= maxAttempts;
    }

    public void recordFailedAttempt(String email) {
        String key = email.toLowerCase();
        attempts.compute(key, (k, existing) -> {
            if (existing == null || existing.isExpired(windowMinutes)) {
                return new AttemptInfo(1, Instant.now());
            }
            return new AttemptInfo(existing.count + 1, existing.firstAttempt);
        });
    }

    public void resetAttempts(String email) {
        attempts.remove(email.toLowerCase());
    }

    private static class AttemptInfo {
        final int count;
        final Instant firstAttempt;

        AttemptInfo(int count, Instant firstAttempt) {
            this.count = count;
            this.firstAttempt = firstAttempt;
        }

        boolean isExpired(long windowMinutes) {
            return Instant.now().isAfter(firstAttempt.plusSeconds(windowMinutes * 60));
        }
    }
}
