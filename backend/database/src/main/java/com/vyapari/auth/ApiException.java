package com.vyapari.auth;

import org.springframework.http.HttpStatus;

/** Throw this anywhere to send an error to the front end: new ApiException(HttpStatus.CONFLICT, "message") */
public class ApiException extends RuntimeException {
    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() { return status; }
}