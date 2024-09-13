class InsufficientBalanceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InsufficientBalanceError';
    }
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

class ExternalAPIError extends Error {
    constructor(message, apiName) {
        super(message);
        this.name = 'ExternalAPIError';
        this.apiName = apiName;
    }
}

module.exports = {
    InsufficientBalanceError,
    ValidationError,
    ExternalAPIError
}