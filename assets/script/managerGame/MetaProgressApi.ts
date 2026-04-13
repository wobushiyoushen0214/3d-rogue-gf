import {
    META_PROGRESS_API_BASE_URL,
    MetaProgressSave,
    sanitizeMetaProgressSave,
} from '../const/MetaProgressConfig';

type MetaProgressApiResponse = {
    success?: boolean;
    data?: Partial<MetaProgressSave>;
    message?: string;
};

function resolveApiBaseUrl(): string {
    const dynamicValue = (globalThis as Record<string, unknown>)['__META_PROGRESS_API_BASE_URL'];
    if (typeof dynamicValue === 'string' && dynamicValue.trim().length > 0) {
        return dynamicValue.trim().replace(/\/+$/, '');
    }
    return META_PROGRESS_API_BASE_URL.replace(/\/+$/, '');
}

function resolveErrorMessage(status: number, statusText: string, body: string): string {
    const text = body && body.trim().length > 0 ? ` ${body.trim()}` : '';
    return `[MetaProgressApi] request failed: ${status} ${statusText}${text}`;
}

async function readJsonResponse(response: Response): Promise<MetaProgressApiResponse> {
    const text = await response.text();
    if (!response.ok) {
        throw new Error(resolveErrorMessage(response.status, response.statusText, text));
    }
    if (!text) {
        return {};
    }
    try {
        return JSON.parse(text) as MetaProgressApiResponse;
    } catch (error) {
        throw new Error(`[MetaProgressApi] invalid JSON response: ${String(error)}`);
    }
}

export class MetaProgressApi {
    static async load(playerId: string): Promise<MetaProgressSave> {
        const baseUrl = resolveApiBaseUrl();
        const response = await fetch(`${baseUrl}/meta-progress/${encodeURIComponent(playerId)}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        });
        const payload = await readJsonResponse(response);
        return sanitizeMetaProgressSave(payload.data);
    }

    static async save(playerId: string, progress: MetaProgressSave): Promise<MetaProgressSave> {
        const baseUrl = resolveApiBaseUrl();
        const safeProgress = sanitizeMetaProgressSave(progress);
        const response = await fetch(`${baseUrl}/meta-progress/${encodeURIComponent(playerId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                data: safeProgress,
            }),
        });
        const payload = await readJsonResponse(response);
        return sanitizeMetaProgressSave(payload.data ?? safeProgress);
    }
}
