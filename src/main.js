import { Actor, log } from 'apify';
import { Impit } from 'impit';
import { chromium } from 'patchright';

import {
    buildSearchBody,
    buildSearchUrl,
    LOCATION_ALIASES,
    LOCATION_ENDPOINT,
    mapPosting,
    normalizeName,
    normalizeSearchUrl,
    OPERATIONS,
    PAGE_SIZE,
    parseSearchUrl,
    pickLocationSuggestion,
    PROPERTY_TYPES,
    SEARCH_ENDPOINT,
    SITE_ORIGIN,
} from './inmuebles24.js';

const HOME_URL = `${SITE_ORIGIN}/`;
const REQUEST_TIMEOUT_MS = 60000;
const MAX_PAGES_LIMIT = 500;

const HEADER_ORDER = {
    accept: '*/*',
    'accept-language': 'es-MX,es;q=0.9,en;q=0.8',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-requested-with': 'XMLHttpRequest',
};

/** Minimal cookie jar that impit can read from and write to. */
class CookieJar {
    constructor() {
        this.cookies = new Map();
    }

    seed(cookies) {
        for (const cookie of cookies) {
            this.cookies.set(cookie.name, cookie.value);
        }
    }

    getCookieString() {
        return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    }

    setCookie(cookie) {
        const pair = String(cookie).split(';')[0];
        const index = pair.indexOf('=');
        if (index <= 0) return;
        this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
}

function positiveInt(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
}

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function structuredFilters(input) {
    const propertyType = PROPERTY_TYPES[input.propertyType] ?? PROPERTY_TYPES.departamentos;
    const operation = OPERATIONS[input.operation] ?? OPERATIONS.venta;
    const filters = {
        tipoDePropiedad: propertyType.id,
        tipoDeOperacion: operation.id,
    };

    const minPrice = positiveInt(input.minPrice, 0);
    const maxPrice = positiveInt(input.maxPrice, 0);
    if (minPrice) filters.preciomin = minPrice;
    if (maxPrice) filters.preciomax = maxPrice;
    if (filters.preciomin && filters.preciomax && filters.preciomin > filters.preciomax) {
        throw new Error('minPrice must be lower than or equal to maxPrice.');
    }

    const bedrooms = positiveInt(input.bedroomsMin, 0);
    const bathrooms = positiveInt(input.bathroomsMin, 0);
    const parking = positiveInt(input.parkingMin, 0);
    const publishedDays = positiveInt(input.publishedWithinDays, 0);

    if (bedrooms) filters.habitacionesminimo = bedrooms;
    if (bathrooms) filters.banos = bathrooms;
    if (parking) filters.garages = parking;
    if (publishedDays) filters.publicacion = String(publishedDays);

    return filters;
}

function isChallenge(status, contentType, body) {
    if (status !== 403) return false;
    if (!/text\/html/i.test(contentType)) return false;
    return /just a moment|cf-chl|attention required|un momento|verificaci/i.test(body);
}

function parseProxy(proxyUrl) {
    if (!proxyUrl) return undefined;
    const parsed = new URL(proxyUrl);
    return {
        server: `${parsed.protocol}//${parsed.hostname}:${parsed.port}`,
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
    };
}

class SiteClient {
    constructor(proxyUrl) {
        this.proxyUrl = proxyUrl;
        this.jar = new CookieJar();
        this.headers = { ...HEADER_ORDER };
        this.impit = null;
        this.browser = null;
        this.context = null;
        this.page = null;
    }

    buildImpit() {
        this.impit = new Impit({
            browser: 'chrome',
            proxyUrl: this.proxyUrl,
            cookieJar: this.jar,
            timeout: REQUEST_TIMEOUT_MS,
            headers: this.headers,
        });
    }

    async startBrowser() {
        log.info('Opening a stealth browser session to clear the site check.');
        this.browser = await chromium.launch({
            headless: false,
            proxy: parseProxy(this.proxyUrl),
            args: [
                '--no-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--window-size=1366,900',
            ],
            ignoreDefaultArgs: ['--enable-automation'],
        });
        this.context = await this.browser.newContext({
            locale: 'es-MX',
            timezoneId: 'America/Mexico_City',
            viewport: { width: 1366, height: 900 },
            screen: { width: 1366, height: 900 },
            colorScheme: 'light',
        });
        this.page = await this.context.newPage();
        await this.page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await this.waitForChallenge();
        await this.syncFingerprint();
        this.jar.seed(await this.context.cookies());
        log.info(`Browser cookies loaded: ${this.jar.cookies.size}.`);
        this.buildImpit();
    }

    async syncFingerprint() {
        const fingerprint = await this.page.evaluate(() => {
            const data = navigator.userAgentData;
            const hints = {};
            if (data) {
                hints['sec-ch-ua'] = data.brands.map((brand) => `"${brand.brand}";v="${brand.version}"`).join(', ');
                hints['sec-ch-ua-mobile'] = data.mobile ? '?1' : '?0';
                hints['sec-ch-ua-platform'] = `"${data.platform}"`;
            }
            return {
                userAgent: navigator.userAgent,
                language: navigator.language,
                hints,
            };
        });

        this.headers = {
            ...HEADER_ORDER,
            'user-agent': fingerprint.userAgent,
            'accept-language': `${fingerprint.language},es;q=0.9,en;q=0.8`,
            ...fingerprint.hints,
        };
    }

    async waitForChallenge() {
        await this.page
            .waitForFunction(() => document.readyState === 'complete', null, { timeout: 30000 })
            .catch(() => {});

        const isBlocked = () =>
            this.page.evaluate(() =>
                /just a moment|un momento|attention required|checking your browser|verificaci/i.test(document.title),
            );
        if (!(await isBlocked())) return;

        log.info('Waiting for the browser check to finish.');
        const deadline = Date.now() + 120000;
        while (Date.now() < deadline) {
            if (!(await isBlocked())) return;
            await this.clickTurnstile();
            await delay(5000);
        }

        throw new Error('The site browser check did not finish. Try residential proxy access.');
    }

    async clickTurnstile() {
        const frames = this.page.frames().filter((frame) => frame.url().includes('challenges.cloudflare.com'));
        for (const frame of frames) {
            try {
                const element = await frame.frameElement();
                const box = await element.boundingBox();
                if (box) await this.page.mouse.click(box.x + 30, box.y + 30);
            } catch {
                // The widget may detach while the challenge is re-rendering.
            }
        }
    }

    async refreshSession() {
        if (!this.context) {
            await this.startBrowser();
            return;
        }
        log.warning('Clearing cookies and retrying the browser check.');
        await this.context.clearCookies();
        this.jar = new CookieJar();
        this.buildImpit();
        await this.page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await this.waitForChallenge();
        await this.syncFingerprint();
        this.jar.seed(await this.context.cookies());
        this.buildImpit();
    }

    async impitJson(url, { method = 'GET', body } = {}) {
        const response = await this.impit.fetch(url, {
            method,
            headers: {
                ...this.headers,
                cookie: this.jar.getCookieString(),
                origin: SITE_ORIGIN,
                referer: HOME_URL,
                ...(body ? { 'content-type': 'application/json' } : {}),
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });

        const text = await response.text();
        const contentType = response.headers.get('content-type') ?? '';

        if (response.status === 200 && contentType.includes('application/json')) {
            return JSON.parse(text);
        }
        if (isChallenge(response.status, contentType, text)) {
            const error = new Error('Inmuebles24 served a Cloudflare challenge.');
            error.challenge = true;
            throw error;
        }

        const error = new Error(
            `Inmuebles24 API returned HTTP ${response.status} (${contentType || 'unknown content type'}).`,
        );
        error.retryable = response.status >= 500 || response.status === 429;
        throw error;
    }

    async json(url, options = {}) {
        if (!this.impit) this.buildImpit();

        try {
            return await this.impitJson(url, options);
        } catch (error) {
            if (!error.challenge) throw error;
            await this.refreshSession();
            return this.impitJson(url, options);
        }
    }

    async close() {
        await this.browser?.close().catch(() => {});
        this.browser = null;
        this.context = null;
    }
}

async function resolveLocation(client, location) {
    const rawQuery = String(location).split(',')[0].trim();
    const aliasKey = normalizeName(rawQuery).replace(/\s+/g, '-');
    const alias = LOCATION_ALIASES[aliasKey];

    if (alias) {
        return { field: 'province', id: alias, label: rawQuery };
    }

    const suggestions = await client.json(
        `${LOCATION_ENDPOINT}?location_name=${encodeURIComponent(rawQuery)}&limit=20&suggestion_type=SEARCHABLE`,
    );
    const match = pickLocationSuggestion(rawQuery, suggestions);
    if (!match) {
        throw new Error(
            `Location "${rawQuery}" was not found on Inmuebles24. Use a city, neighborhood, or state name such as Guadalajara, Polanco, or Jalisco.`,
        );
    }

    const field = {
        provincia: 'province',
        departamento: 'city',
        zona: 'subZone',
        barrio: 'zone',
    }[normalizeName(match.label)];

    if (!field) {
        throw new Error(`Location "${rawQuery}" matched an unsupported location level (${match.label}).`);
    }

    return { field, id: String(match.id).replace(/^V1-[A-Z]-/, ''), label: match.name };
}

function buildPlan(input) {
    const resultsWanted = positiveInt(input.results_wanted, 20);
    const maxPages = Math.min(positiveInt(input.max_pages, 10), MAX_PAGES_LIMIT);
    const location = String(input.location ?? '').trim();

    if (location) {
        return {
            mode: 'location',
            location,
            resultsWanted,
            maxPages,
            searchUrl: buildSearchUrl({
                location,
                propertyType: input.propertyType,
                operation: input.operation,
            }),
        };
    }

    const url = normalizeSearchUrl(input.startUrl);
    if (!url) {
        throw new Error('Provide a search URL or a location.');
    }

    const parsed = parseSearchUrl(url.href);
    return {
        mode: 'url',
        parsed,
        resultsWanted,
        maxPages,
        searchUrl: parsed.searchUrl,
    };
}

await Actor.init();

const input = (await Actor.getInput()) ?? {};
let client;

try {
    const plan = buildPlan(input);
    const proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfiguration);
    const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
    client = new SiteClient(proxyUrl);

    log.info(
        `Starting Inmuebles24 run: ${plan.resultsWanted} listings, up to ${plan.maxPages} pages, source ${plan.searchUrl}`,
    );

    let body;
    if (plan.mode === 'location') {
        const resolved = await resolveLocation(client, plan.location);
        body = buildSearchBody({ ...structuredFilters(input), [resolved.field]: resolved.id });
        log.info(`Location resolved to ${resolved.label} (${resolved.field}).`);
    } else {
        for (const warning of plan.parsed.warnings) log.warning(warning);
        body = buildSearchBody({ ...plan.parsed.overrides });
        if (plan.parsed.locationSlug) {
            const resolved = await resolveLocation(client, plan.parsed.locationSlug);
            body[resolved.field] = resolved.id;
            log.info(`Location resolved to ${resolved.label} (${resolved.field}).`);
        }
        log.info(
            `Using URL filters: type=${body.tipoDePropiedad || 'all'}, operation=${body.tipoDeOperacion}, location=${plan.parsed.locationSlug ?? 'countrywide'}`,
        );
    }

    body.pagina = plan.parsed?.startPage ?? 1;

    const seen = new Set();
    let totalSaved = 0;
    let pagesFetched = 0;
    let stopReason = 'page limit';

    while (pagesFetched < plan.maxPages && totalSaved < plan.resultsWanted) {
        let response;
        try {
            response = await client.json(SEARCH_ENDPOINT, { method: 'POST', body });
        } catch (error) {
            throw new Error(`Search request failed on page ${body.pagina}: ${error.message}`);
        }

        const postings = Array.isArray(response.listPostings) ? response.listPostings : [];
        pagesFetched += 1;

        if (postings.length === 0) {
            stopReason = 'no more listings';
            break;
        }

        const scrapedAt = new Date().toISOString();
        const records = [];
        for (const posting of postings) {
            if (records.length + totalSaved >= plan.resultsWanted) break;
            const record = mapPosting(posting, {
                searchUrl: plan.searchUrl,
                scrapedAt,
                operationId: body.tipoDeOperacion,
            });
            if (!record || seen.has(record.id)) continue;
            seen.add(record.id);
            records.push(record);
        }

        if (records.length > 0) {
            await Actor.pushData(records);
            totalSaved += records.length;
            log.info(`Saved ${records.length} listings. Total: ${totalSaved}/${plan.resultsWanted}.`);
        }

        const totalPages = Number(response.paging?.totalPages ?? 0);
        if (totalSaved >= plan.resultsWanted) {
            stopReason = 'result limit';
            break;
        }
        if (totalPages > 0 && body.pagina >= totalPages) {
            stopReason = 'last page';
            break;
        }

        body.pagina += 1;
        await delay(400);
    }

    if (totalSaved === 0) {
        throw new Error('No listings were collected. Check the search URL or location and run again.');
    }

    log.info(
        `Finished: ${totalSaved} listings, ${pagesFetched} API pages (${PAGE_SIZE} per page max), stopped by ${stopReason}.`,
    );
} catch (error) {
    log.error(`Run failed: ${error.message}`);
    await client?.close();
    await Actor.fail(error.message);
}

await client?.close();
await Actor.exit();
