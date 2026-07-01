class OrchBaseError(Exception):
    pass


class ModelNotAllowedError(OrchBaseError):
    def __init__(self, requested: str, allowed: list[str]):
        self.requested = requested
        self.allowed = allowed
        super().__init__(f"Model '{requested}' is not approved by your organization.")


class InjectionDetectedError(OrchBaseError):
    pass


class CanaryLeakError(OrchBaseError):
    pass


class RateLimitExceededError(OrchBaseError):
    def __init__(self, limit: int, reset_in: int):
        self.limit = limit
        self.reset_in = reset_in
        super().__init__(f"Rate limit of {limit} requests/minute exceeded.")


class SessionNotFoundError(OrchBaseError):
    pass


class ConstraintNotFoundError(OrchBaseError):
    pass
