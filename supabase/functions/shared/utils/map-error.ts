import { DomainError } from "@errors/domain-error.ts";

export class ResponseMapper {

    static success(data: object, requestId: string): Response {
        return new Response(
            JSON.stringify({ ...data, request_id: requestId }),
            { status: 200, headers: { "Content-Type": "application/json", "X-Request-ID": requestId } },
        );
    }


    static error(error: DomainError | unknown, requestId: string): Response {
        if (error instanceof DomainError) {
            return new Response(
                JSON.stringify({ error: true, message: error.message, code: error.code, statusCode: error.statusCode }),
                { status: error.statusCode, headers: { "Content-Type": "application/json", "X-Request-ID": requestId } },
            );
        }

        const message = error instanceof Error || (error as { message?: string }).message ? (error as { message?: string }).message : 'An unknown error occurred';
        const code = (error as { code: string })?.code ?? 'UNKNOWN_ERROR';
        const statusCode = (error as { statusCode: number })?.statusCode ?? 500;
        return new Response(
            JSON.stringify({ error: true, message, code, statusCode }),
            { status: statusCode, headers: { "Content-Type": "application/json", "X-Request-ID": requestId } },
        );
    }
}