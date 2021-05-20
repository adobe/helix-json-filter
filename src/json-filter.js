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
const { Response } = require('@adobe/helix-universal');

const TYPE_KEY = ':type';

const VERSION_KEY = ':version';

const NAMES_KEY = ':names';

function jsonFilter(query, log) {
  const {
    limit,
    offset = 0,
    sheet = [],
  } = query;

  function filter(dataStruct) {
    // we ignore original limit and offset for now
    const filtered = limit
      ? dataStruct.data.slice(offset, limit + offset)
      : dataStruct.data.slice(offset);
    return {
      total: dataStruct.total,
      offset,
      limit: filtered.length,
      data: filtered,
    };
  }

  return async (dataResponse) => {
    const json = await dataResponse.json();
    let body;
    let type = 'sheet';
    const sheetNames = [];
    // check if single sheet
    if (Array.isArray(json.data)) {
      body = filter(json);
    } else {
      const selectedSheet = Array.isArray(sheet) ? sheet : [sheet];
      const sheets = {};
      json[NAMES_KEY]
        .filter((name) => selectedSheet.length === 0 || selectedSheet.indexOf(name) >= 0)
        .forEach((name) => {
          sheets[name] = filter(json[name]);
          sheetNames.push(name);
        });
      if (sheetNames.length === 0) {
        log.info(`filtered result does not contain selected sheet(s): ${selectedSheet.join(',')}`);
        return new Response('', {
          status: 404,
        });
      } else if (sheetNames.length === 1) {
        body = sheets[sheetNames[0]];
      } else {
        type = 'multi-sheet';
        body = {
          ...sheets,
          [VERSION_KEY]: 3,
          [NAMES_KEY]: sheetNames,
        };
      }
      body[TYPE_KEY] = type;
    }
    return new Response(JSON.stringify(body), {
      headers: {
        'content-type': 'application/json',
        'x-helix-data-type': type,
        'x-helix-data-version': '3',
        'x-helix-sheet-names': sheetNames.join(','),
      },
    });
  };
}

module.exports = jsonFilter;
