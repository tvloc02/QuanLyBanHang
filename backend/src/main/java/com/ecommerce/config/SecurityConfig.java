 package com.ecommerce.config;
 
 import com.ecommerce.security.JwtAuthenticationFilter;
 import jakarta.servlet.http.HttpServletResponse;
 import org.springframework.http.HttpMethod;
 import org.springframework.context.annotation.Bean;
 import org.springframework.context.annotation.Configuration;
 import org.springframework.security.config.Customizer;
 import org.springframework.security.config.annotation.web.builders.HttpSecurity;
 import org.springframework.security.config.http.SessionCreationPolicy;
 import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
 import org.springframework.security.web.SecurityFilterChain;

 @Configuration
 public class SecurityConfig {

     private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, e) ->
                    res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized")
                )
                .accessDeniedHandler((req, res, e) ->
                    res.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden")
                )
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/oauth2/**").permitAll()
                .requestMatchers("/api/chat/**").permitAll()
                .requestMatchers("/api/support-chat/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/admin/uploads/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/locations/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/search/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/reviews/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/order-status/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/coupons").permitAll()
                .requestMatchers("/api/admin/ai-settings/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/users/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "MANAGER", "STAFF")
                .requestMatchers("/api/orders/**").authenticated()
                .requestMatchers("/api/coupons/**").authenticated()
                .requestMatchers("/api/profile/**").authenticated()
                .requestMatchers("/api/users/**").authenticated()
                .requestMatchers("/api/cart/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
