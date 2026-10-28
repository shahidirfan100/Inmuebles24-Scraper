## What does Inmuebles24 Scraper do?

Inmuebles24 Scraper collects property listings from Inmuebles24, Mexico's largest real estate portal, and saves them as structured records. Paste a search URL from inmuebles24.com, or enter a location with filters, and the Actor returns prices, area, bedrooms, bathrooms, parking, address hierarchy, coordinates, publisher details, photos, and listing URLs.

Use it for price research by colonia, rental tracking, investment screening, and market reports without copying listings by hand.

## Why use Inmuebles24 Scraper?

- **Complete listing records** - One row per property with price, currency, property type, operation, rooms, area, location, and contact-free publisher data.
- **Works with your own search** - Paste the exact search URL you already use, including filters such as price, bedrooms, amenities, and sort order.
- **Location mode** - Enter a city, colonia, or state and pick operation, property type, price range, bedrooms, bathrooms, parking, and listing age.
- **Pagination built in** - Collect up to 30 listings per page and continue until your result limit or page cap is reached.
- **Clean output** - The Actor leaves out fields the listing does not publish, so every record only contains real data.
- **Apify platform features** - Schedule runs, export to CSV, Excel, JSON, or XML, send results to webhooks, and read the dataset through the Apify API.

## What data can you extract from Inmuebles24?

| Field                   | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `id`                    | Inmuebles24 listing identifier                                      |
| `posting_code`          | Publisher reference code                                            |
| `title`                 | Listing title                                                       |
| `url`                   | Direct listing URL                                                  |
| `property_type`         | Apartment, house, land, office, and similar                         |
| `operation`             | sale, rent, transfer, or temporary                                  |
| `price`                 | Asking price                                                        |
| `currency`              | Price currency shown on the listing, usually `MN` for Mexican pesos |
| `expenses`              | Maintenance or HOA fee when published                               |
| `address`               | Street address when the listing publishes it                        |
| `neighborhood`          | Colonia or zone                                                     |
| `city`                  | Municipality or city                                                |
| `state`                 | State                                                               |
| `latitude`, `longitude` | Map coordinates                                                     |
| `bedrooms`              | Recámaras                                                           |
| `bathrooms`             | Full bathrooms                                                      |
| `half_bathrooms`        | Half bathrooms                                                      |
| `parking_spaces`        | Parking spaces                                                      |
| `construction_area_m2`  | Built area in square metres                                         |
| `lot_area_m2`           | Lot area in square metres                                           |
| `antiquity_years`       | Age of the property                                                 |
| `description`           | Listing description text                                            |
| `publisher_name`        | Agency or publisher name                                            |
| `publisher_url`         | Publisher profile URL                                               |
| `image`, `images`       | Main photo and up to 10 photo URLs                                  |
| `has_video`, `has_tour` | Media flags when available                                          |
| `posting_type`          | Individual property or development                                  |
| `status`                | Listing status, for example `ONLINE`                                |
| `last_modified_at`      | Last source update timestamp                                        |
| `scraped_at`            | When the record was collected                                       |
| `search_url`            | Search that produced the record                                     |
| `source`                | Always `inmuebles24`                                                |

## How to scrape Inmuebles24 listings

1. Open Inmuebles24 and set the filters you need, such as colonia, price, bedrooms, or amenities.
2. Copy the address bar URL, for example `https://www.inmuebles24.com/departamentos-en-venta-en-polanco.html`.
3. Paste it into **Search URL**.
4. Set **Maximum results** and **Maximum pages**.
5. Keep the residential proxy default and run the Actor.
6. Download the dataset or connect it to your workflow.

To search by location instead, leave the URL field untouched and fill **Location**. Location mode takes priority and ignores the URL.

## Input Parameters

| Parameter             | Type    | Required | Default                                                   | Description                                                            |
| --------------------- | ------- | -------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `startUrl`            | String  | No       | `https://www.inmuebles24.com/departamentos-en-venta.html` | Any Inmuebles24 search results URL. Used when Location is empty.       |
| `location`            | String  | No       | -                                                         | City, colonia, or state. Overrides the URL and uses the filters below. |
| `operation`           | String  | No       | `venta`                                                   | `venta`, `renta`, `traspaso`, or `temporal-vacacional`                 |
| `propertyType`        | String  | No       | `departamentos`                                           | Property type for location mode                                        |
| `minPrice`            | Integer | No       | -                                                         | Minimum price in Mexican pesos                                         |
| `maxPrice`            | Integer | No       | -                                                         | Maximum price in Mexican pesos                                         |
| `bedroomsMin`         | Integer | No       | -                                                         | Minimum bedrooms                                                       |
| `bathroomsMin`        | Integer | No       | -                                                         | Minimum bathrooms                                                      |
| `parkingMin`          | Integer | No       | -                                                         | Minimum parking spaces                                                 |
| `publishedWithinDays` | Integer | No       | -                                                         | Only listings published in the last N days                             |
| `results_wanted`      | Integer | No       | `20`                                                      | Maximum listings to save                                               |
| `max_pages`           | Integer | No       | `10`                                                      | Page cap. Each page holds up to 30 listings.                           |
| `proxyConfiguration`  | Object  | No       | Apify Residential proxy, Mexico                           | Proxy settings. Residential access is required for reliable runs.      |

## Output Data

| Field                   | Type    | Description                        |
| ----------------------- | ------- | ---------------------------------- |
| `id`                    | String  | Listing identifier                 |
| `title`                 | String  | Listing title                      |
| `url`                   | String  | Listing page URL                   |
| `price`                 | Number  | Asking price                       |
| `currency`              | String  | Source currency code               |
| `property_type`         | String  | Property type                      |
| `operation`             | String  | sale, rent, transfer, or temporary |
| `bedrooms`              | Integer | Bedrooms                           |
| `bathrooms`             | Integer | Bathrooms                          |
| `parking_spaces`        | Integer | Parking spaces                     |
| `construction_area_m2`  | Number  | Built area                         |
| `neighborhood`          | String  | Colonia or zone                    |
| `city`                  | String  | City or municipality               |
| `state`                 | String  | State                              |
| `publisher_name`        | String  | Publisher name                     |
| `image`                 | String  | Main photo URL                     |
| `images`                | Array   | Up to 10 photo URLs                |
| `description`           | String  | Listing description                |
| `latitude`, `longitude` | Number  | Coordinates                        |
| `scraped_at`            | String  | ISO collection timestamp           |

Fields that the source does not publish are left out of the record.

## Usage Examples

### Collect apartments for sale in Polanco

Paste a search URL and collect the first 20 listings.

```json
{
    "startUrl": "https://www.inmuebles24.com/departamentos-en-venta-en-polanco.html",
    "results_wanted": 20,
    "max_pages": 2
}
```

### Collect rental houses in Guadalajara by location

Use location mode with filters instead of a URL.

```json
{
    "location": "Guadalajara",
    "operation": "renta",
    "propertyType": "casas",
    "bedroomsMin": 2,
    "maxPrice": 45000,
    "results_wanted": 40,
    "max_pages": 3
}
```

### Follow a filtered URL across several pages

Every filter in the URL is preserved. Change the result limit to collect more pages.

```json
{
    "startUrl": "https://www.inmuebles24.com/departamentos-en-venta-en-polanco-con-2-recamaras-hasta-5000000-pesos.html",
    "results_wanted": 100,
    "max_pages": 5
}
```

## Sample Output

```json
{
    "id": "151182747",
    "posting_code": "IAP7863983",
    "title": "Departamento en Venta o Renta en Polanco",
    "url": "https://www.inmuebles24.com/propiedades/clasificado/veclapin-departamento-en-venta-o-renta-en-polanco-151182747.html",
    "property_type": "Departamentos",
    "operation": "sale",
    "price": 24900000,
    "currency": "MN",
    "expenses": 7787,
    "expenses_currency": "MN",
    "address": "Aristóteles 80, Polanco IV Secc, Miguel Hidalgo, 11550 Ciudad de México, Cdmx",
    "neighborhood": "Polanco IV Sección",
    "city": "Miguel Hidalgo",
    "state": "Ciudad de México",
    "latitude": 19.4303138,
    "longitude": -99.1938799,
    "bedrooms": 3,
    "bathrooms": 2,
    "half_bathrooms": 1,
    "parking_spaces": 2,
    "construction_area_m2": 330,
    "lot_area_m2": 330,
    "description": "PH dúplex en el corazón de Polanco, con terraza privada y dos lugares de estacionamiento.",
    "publisher_name": "Invest Inmuebles",
    "publisher_url": "https://www.inmuebles24.com/inmobiliarias/invest-inmuebles_50184921-inmuebles.html",
    "image": "https://img10.naventcdn.com/avisos/18/01/51/18/27/47/720x532/1633596229.jpg",
    "images": ["https://img10.naventcdn.com/avisos/18/01/51/18/27/47/720x532/1633596229.jpg"],
    "has_video": true,
    "posting_type": "PROPERTY",
    "status": "ONLINE",
    "last_modified_at": "2026-10-07T00:00:00-0400",
    "scraped_at": "2026-10-28T12:12:27.718Z",
    "search_url": "https://www.inmuebles24.com/departamentos-en-venta-en-polanco.html",
    "source": "inmuebles24"
}
```

## Tips for Best Results

- Keep the default residential proxy. The site blocks most datacenter traffic, and a Mexico proxy country gives the most consistent access.
- Start with 20 to 40 results to confirm your search returns the right properties, then raise the limit.
- Location mode ignores the URL. Clear the Location field when you want to use a pasted URL.
- The Actor reads filters from the URL, such as bedrooms, price, or amenities. The filter fields apply to location mode only.
- A page holds up to 30 listings. For 100 results set `results_wanted` to 100 and `max_pages` to 4 or more.
- Listing data changes often. Compare runs by `id` to find new, removed, or repriced properties.
- Some listings hide the exact address or contact details. Those fields stay out of the record instead of being guessed.

## Integrations

- **Google Sheets** - Export the dataset to a spreadsheet for price comparisons.
- **Webhooks** - Start a downstream workflow when a run finishes.
- **Make or Zapier** - Send new listings to a CRM, alert channel, or database.
- **Apify API** - Read datasets from your own applications and dashboards.
- **Schedules** - Run the same search daily or weekly to track market changes.

## Frequently Asked Questions

### Does Inmuebles24 offer an official public API for listings?

No. Inmuebles24 does not publish an open listing feed. This Actor returns the same search results in a structured dataset that you can query and export.

### Which Inmuebles24 URLs can I paste?

Any search results page, such as `departamentos-en-venta-en-polanco.html`, `casas-en-renta-en-guadalajara-con-2-recamaras.html`, or `inmuebles-en-venta-en-guadalajara.html`. Listing detail pages and other websites are not supported.

### Are prices converted between pesos and dollars?

No. Each record keeps the price and currency published by the listing. Most listings use `MN` for Mexican pesos.

### Can I collect the same search every day?

Yes. Save the input as a task and add a schedule. Use `id` to compare results between runs.

### Why is a field missing from some records?

The Actor omits fields the listing does not publish. Hidden addresses, missing maintenance fees, and absent room counts are common examples.

### How many listings can I collect in one run?

You can raise `results_wanted` and `max_pages` to collect hundreds of listings. Very large searches take longer and use more proxy traffic.

### Is it legal to collect Inmuebles24 data?

Collecting public listing data can be legal, but you are responsible for following applicable laws, the website terms, and privacy rules.

## Support

For issues or feature requests, use the Issues tab on the Actor page or contact the developer through Apify.

## Legal Notice

This Actor is designed for legitimate collection of publicly available property listings. Users are responsible for how they use the data and for complying with applicable laws and website terms.
