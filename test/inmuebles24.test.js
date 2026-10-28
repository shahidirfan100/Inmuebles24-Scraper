import { describe, expect, it } from 'vitest';

import {
    buildSearchBody,
    buildSearchUrl,
    decodeEntities,
    mapPosting,
    normalizeSearchUrl,
    parseSearchUrl,
    pickLocationSuggestion,
} from '../src/inmuebles24.js';

const base = 'https://www.inmuebles24.com';

describe('parseSearchUrl', () => {
    it('reads property type and operation', () => {
        const result = parseSearchUrl(`${base}/casas-en-renta.html`);
        expect(result.overrides.tipoDePropiedad).toBe('1');
        expect(result.overrides.tipoDeOperacion).toBe('2');
        expect(result.locationSlug).toBeNull();
        expect(result.startPage).toBe(1);
    });

    it('reads a location and room filters', () => {
        const result = parseSearchUrl(`${base}/departamentos-en-venta-en-polanco-con-2-recamaras-con-2-banos.html`);
        expect(result.locationSlug).toBe('polanco');
        expect(result.overrides.habitacionesminimo).toBe(2);
        expect(result.overrides.banos).toBe(2);
    });

    it('reads a price ceiling and amenity', () => {
        const result = parseSearchUrl(`${base}/departamentos-en-venta-en-polanco-con-alberca-hasta-3000000-pesos.html`);
        expect(result.overrides.preciomax).toBe(3000000);
        expect(result.overrides.general).toBe('1066');
    });

    it('reads keyword and page number', () => {
        const result = parseSearchUrl(`${base}/departamentos-en-venta-en-polanco-q-penthouse-pagina-3.html`);
        expect(result.overrides.q).toBe('penthouse');
        expect(result.startPage).toBe(3);
    });

    it('handles the all-property-types URL', () => {
        const result = parseSearchUrl(`${base}/inmuebles-en-venta-en-guadalajara.html`);
        expect(result.overrides.tipoDePropiedad).toBe('');
        expect(result.overrides.tipoDeOperacion).toBe('1');
        expect(result.locationSlug).toBe('guadalajara');
    });

    it('removes the province suffix from the location slug', () => {
        const result = parseSearchUrl(`${base}/departamentos-en-venta-en-guanajuato-provincia.html`);
        expect(result.locationSlug).toBe('guanajuato');
    });

    it('reports segments it cannot apply', () => {
        const result = parseSearchUrl(`${base}/departamentos-en-venta-en-polanco-con-cine-privado.html`);
        expect(result.warnings.join(' ')).toContain('cine-privado');
    });
});

describe('buildSearchBody', () => {
    it('keeps the documented defaults and applies overrides', () => {
        const body = buildSearchBody({ tipoDePropiedad: '1', tipoDeOperacion: '2', pagina: 4 });
        expect(body.tipoDePropiedad).toBe('1');
        expect(body.tipoDeOperacion).toBe('2');
        expect(body.pagina).toBe(4);
        expect(body.tipoAnunciante).toBe('ALL');
        expect(body.sort).toBe('relevance');
    });
});

describe('buildSearchUrl', () => {
    it('builds a sale URL for a location', () => {
        expect(buildSearchUrl({ location: 'Polanco', propertyType: 'departamentos', operation: 'venta' })).toBe(
            `${base}/departamentos-en-venta-en-polanco.html`,
        );
    });

    it('uses inmuebles for every property type', () => {
        expect(buildSearchUrl({ location: 'Jalisco', propertyType: 'todos', operation: 'renta' })).toBe(
            `${base}/inmuebles-en-renta-en-jalisco.html`,
        );
    });
});

describe('normalizeSearchUrl', () => {
    it('adds a protocol and rejects other hosts', () => {
        expect(normalizeSearchUrl('www.inmuebles24.com/departamentos-en-venta.html')?.hostname).toBe(
            'www.inmuebles24.com',
        );
        expect(() => normalizeSearchUrl('https://example.com/departamentos-en-venta.html')).toThrow(
            /Only inmuebles24\.com/,
        );
    });
});

describe('pickLocationSuggestion', () => {
    const suggestions = [
        {
            id: 'V1-D-1',
            name: 'Pedregal de Coyoacán',
            label: 'barrio',
            labelSuggest: 'Pedregal de Coyoacán, Coyoacán, Ciudad de México',
        },
        {
            id: 'V1-D-275358',
            name: 'Polanco',
            label: 'barrio',
            labelSuggest: 'Polanco, Miguel Hidalgo, Ciudad de México',
        },
    ];

    it('picks an exact name', () => {
        expect(pickLocationSuggestion('Polanco', suggestions)?.id).toBe('V1-D-275358');
    });

    it('does not accept a fuzzy lead match', () => {
        expect(pickLocationSuggestion('Ciudad de México', suggestions)).toBeNull();
    });
});

describe('decodeEntities', () => {
    it('decodes named and numeric entities', () => {
        expect(decodeEntities('Loft 90 m&sup2; &amp; terraza')).toBe('Loft 90 m² & terraza');
        expect(decodeEntities('Casa&#32;grande')).toBe('Casa grande');
        expect(decodeEntities(null)).toBeNull();
    });
});

describe('mapPosting', () => {
    const posting = {
        postingId: '151182747',
        postingCode: 'IAP7863983',
        title: 'Departamento en venta en Polanco',
        url: '/propiedades/clasificado/veclapin-departamento-151182747.html',
        realEstateType: { name: 'Departamentos' },
        postingType: 'PROPERTY',
        status: 'ONLINE',
        modified_date: '2026-10-07T00:00:00-0400',
        priceOperationTypes: [
            {
                operationType: { name: 'Venta', operationTypeId: '1' },
                prices: [{ amount: 24900000, currency: 'MN' }],
            },
        ],
        expenses: { amount: 7787, currency: 'MN' },
        mainFeatures: {
            CFT2: { value: '3' },
            CFT3: { value: '2' },
            CFT7: { value: '2' },
            CFT101: { value: '330' },
        },
        publisher: { name: 'Invest Inmuebles', url: '/inmobiliarias/invest-inmuebles_50184921-inmuebles.html' },
        visiblePictures: { pictures: [{ url730x532: 'https://img10.naventcdn.com/avisos/photo.jpg' }] },
        hasVideos: false,
        hasTour: false,
        descriptionNormalized: '  Descripcion  ',
        postingLocation: {
            address: { name: 'Aristóteles 80' },
            location: {
                name: 'Polanco',
                label: 'ZONA',
                parent: {
                    name: 'Miguel Hidalgo',
                    label: 'CIUDAD',
                    parent: { name: 'Ciudad de México', label: 'PROVINCIA' },
                },
            },
            postingGeolocation: { geolocation: { latitude: 19.43, longitude: -99.19 } },
        },
    };

    it('flattens the fields and drops null values', () => {
        const record = mapPosting(posting, { searchUrl: `${base}/departamentos-en-venta-en-polanco.html` });

        expect(record.id).toBe('151182747');
        expect(record.price).toBe(24900000);
        expect(record.currency).toBe('MN');
        expect(record.operation).toBe('sale');
        expect(record.bedrooms).toBe(3);
        expect(record.construction_area_m2).toBe(330);
        expect(record.neighborhood).toBe('Polanco');
        expect(record.city).toBe('Miguel Hidalgo');
        expect(record.state).toBe('Ciudad de México');
        expect(record.image).toBe('https://img10.naventcdn.com/avisos/photo.jpg');
        expect(record.url).toBe(`${base}/propiedades/clasificado/veclapin-departamento-151182747.html`);

        expect(record).not.toHaveProperty('half_bathrooms');
        expect(record).not.toHaveProperty('lot_area_m2');
        expect(record).not.toHaveProperty('published_at');
        expect(record).not.toHaveProperty('has_video');
        expect(record).not.toHaveProperty('has_tour');
    });

    it('returns null when the posting has no id', () => {
        expect(mapPosting({})).toBeNull();
    });

    it('selects the price for the searched operation', () => {
        const multiOperation = {
            ...posting,
            priceOperationTypes: [
                {
                    operationType: { name: 'Venta', operationTypeId: '1' },
                    prices: [{ amount: 24900000, currency: 'MN' }],
                },
                {
                    operationType: { name: 'Renta', operationTypeId: '2' },
                    prices: [{ amount: 45000, currency: 'MN' }],
                },
            ],
        };

        const record = mapPosting(multiOperation, { operationId: '2' });
        expect(record.operation).toBe('rent');
        expect(record.price).toBe(45000);
    });
});
