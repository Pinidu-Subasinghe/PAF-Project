package com.example.backend.config;

import com.cloudinary.Cloudinary;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class CloudinaryConfig {

    @Bean
    public Cloudinary cloudinary(CloudinaryProperties properties) {
        Map<String, String> config = new HashMap<>();
        addIfPresent(config, "cloud_name", properties.getCloudName());
        addIfPresent(config, "api_key", properties.getApiKey());
        addIfPresent(config, "api_secret", properties.getApiSecret());
        config.put("secure", "true");
        return new Cloudinary(config);
    }

    private void addIfPresent(Map<String, String> config, String key, String value) {
        if (value != null && !value.isBlank()) {
            config.put(key, value);
        }
    }
}
