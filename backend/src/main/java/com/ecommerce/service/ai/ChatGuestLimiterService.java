package com.ecommerce.service.ai;

import com.ecommerce.exception.TooManyRequestsException;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class ChatGuestLimiterService {

    public static final int GUEST_LIMIT = 5;
    private static final long WINDOW_MS = 24L * 60L * 60L * 1000L;

    private static final class Counter {
        long windowStart;
        int count;

        Counter(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }

    private final ConcurrentHashMap<String, Counter> counters = new ConcurrentHashMap<>();

    public Quota getQuota(String key) {
        long now = System.currentTimeMillis();
        Counter c = counters.get(key);
        if (c == null || now - c.windowStart >= WINDOW_MS) {
            return new Quota(GUEST_LIMIT, GUEST_LIMIT, now + WINDOW_MS);
        }
        int remaining = Math.max(0, GUEST_LIMIT - c.count);
        return new Quota(GUEST_LIMIT, remaining, c.windowStart + WINDOW_MS);
    }

    public Quota consumeOrThrow(String key) {
        long now = System.currentTimeMillis();

        Counter c = counters.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart >= WINDOW_MS) {
                return new Counter(now, 0);
            }
            return existing;
        });

        synchronized (c) {
            if (now - c.windowStart >= WINDOW_MS) {
                c.windowStart = now;
                c.count = 0;
            }
            if (c.count >= GUEST_LIMIT) {
                throw new TooManyRequestsException("Bạn đã dùng hết 5 lượt chat hôm nay. Vui lòng thử lại sau.");
            }
            c.count += 1;
            int remaining = Math.max(0, GUEST_LIMIT - c.count);
            return new Quota(GUEST_LIMIT, remaining, c.windowStart + WINDOW_MS);
        }
    }

    public static final class Quota {
        private final int limit;
        private final int remaining;
        private final long resetAt;

        public Quota(int limit, int remaining, long resetAt) {
            this.limit = limit;
            this.remaining = remaining;
            this.resetAt = resetAt;
        }

        public int getLimit() {
            return limit;
        }

        public int getRemaining() {
            return remaining;
        }

        public long getResetAt() {
            return resetAt;
        }
    }
}
