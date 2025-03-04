/**
 * Helper functions to check if the request uses
 * corresponding method.
 *
 */
const Method = (method) => (req) => req.method.toLowerCase() === method.toLowerCase();
const Get = Method('get');
const Post = Method('post');

const Path = (regExp) => (req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    return path.match(regExp) && path.match(regExp)[0] === path;
};

/*
 * The regex to get the bot_token and api_method from request URL
 * as the first and second backreference respectively.
 */
const URL_PATH_REGEX = /^\/bot(?<bot_token>[^/]+)\/(?<api_method>[a-z]+)/i;

/**
 * Router handles the logic of what handler is matched given conditions
 * for each request
 */
class Router {
    constructor() {
        this.routes = [];
    }

    handle(conditions, handler) {
        this.routes.push({
            conditions,
            handler,
        });
        return this;
    }

    get(url, handler) {
        return this.handle([Get, Path(url)], handler);
    }

    post(url, handler) {
        return this.handle([Post, Path(url)], handler);
    }

    all(handler) {
        return this.handler([], handler);
    }

    route(req) {
        const route = this.resolve(req);

        if (route) {
            return route.handler(req);
        }

        const description = 'No matching route found';
        const error_code = 404;

        return new Response(
            JSON.stringify({
                ok: false,
                error_code,
                description,
            }),
            {
                status: error_code,
                statusText: description,
                headers: {
                    'content-type': 'application/json',
                },
            }
        );
    }

    /**
     * It returns the matching route that returns true
     * for all the conditions if any.
     */
    resolve(req) {
        return this.routes.find((r) => {
            if (!r.conditions || (Array.isArray(r) && !r.conditions.length)) {
                return true;
            }

            if (typeof r.conditions === 'function') {
                return r.conditions(req);
            }

            return r.conditions.every((c) => c(req));
        });
    }
}

/**
 * Sends a POST request with JSON data to Telegram Bot API
 * and reads in the response body.
 * @param {Request} request the incoming request
 */
async function handler(request) {
    const { url, method, headers } = request;
    const { pathname, search } = new URL(url);
    const { bot_token, api_method } = pathname.match(URL_PATH_REGEX).groups;
    console.log(bot_token)
    // 安全验证
    // if (!bot_token.startsWith('8178658513:')) {
    //     return new Response('Invalid token', { status: 403 });
    // }

    // 构建目标URL（不带查询参数）
    const api_url = `https://api.telegram.org/bot${bot_token}/${api_method}`;

    // 获取原始请求体
    const body = method === 'POST' ? await request.clone().text() : null;
    console.log({
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body: method === 'POST' ? body : null
    })
    // 转发请求
    const response = await fetch(api_url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body: method === 'POST' ? body : null
    });
    console.log(response);
    return new Response(await response.text(), {
        status: response.status,
        headers: {
            'Content-Type': 'application/json',
            ...response.headers
        }
    });
}

/**
 * Handles the incoming request.
 * @param {Request} request the incoming request.
 */
async function handleRequest(request) {
    const r = new Router();
    r.get(URL_PATH_REGEX, (req) => handler(req));
    r.post(URL_PATH_REGEX, (req) => handler(req));

    const resp = await r.route(request);
    return resp;
}

/**
 * Hook into the fetch event.
 */
addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request));
});
