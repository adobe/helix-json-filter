/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */

const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');
const { Response } = require('@adobe/helix-universal');
const jsonFilter = require('../src/json-filter.js');

describe('JSON Filter test', () => {
  let TEST_DATA;
  let TEST_SINGLE_SHEET;
  let TEST_MULTI_SHEET;

  before(async () => {
    TEST_DATA = JSON.parse(await fs.readFile(path.resolve(__dirname, 'fixtures', 'test-data.json'), 'utf-8'));
    TEST_SINGLE_SHEET = {
      offset: 0,
      limit: TEST_DATA.length,
      total: TEST_DATA.length,
      data: TEST_DATA,
    };

    TEST_MULTI_SHEET = {
      ':names': ['sheet1', 'sheet2'],
      sheet1: TEST_SINGLE_SHEET,
      sheet2: TEST_SINGLE_SHEET,
    };
  });

  it('returns same response for single sheet with no query', async () => {
    const dataResponse = new Response(JSON.stringify(TEST_SINGLE_SHEET), {
      headers: {
        'content-type': 'application/json',
      },
    });

    const filter = jsonFilter({}, console);
    const resp = await filter(dataResponse);
    assert.strictEqual(resp.status, 200);
    assert.deepStrictEqual(await resp.json(), {
      offset: 0,
      limit: TEST_DATA.length,
      total: TEST_DATA.length,
      data: TEST_DATA,
      ':type': 'sheet',
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
    });
  });

  it('returns same response for multi single sheet with no query', async () => {
    const dataResponse = new Response(JSON.stringify(TEST_MULTI_SHEET), {
      headers: {
        'content-type': 'application/json',
      },
    });

    const filter = jsonFilter({}, console);
    const resp = await filter(dataResponse);
    assert.strictEqual(resp.status, 200);
    assert.deepStrictEqual(await resp.json(), {
      ':type': 'multi-sheet',
      ':version': 3,
      ':names': ['sheet1', 'sheet2'],
      sheet1: {
        offset: 0,
        limit: TEST_DATA.length,
        total: TEST_DATA.length,
        data: TEST_DATA,
      },
      sheet2: {
        offset: 0,
        limit: TEST_DATA.length,
        total: TEST_DATA.length,
        data: TEST_DATA,
      },
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
    });
  });

  it('filters response for single sheet with offset and limit', async () => {
    const dataResponse = new Response(JSON.stringify(TEST_SINGLE_SHEET), {
      headers: {
        'content-type': 'application/json',
      },
    });

    const filter = jsonFilter({ limit: 10, offset: 5 }, console);
    const resp = await filter(dataResponse);
    assert.strictEqual(resp.status, 200);
    assert.deepStrictEqual(await resp.json(), {
      ':type': 'sheet',
      offset: 5,
      limit: 10,
      total: TEST_DATA.length,
      data: TEST_DATA.slice(5, 15),
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
    });
  });

  it('filters response for single sheet with offset', async () => {
    const dataResponse = new Response(JSON.stringify(TEST_SINGLE_SHEET), {
      headers: {
        'content-type': 'application/json',
      },
    });

    const filter = jsonFilter({ offset: 5 }, console);
    const resp = await filter(dataResponse);
    assert.strictEqual(resp.status, 200);
    assert.deepStrictEqual(await resp.json(), {
      ':type': 'sheet',
      offset: 5,
      limit: TEST_DATA.length - 5,
      total: TEST_DATA.length,
      data: TEST_DATA.slice(5),
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
    });
  });

  it('filters response for single sheet with limit', async () => {
    const dataResponse = new Response(JSON.stringify(TEST_SINGLE_SHEET), {
      headers: {
        'content-type': 'application/json',
      },
    });

    const filter = jsonFilter({ limit: 5 }, console);
    const resp = await filter(dataResponse);
    assert.strictEqual(resp.status, 200);
    assert.deepStrictEqual(await resp.json(), {
      ':type': 'sheet',
      offset: 0,
      limit: 5,
      total: TEST_DATA.length,
      data: TEST_DATA.slice(0, 5),
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
    });
  });

  it('filter multiple sheets with limit and offset', async () => {
    const dataResponse = new Response(JSON.stringify(TEST_MULTI_SHEET), {
      headers: {
        'content-type': 'application/json',
      },
    });

    const filter = jsonFilter({ limit: 10, offset: 5 }, console);
    const resp = await filter(dataResponse);
    assert.strictEqual(resp.status, 200);
    assert.deepStrictEqual(await resp.json(), {
      ':type': 'multi-sheet',
      ':version': 3,
      ':names': ['sheet1', 'sheet2'],
      sheet1: {
        offset: 5,
        limit: 10,
        total: TEST_DATA.length,
        data: TEST_DATA.slice(5, 15),
      },
      sheet2: {
        offset: 5,
        limit: 10,
        total: TEST_DATA.length,
        data: TEST_DATA.slice(5, 15),
      },
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
    });
  });

  it('filter by sheet', async () => {
    const dataResponse = new Response(JSON.stringify(TEST_MULTI_SHEET), {
      headers: {
        'content-type': 'application/json',
      },
    });

    const filter = jsonFilter({ limit: 10, offset: 5, sheet: 'sheet1' }, console);
    const resp = await filter(dataResponse);
    assert.strictEqual(resp.status, 200);
    assert.deepStrictEqual(await resp.json(), {
      ':type': 'sheet',
      offset: 5,
      limit: 10,
      total: TEST_DATA.length,
      data: TEST_DATA.slice(5, 15),
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
    });
  });

  it('filter by unknown sheet returns 404', async () => {
    const dataResponse = new Response(JSON.stringify(TEST_MULTI_SHEET), {
      headers: {
        'content-type': 'application/json',
      },
    });

    const filter = jsonFilter({ sheet: 'foo' }, console);
    const resp = await filter(dataResponse);
    assert.strictEqual(resp.status, 404);
    assert.strictEqual(resp.headers.get('x-error'), 'filtered result does not contain selected sheet(s): foo');
  });
});
