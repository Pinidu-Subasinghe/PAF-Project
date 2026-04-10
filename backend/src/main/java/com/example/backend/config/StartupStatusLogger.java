package com.example.backend.config;

import java.sql.Connection;
import java.sql.SQLException;

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
        int port = resolvePort();

        String databaseName = resolveDatabaseName();
        if (databaseName != null) {
            log.info("Database {} connected", databaseName);
        } else {
            log.info("Database connection failed");
        }

        log.info("Port {}", port);
    }

    private int resolvePort() {
        Integer localPort = environment.getProperty("local.server.port", Integer.class);
        if (localPort != null) {
            return localPort;
        }

        return environment.getProperty("server.port", Integer.class, 8080);
    }

    private String resolveDatabaseName() {
        if (dataSource == null) {
            return null;
        }

        try (Connection connection = dataSource.getConnection()) {
            String catalog = connection.getCatalog();
            if (catalog != null && !catalog.isBlank()) {
                return catalog;
            }

            return parseDatabaseNameFromUrl(environment.getProperty("spring.datasource.url"));
        } catch (SQLException ex) {
            return null;
        }
    }

    private String parseDatabaseNameFromUrl(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return "unknown_db";
        }

        int schemeIndex = jdbcUrl.indexOf("//");
        int pathStart = jdbcUrl.indexOf('/', schemeIndex >= 0 ? schemeIndex + 2 : 0);
        if (pathStart < 0 || pathStart + 1 >= jdbcUrl.length()) {
            return "unknown_db";
        }

        String dbPart = jdbcUrl.substring(pathStart + 1);
        int paramsStart = dbPart.indexOf('?');
        return paramsStart >= 0 ? dbPart.substring(0, paramsStart) : dbPart;
    }
}
