package com.example.backend.security.oauth;

import com.example.backend.entity.AppUser;
import com.example.backend.security.jwt.JwtService;
import com.example.backend.security.jwt.JwtToken;
import com.example.backend.service.AuthService;
import com.example.backend.service.NotificationService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final AuthService authService;
    private final JwtService jwtService;
    private final NotificationService notificationService;
    private final String frontendOAuthSuccessUrl;

    public OAuth2AuthenticationSuccessHandler(
            AuthService authService,
            JwtService jwtService,
            NotificationService notificationService,
            @Value("${app.frontend.oauth-success-url:http://localhost:5173/}") String frontendOAuthSuccessUrl
    ) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.notificationService = notificationService;
        this.frontendOAuthSuccessUrl = frontendOAuthSuccessUrl;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {
        if (!(authentication.getPrincipal() instanceof OAuth2User oauth2User)) {
            getRedirectStrategy().sendRedirect(request, response, frontendOAuthSuccessUrl + "?error=invalid_oauth_principal");
            return;
        }

        String email = readAttribute(oauth2User, "email");
        if (email == null || email.trim().isBlank()) {
            getRedirectStrategy().sendRedirect(request, response, frontendOAuthSuccessUrl + "?error=email_not_provided");
            return;
        }

        String fullName = readAttribute(oauth2User, "name");

        AppUser appUser = authService.findOrCreateOAuthUser(email, fullName);
        if (isPasswordSetupRequired(appUser)) {
            notificationService.ensurePasswordSetupRequiredNotification(appUser);
        }
        JwtToken jwtToken = jwtService.generateToken(appUser);

        String fragment = "token=" + encode(jwtToken.token())
                + "&tokenType=Bearer"
                + "&expiresAt=" + encode(jwtToken.expiresAt().toString())
                + "&email=" + encode(appUser.getEmail())
                + "&fullName=" + encode(appUser.getFullName())
            + "&role=" + encode(appUser.getRole().name())
            + "&passwordSetupRequired=" + encode(Boolean.toString(isPasswordSetupRequired(appUser)));

        String redirectUrl = UriComponentsBuilder
                .fromUriString(frontendOAuthSuccessUrl)
                .fragment(fragment)
                .build(true)
                .toUriString();

        clearAuthenticationAttributes(request);
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }

    private String readAttribute(OAuth2User oauth2User, String key) {
        Object value = oauth2User.getAttributes().get(key);
        return value == null ? null : value.toString();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private boolean isPasswordSetupRequired(AppUser user) {
        return user.getPasswordHash() == null || user.getPasswordHash().isBlank();
    }
}