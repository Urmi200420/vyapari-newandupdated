package com.vyapari.catalog;

import jakarta.servlet.MultipartConfigElement;
import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;

/** Allows one picture of up to 5 MB per request (the Spring default is only 1 MB). */
@Configuration
public class UploadConfig {

    @Bean
    MultipartConfigElement multipartConfigElement() {
        MultipartConfigFactory f = new MultipartConfigFactory();
        f.setMaxFileSize(DataSize.ofMegabytes(5));
        f.setMaxRequestSize(DataSize.ofMegabytes(6));
        return f.createMultipartConfig();
    }
}
