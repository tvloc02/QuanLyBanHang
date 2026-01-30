package com.ecommerce.service.location;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class LocationService {

    private final RestTemplate restTemplate = new RestTemplate();

    private final AtomicReference<CacheEntry> vnDepth3Cache = new AtomicReference<>(null);

    public Object vnDepth3() {
        CacheEntry cache = vnDepth3Cache.get();
        if (cache != null && cache.data != null && cache.isFresh(Duration.ofHours(12))) {
            return cache.data;
        }

        String url = "https://provinces.open-api.vn/api/?depth=3";
        Object data = restTemplate.getForObject(url, Object.class);
        vnDepth3Cache.set(new CacheEntry(data));
        return data;
    }

    public Object vn2Provinces() {
        String url = "https://production.cas.so/address-kit/latest/provinces";
        return restTemplate.getForObject(url, Object.class);
    }

    public Object vn2CommunesByProvince(String provinceCode) {
        String code = provinceCode == null ? "" : provinceCode.trim();
        String url = "https://production.cas.so/address-kit/latest/provinces/" + code + "/communes";
        return restTemplate.getForObject(url, Object.class);
    }

    public Map<String, Object> reverseGeocode(double lat, double lng) {
        String url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + lat + "&lon=" + lng;

        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.set("User-Agent", "FashionHub/1.0 (contact: support@fashionhub.local)");

        HttpEntity<Void> req = new HttpEntity<>(headers);
        ResponseEntity<Map<String, Object>> res = restTemplate.exchange(
            url,
            HttpMethod.GET,
            req,
            new ParameterizedTypeReference<Map<String, Object>>() {}
        );
        Map<String, Object> body = res.getBody();
        return body != null ? body : Map.of();
    }

    private static class CacheEntry {
        final Object data;
        final Instant savedAt;

        CacheEntry(Object data) {
            this.data = data;
            this.savedAt = Instant.now();
        }

        boolean isFresh(Duration ttl) {
            return savedAt != null && Instant.now().isBefore(savedAt.plus(ttl));
        }
    }
}
