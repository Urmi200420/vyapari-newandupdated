package com.vyapari.auth;

import org.springframework.http.HttpStatus;

/** An error that should be shown to the user, with the HTTP status to send back. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
