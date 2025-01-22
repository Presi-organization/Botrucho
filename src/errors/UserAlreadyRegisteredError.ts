export class UserAlreadyRegisteredError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UserAlreadyRegisteredError";
    }
}
