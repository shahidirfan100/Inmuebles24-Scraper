/**
 * Inmuebles24 search helpers: input to API payload and API postings to dataset
 * records. Browser code stays in main.js so this module is testable.
 */

export const SITE_ORIGIN = 'https://www.inmuebles24.com';
export const SEARCH_ENDPOINT = `${SITE_ORIGIN}/rplis-api/postings`;
export const LOCATION_ENDPOINT = `${SITE_ORIGIN}/rplis-api/locations/suggestLocation`;

export const PAGE_SIZE = 30;

/** Property type slugs used in Inmuebles24 URLs and their API ids. */
export const PROPERTY_TYPES = {
    departamentos: { id: '2', label: 'Departamentos' },
    casas: { id: '1', label: 'Casas' },
    terrenos: { id: '3', label: 'Terrenos' },
    oficinas: { id: '4', label: 'Oficinas' },
    'locales-comerciales': { id: '5', label: 'Locales comerciales' },
    'hacienda-quinta': { id: '6', label: 'Haciendas y quintas' },
    edificios: { id: '7', label: 'Edificios' },
    'bodegas-galpones': { id: '8', label: 'Bodegas y galpones' },
    suites: { id: '9', label: 'Suites' },
    consultorios: { id: '10', label: 'Consultorios' },
    quintas: { id: '11', label: 'Quintas' },
    'casas-en-condominio': { id: '12', label: 'Casas en condominio' },
    'departamentos-compartidos': { id: '13', label: 'Departamentos compartidos' },
    ranchos: { id: '14', label: 'Ranchos' },
    todos: { id: '', label: 'Todas las propiedades' },
};

/** Operation slugs used in Inmuebles24 URLs and their API ids. */
export const OPERATIONS = {
    venta: { id: '1', label: 'Venta' },
    renta: { id: '2', label: 'Renta' },
    traspaso: { id: '3', label: 'Traspaso' },
    'temporal-vacacional': { id: '4', label: 'Temporal o vacacional' },
};

const OPERATION_LABELS = {
    Venta: 'sale',
    Renta: 'rent',
    Traspaso: 'transfer',
    'Temporal/Vacacional': 'temporary',
};

/** Verified amenity ids from the site filter metadata. */
const AMENITY_SLUGS = {
    alberca: { field: 'general', id: '1066' },
    gimnasio: { field: 'amenidades', id: '21' },
    amueblado: { field: 'general', id: '2' },
    elevador: { field: 'general', id: '8' },
    mascotas: { field: 'general', id: '177' },
};

/** Province ids verified against the live search API. */
export const LOCATION_ALIASES = {
    cdmx: '69',
    'ciudad-de-mexico': '69',
    'estado-de-mexico': '75',
};

const MODIFIER_WORDS = new Set([
    'con',
    'mas',
    'menos',
    'hasta',
    'desde',
    'entre',
    'q',
    'pagina',
    'sin',
    'amueblado',
    'provincia',
]);

const UNIT_FIELDS = {
    recamara: 'bedrooms',
    recamaras: 'bedrooms',
    habitacion: 'bedrooms',
    habitaciones: 'bedrooms',
    bano: 'bathrooms',
    banos: 'bathrooms',
    estacionamiento: 'parking',
    estacionamientos: 'parking',
    cochera: 'parking',
    cocheras: 'parking',
    ambiente: 'rooms',
    ambientes: 'rooms',
};

const DEFAULT_SEARCH_BODY = {
    q: null,
    direccion: null,
    moneda: '',
    preciomin: null,
    preciomax: null,
    services: '',
    general: '',
    searchbykeyword: '',
    amenidades: '',
    caracteristicasprop: null,
    comodidades: '',
    disposicion: null,
    roomType: '',
    outside: '',
    areaPrivativa: '',
    areaComun: '',
    multipleRets: '',
    tipoDePropiedad: '2',
    subtipoDePropiedad: null,
    tipoDeOperacion: '1',
    garages: null,
    antiguedad: null,
    expensasminimo: null,
    expensasmaximo: null,
    withoutguarantor: null,
    habitacionesminimo: 0,
    habitacionesmaximo: 0,
    ambientesminimo: 0,
    ambientesmaximo: 0,
    banos: null,
    superficieCubierta: 1,
    idunidaddemedida: 1,
    metroscuadradomin: null,
    metroscuadradomax: null,
    tipoAnunciante: 'ALL',
    grupoTipoDeMultimedia: '',
    publicacion: null,
    sort: 'relevance',
    etapaDeDesarrollo: '',
    auctions: null,
    polygonApplied: null,
    idInmobiliaria: null,
    excludePostingContacted: '',
    banks: '',
    places: '',
    condominio: '',
    preTipoDeOperacion: '',
    pagina: 1,
    city: null,
    province: null,
    zone: null,
    valueZone: null,
    subZone: null,
    coordenates: null,
};

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function normalizeName(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/** Turn free text into an Inmuebles24 URL slug. */
export function slugify(value) {
    return normalizeName(value).replace(/\s+/g, '-');
}

function pickLongestSlug(tokens, index, table) {
    const candidates = Object.keys(table)
        .map((slug) => slug.split('-'))
        .sort((a, b) => b.length - a.length);
    for (const parts of candidates) {
        if (parts.every((part, offset) => tokens[index + offset] === part)) {
            return { slug: parts.join('-'), length: parts.length };
        }
    }
    return null;
}

function parsePositiveInt(value) {
    const digits = String(value ?? '').replace(/[^0-9]/g, '');
    if (!digits) return null;
    const number = Number(digits);
    return Number.isFinite(number) ? number : null;
}

/**
 * Accept only exact name matches or an exact leading label segment. A fuzzy
 * pick would return the wrong colonia.
 */
export function pickLocationSuggestion(query, suggestions) {
    if (!Array.isArray(suggestions) || suggestions.length === 0) return null;
    const wanted = normalizeName(query);
    const exact = suggestions.find((item) => normalizeName(item.name) === wanted);
    if (exact) return exact;
    const leading = suggestions.find(
        (item) => normalizeName(item.labelSuggest).split(' ').slice(0, wanted.split(' ').length).join(' ') === wanted,
    );
    return leading ?? null;
}

/**
 * Parse a search URL into API search overrides. Handles type, operation,
 * location, room counts, price bounds, keyword, and page number.
 */
export function parseSearchUrl(rawUrl) {
    const warnings = [];
    const url = new URL(rawUrl);
    const path = decodeURIComponent(url.pathname)
        .replace(/\.html$/i, '')
        .replace(/^\/+/, '');
    if (!path) {
        throw new Error('The search URL has no path. Open an Inmuebles24 search and copy the full address.');
    }

    let startPage = parsePositiveInt(url.searchParams.get('pagina')) ?? 1;
    const tokens = path.split('-').filter(Boolean);
    const overrides = {};
    let index = 0;

    const typeMatch = pickLongestSlug(tokens, index, PROPERTY_TYPES);
    if (typeMatch) {
        overrides.tipoDePropiedad = PROPERTY_TYPES[typeMatch.slug].id;
        index += typeMatch.length;
    } else if (tokens[index] === 'inmuebles') {
        overrides.tipoDePropiedad = '';
        index += 1;
    } else {
        warnings.push(`Unknown property type "${tokens[index] ?? ''}". Searching all property types.`);
        overrides.tipoDePropiedad = '';
        index += 1;
    }

    if (tokens[index] === 'en') index += 1;

    const operationMatch = pickLongestSlug(tokens, index, OPERATIONS);
    if (operationMatch) {
        overrides.tipoDeOperacion = OPERATIONS[operationMatch.slug].id;
        index += operationMatch.length;
    } else if (tokens[index]) {
        warnings.push(`Unknown operation "${tokens[index]}". Defaulting to sale.`);
        overrides.tipoDeOperacion = '1';
        index += 1;
    }

    let locationSlug = null;
    if (tokens[index] === 'en') {
        index += 1;
        const start = index;
        while (index < tokens.length && !MODIFIER_WORDS.has(tokens[index])) index += 1;
        const parts = tokens.slice(start, index);
        if (parts[parts.length - 1] === 'provincia') {
            parts.pop();
        }
        locationSlug = parts.join('-') || null;
    }

    const keywordParts = [];

    while (index < tokens.length) {
        const token = tokens[index];

        if (token === 'pagina') {
            const pageNumber = parsePositiveInt(tokens[index + 1]);
            if (pageNumber) startPage = pageNumber;
            index += 2;
            continue;
        }

        if (token === 'q') {
            const rest = tokens.slice(index + 1);
            const pageIndex = rest.indexOf('pagina');
            keywordParts.push(...(pageIndex >= 0 ? rest.slice(0, pageIndex) : rest));
            if (pageIndex >= 0) {
                startPage = parsePositiveInt(rest[pageIndex + 1]) ?? startPage;
            }
            break;
        }

        if (token === 'con' || token === 'mas' || token === 'menos' || token === 'sin') {
            const isMinimum = token !== 'menos' && token !== 'sin';
            let cursor = index + 1;
            if (tokens[cursor] === 'de') cursor += 1;

            const count = parsePositiveInt(tokens[cursor]);
            if (count !== null) {
                const unit = UNIT_FIELDS[tokens[cursor + 1]] ?? null;
                if (unit === 'bedrooms') overrides.habitacionesminimo = isMinimum ? count : 0;
                if (unit === 'bathrooms') overrides.banos = isMinimum ? count : -1;
                if (unit === 'parking') overrides.garages = isMinimum ? count : -1;
                if (unit === 'rooms') overrides.ambientesminimo = isMinimum ? count : 0;
                if (!unit) warnings.push(`Unrecognised filter "con ${count} ${tokens[cursor + 1] ?? ''}".`);
                index = cursor + 2;
                continue;
            }

            const amenity = AMENITY_SLUGS[tokens[cursor]];
            if (amenity) {
                overrides[amenity.field] = overrides[amenity.field]
                    ? `${overrides[amenity.field]},${amenity.id}`
                    : amenity.id;
                index = cursor + 1;
            } else {
                let end = cursor;
                while (
                    end < tokens.length &&
                    !MODIFIER_WORDS.has(tokens[end]) &&
                    parsePositiveInt(tokens[end]) === null
                ) {
                    end += 1;
                }
                warnings.push(`Filter "${tokens.slice(index, end).join('-')}" is not applied by this Actor.`);
                index = end;
            }
            continue;
        }

        if (token === 'desde' || token === 'hasta') {
            const value = parsePositiveInt(tokens[index + 1]);
            const currencyToken = tokens[index + 2];
            if (value !== null) {
                if (token === 'desde') overrides.preciomin = value;
                if (token === 'hasta') overrides.preciomax = value;
                if (currencyToken === 'dolares') {
                    warnings.push(
                        'USD price limits are treated as MXN because the site search API rejects a currency.',
                    );
                }
            }
            index += currencyToken === 'dolares' || currencyToken === 'pesos' ? 3 : 2;
            continue;
        }

        if (token === 'entre') {
            const min = parsePositiveInt(tokens[index + 1]);
            const conjunction = tokens[index + 2];
            const max = parsePositiveInt(tokens[index + 3]);
            if (min !== null) overrides.preciomin = min;
            if (conjunction === 'y' && max !== null) overrides.preciomax = max;
            index += 4;
            continue;
        }

        if (token === 'a' && tokens[index + 1] === 'estrenar') {
            overrides.antiguedad = '0';
            index += 2;
            continue;
        }

        if (token === 'provincia') {
            index += 1;
            continue;
        }

        warnings.push(`URL segment "${tokens[index]}" was not recognised and is ignored.`);
        index += 1;
    }

    if (keywordParts.length > 0) overrides.q = keywordParts.join(' ');
    overrides.pagina = startPage;

    return {
        overrides,
        locationSlug,
        startPage,
        warnings,
        searchUrl: url.href,
    };
}

/** Build the browser-facing search URL for the structured input mode. */
export function buildSearchUrl({ location, propertyType = 'departamentos', operation = 'venta' }) {
    const typeSlug = PROPERTY_TYPES[propertyType] ? propertyType : 'departamentos';
    const operationSlug = OPERATIONS[operation] ? operation : 'venta';
    const typePath = typeSlug === 'todos' ? 'inmuebles' : typeSlug;
    const city = String(location ?? '')
        .split(',')[0]
        .trim();
    const locationPath = city ? `-en-${slugify(city)}` : '';
    return `${SITE_ORIGIN}/${typePath}-en-${operationSlug}${locationPath}.html`;
}

/** Build the API payload from URL overrides plus structured filters. */
export function buildSearchBody(overrides = {}) {
    return { ...DEFAULT_SEARCH_BODY, ...overrides };
}

/**
 * Validate and normalise a user supplied URL.
 */
export function normalizeSearchUrl(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    if (url.hostname !== 'inmuebles24.com' && !url.hostname.endsWith('.inmuebles24.com')) {
        throw new Error(`Only inmuebles24.com URLs are supported, received: ${url.hostname}`);
    }
    url.hash = '';
    return url;
}

function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(number) ? number : null;
}

const NAMED_ENTITIES = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    sup2: '²',
    sup3: '³',
    ordm: 'º',
    deg: '°',
    aacute: 'á',
    eacute: 'é',
    iacute: 'í',
    oacute: 'ó',
    uacute: 'ú',
    ntilde: 'ñ',
    uuml: 'ü',
};

/** Decode the HTML entities that appear in listing text. */
export function decodeEntities(value) {
    if (value === null || value === undefined) return null;
    return String(value).replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi, (match, code) => {
        if (code[0] === '#') {
            const number = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
            return Number.isFinite(number) ? String.fromCodePoint(number) : match;
        }
        return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    });
}

function featureValue(posting, featureId) {
    const feature = posting.mainFeatures?.[featureId] ?? posting.developmentFeatures?.Desarrollo?.[featureId];
    return toNumber(feature?.value);
}

function locationChain(node) {
    const chain = [];
    let current = node ?? null;
    while (current) {
        chain.push(current);
        current = current.parent ?? null;
    }
    return chain;
}

function absoluteUrl(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${SITE_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

function compact(record) {
    const result = {};
    for (const [key, value] of Object.entries(record)) {
        if (value === null || value === undefined) continue;
        if (typeof value === 'string' && value.trim() === '') continue;
        if (Array.isArray(value) && value.length === 0) continue;
        result[key] = value;
    }
    return result;
}

/**
 * Convert one search API posting into a flat dataset record.
 * Unavailable values are omitted instead of stored as null.
 */
export function mapPosting(posting, { searchUrl, scrapedAt = new Date().toISOString(), operationId } = {}) {
    if (!posting?.postingId) return null;

    const priceBlocks = posting.priceOperationTypes ?? [];
    const priceBlock =
        priceBlocks.find((block) => block.operationType?.operationTypeId === String(operationId)) ??
        priceBlocks[0] ??
        null;
    const price = priceBlock?.prices?.[0] ?? null;
    const chain = locationChain(posting.postingLocation?.location);
    const byLabel = (label) => chain.find((item) => String(item.label ?? '').toUpperCase() === label)?.name ?? null;

    const pictures = posting.visiblePictures?.pictures ?? [];
    const images = [...new Set(pictures.map((picture) => picture.url730x532).filter(Boolean))].slice(0, 10);
    const published = posting.publication?.date ?? posting.publication?.startDate ?? null;

    return compact({
        id: String(posting.postingId),
        posting_code: posting.postingCode ?? null,
        title: decodeEntities(posting.title ?? posting.generatedTitle),
        url: absoluteUrl(posting.url),
        property_type: decodeEntities(posting.realEstateType?.name),
        operation: priceBlock?.operationType?.name
            ? (OPERATION_LABELS[priceBlock.operationType.name] ?? priceBlock.operationType.name.toLowerCase())
            : null,
        price: toNumber(price?.amount),
        currency: price?.currency ?? null,
        expenses: toNumber(posting.expenses?.amount),
        expenses_currency: posting.expenses?.currency ?? null,
        address: decodeEntities(posting.postingLocation?.address?.name),
        neighborhood: decodeEntities(byLabel('SUBZONA') ?? byLabel('ZONA') ?? byLabel('BARRIO')),
        city: decodeEntities(byLabel('CIUDAD')),
        state: decodeEntities(byLabel('PROVINCIA')),
        latitude: posting.postingLocation?.postingGeolocation?.geolocation?.latitude ?? null,
        longitude: posting.postingLocation?.postingGeolocation?.geolocation?.longitude ?? null,
        bedrooms: featureValue(posting, 'CFT2'),
        bathrooms: featureValue(posting, 'CFT3'),
        half_bathrooms: featureValue(posting, 'CFT4'),
        parking_spaces: featureValue(posting, 'CFT7'),
        construction_area_m2: featureValue(posting, 'CFT101'),
        lot_area_m2: featureValue(posting, 'CFT100'),
        antiquity_years: featureValue(posting, 'CFT5'),
        description: decodeEntities(posting.descriptionNormalized?.trim()),
        publisher_name: decodeEntities(posting.publisher?.name?.trim()),
        publisher_url: absoluteUrl(posting.publisher?.url),
        image: images[0] ?? null,
        images,
        has_video: posting.hasVideos === true ? true : null,
        has_tour: posting.hasTour === true ? true : null,
        posting_type: posting.postingType ?? null,
        status: posting.status ?? null,
        published_at: published,
        last_modified_at: posting.modified_date ?? null,
        scraped_at: scrapedAt,
        search_url: searchUrl ?? null,
        source: 'inmuebles24',
    });
}
