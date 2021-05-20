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
const { Response } = require('@adobe/helix-universal');
const jsonFilter = require('../src/json-filter.js');

const TEST_DATA = [];
for (let i = 0; i < 50; i += 1) {
  const row = {};
  TEST_DATA.push(row);
  for (let j = 0; j < 4; j += 1) {
    row[`col${j}`] = `cell(${i},${j})`;
  }
}

const TEST_SINGLE_SHEET = {
  offset: 0,
  limit: TEST_DATA.length,
  total: TEST_DATA.length,
  data: TEST_DATA,
};

const TEST_MULTI_SHEET = {
  ':names': ['sheet1', 'sheet2'],
  sheet1: TEST_SINGLE_SHEET,
  sheet2: TEST_SINGLE_SHEET,
};

describe('JSON Filter test', () => {
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
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
      'x-helix-data-type': 'sheet',
      'x-helix-data-version': '3',
      'x-helix-sheet-names': '',
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
      'x-helix-data-type': 'multi-sheet',
      'x-helix-data-version': '3',
      'x-helix-sheet-names': 'sheet1,sheet2',
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
      offset: 5,
      limit: 10,
      total: TEST_DATA.length,
      data: TEST_DATA.slice(5, 15),
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
      'x-helix-data-type': 'sheet',
      'x-helix-data-version': '3',
      'x-helix-sheet-names': '',
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
      offset: 5,
      limit: TEST_DATA.length - 5,
      total: TEST_DATA.length,
      data: TEST_DATA.slice(5),
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
      'x-helix-data-type': 'sheet',
      'x-helix-data-version': '3',
      'x-helix-sheet-names': '',
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
      offset: 0,
      limit: 5,
      total: TEST_DATA.length,
      data: TEST_DATA.slice(0, 5),
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
      'x-helix-data-type': 'sheet',
      'x-helix-data-version': '3',
      'x-helix-sheet-names': '',
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
      'x-helix-data-type': 'multi-sheet',
      'x-helix-data-version': '3',
      'x-helix-sheet-names': 'sheet1,sheet2',
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
      'x-helix-data-type': 'sheet',
      'x-helix-data-version': '3',
      'x-helix-sheet-names': 'sheet1',
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
  });
});
