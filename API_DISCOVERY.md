# API discovery: Inmuebles24

## Selected API

- Endpoint: `POST https://www.inmuebles24.com/rplis-api/postings`
- Method: POST, JSON body
- Auth: none, but Cloudflare requires a `cf_clearance` cookie from a browser session on the same IP and user agent
- Pagination: `pagina` in the body, 30 postings per page, `paging.totalPages` in the response
- Location lookup: `GET /rplis-api/locations/suggestLocation?location_name=<text>&limit=20&suggestion_type=SEARCHABLE`
- Fields available: `listPostings` array with posting id, code, title, price and currency by operation, expenses, property type, main and development features, publisher, address hierarchy, geolocation, pictures, description, flags, status, and modification date
- Fields not previously collected by the old Remote.co actor: every real estate field, because the previous actor targeted a different website
- Field count: 30+ source fields mapped to 30 dataset fields

Response shape:

```json
{
    "paging": { "currentPage": 1, "totalPages": 11881, "total": 356408, "limit": 30 },
    "listPostings": [
        {
            "postingId": "151182747",
            "title": "...",
            "priceOperationTypes": [
                { "operationType": { "name": "Venta" }, "prices": [{ "amount": 24900000, "currency": "MN" }] }
            ],
            "mainFeatures": { "CFT2": { "value": "3" }, "CFT101": { "value": "330" } },
            "postingLocation": { "address": {}, "location": {}, "postingGeolocation": {} },
            "publisher": {},
            "visiblePictures": { "pictures": [] }
        }
    ]
}
```

## Request body

The front end sends a fixed object with Spanish keys. Confirmed defaults:

```json
{
    "q": null,
    "moneda": "",
    "preciomin": null,
    "preciomax": null,
    "tipoDePropiedad": "2",
    "subtipoDePropiedad": null,
    "tipoDeOperacion": "1",
    "garages": null,
    "habitacionesminimo": 0,
    "banos": null,
    "ambientesminimo": 0,
    "superficieCubierta": 1,
    "idunidaddemedida": 1,
    "metroscuadradomin": null,
    "metroscuadradomax": null,
    "tipoAnunciante": "ALL",
    "sort": "relevance",
    "publicacion": null,
    "pagina": 1,
    "province": null,
    "city": null,
    "zone": null,
    "subZone": null
}
```

Verified value maps:

- Property type: casas 1, departamentos 2, terrenos 3, oficinas 4, locales comerciales 5, hacienda quinta 6, edificio 7, bodega galpon 8, suite 9, consultorio 10, quinta 11, casa en condominio 12, departamento compartido 13, rancho 14
- Operation: venta 1, renta 2, traspaso 3, temporal vacacional 4
- Location levels from the suggestion endpoint: `provincia` maps to `province`, `departamento` to `city`, `barrio` to `zone`, `zona` to `subZone`
- `moneda` must stay empty. Any other value returns HTTP 500.

Confirmed search behaviors:

- `habitacionesminimo: 2` filters 2 or more bedrooms
- `banos: 2`, `garages: 1` filter by minimum count
- `preciomin` and `preciomax` are MXN amounts
- `publicacion: "7"` limits results to the last week
- `general: "1066"` is Alberca, `amenidades: "21"` is Gimnasio
- `q: "penthouse"` is a keyword search

## Why this source

The listing page is server-rendered, but the same data is served as JSON by the search API. This avoids HTML parsing and keeps pagination cheap. A detail page visit is not required because the search response already includes price, features, address hierarchy, coordinates, description, publisher, and photos.

## Rejected candidates

- Search page HTML and JSON-LD: works, but requires HTML parsing and does not include the full price and feature data in one place.
- `/rp-api/labs/v1/recommended`: recommendation data only, not search results.
- `/rplis-api/searching-event`, `/analytics/avisos_countImpressions.ajax`, `/metrics/api/v1/events`: telemetry endpoints, no listing data.
- `/rplis-api/map/postings`: same payload family as the search endpoint, used for map view only.

## Access findings

- Plain HTTP from a datacenter IP returns a Cloudflare managed challenge (HTTP 403, HTML).
- Headless Firefox and headless Chromium are challenged and do not pass.
- A stealth Chromium session (Patchright, headful under Xvfb) with a Mexico residential proxy passes the check.
- The `cf_clearance` cookie is HttpOnly and bound to the browser user agent and IP. The Actor reads cookies from the browser context, seeds them into an impit cookie jar, and reuses the same proxy URL and user agent for API calls.
- impit reads the API JSON. When a request is challenged, the Actor reloads the page, refreshes cookies, and retries once.
- Residential proxy country `MX` is required for a reliable pass. Without it the challenge often does not finish.

## Production shape

1. Patchright Chromium opens the site with the configured proxy.
2. The Actor waits for the managed challenge and reads the browser user agent, client hints, and cookies.
3. impit sends `POST /rplis-api/postings` with the same cookie jar, user agent, and client hints.
4. Pages are requested until `results_wanted` or `max_pages` is reached.
5. Records are pushed per page and duplicates are skipped by posting id.
