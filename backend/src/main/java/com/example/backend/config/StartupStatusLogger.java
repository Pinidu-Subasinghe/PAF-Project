package com.example.backend.config;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.Arrays;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class StartupStatusLogger implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger log = LoggerFactory.getLogger(StartupStatusLogger.class);

    private final Environment environment;
    private final DataSource dataSource;

    public StartupStatusLogger(
            Environment environment,
            ObjectProvider<DataSource> dataSourceProvider) {
        this.environment = environment;
        this.dataSource = dataSourceProvider.getIfAvailable();
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        String appName = environment.getProperty("spring.application.name", "application");
        int port = resolvePort();
        String[] activeProfiles = environment.getActiveProfiles();
        String profileText = activeProfiles.length == 0 ? "default" : Arrays.toString(activeProfiles);

        log.info("================ Startup Status ================");
        log.info("Application : {}", appName);
        log.info("Port        : {}", port);
        log.info("Profiles    : {}", profileText);
        log.info("Base URL    : http://localhost:{}", port);

        logDatabaseStatus();
        log.info("================================================");
    }

    private int resolvePort() {
        Integer localPort = environment.getProperty("local.server.port", Integer.class);
        if (localPort != null) {
            return localPort;
        }

        return environment.getProperty("server.port", Integer.class, 8080);
    }

    private void logDatabaseStatus() {
        if (dataSource == null) {
            log.info("Database    : DOWN (No DataSource configured)");
            return;
        }

        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metadata = connection.getMetaData();
            log.info("Database    : UP");
            log.info("DB Product  : {} {}", metadata.getDatabaseProductName(), metadata.getDatabaseProductVersion());
            log.info("DB URL      : {}", sanitizeJdbcUrl(metadata.getURL()));
            log.info("DB User     : {}", metadata.getUserName());
        } catch (SQLException ex) {
            log.info("Database    : DOWN ({})", ex.getMessage());
        }
    }

    private String sanitizeJdbcUrl(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return "unknown";
        }

        return jdbcUrl.replaceAll("([?&](?:password|pwd)=)[^&]*", "$1****");
    }
}
