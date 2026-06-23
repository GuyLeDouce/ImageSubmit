class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
  }
}

class SafeStartupError extends Error {
  constructor(message) {
    super(message);
    this.name = "SafeStartupError";
    this.statusCode = 503;
  }
}

module.exports = {
  ConflictError,
  SafeStartupError,
};
