import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
	requestId: string;
	[key: string]: unknown;
}

class RequestContextManager {
	private static instance: RequestContextManager;
	private storage: AsyncLocalStorage<RequestContext>;

	private constructor() {
		this.storage = new AsyncLocalStorage<RequestContext>();
	}

	public static getInstance(): RequestContextManager {
		if (!RequestContextManager.instance) {
			RequestContextManager.instance = new RequestContextManager();
		}
		return RequestContextManager.instance;
	}

	public run<T>(context: RequestContext, callback: () => T): T {
		return this.storage.run(context, callback);
	}

	public getRequestId(): string | undefined {
		return this.storage.getStore()?.requestId;
	}

	public getContext(): RequestContext | undefined {
		return this.storage.getStore();
	}

	public set(key: string, value: unknown): void {
		const store = this.storage.getStore();
		if (store) {
			store[key] = value;
		}
	}

	public get(key: string): unknown {
		return this.storage.getStore()?.[key];
	}
}

export const requestContext = RequestContextManager.getInstance();

export function getRequestId(): string {
	return requestContext.getRequestId() || "no-request-id";
}
