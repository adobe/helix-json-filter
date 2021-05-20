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
const { promisify } = require('util');
const zlib = require('zlib');
const { Response } = require('@adobe/helix-universal');
const {
  S3Client,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');

const gunzip = promisify(zlib.gunzip);

/**
 * Fetches content from s3
 * @param {string} bucketId bucket id
 * @param {string} key the resource key
 * @param {Logger} log the logger
 * @return {Promise<Response>>} response buffer
 */
async function fetchS3(bucketId, key, log) {
  if (!bucketId) {
    throw new Error('Unknown bucketId, cannot fetch content');
  }
  if (!key) {
    throw new Error('Unknown key, cannot fetch content');
  }

  try {
    const s3 = new S3Client();
    const res = await s3.send(new GetObjectCommand({
      Bucket: bucketId,
      Key: key,
      // todo: add timeout
    }));
    let buffer = await new Response(res.Body, {}).buffer();
    if (res.ContentEncoding === 'gzip') {
      buffer = await gunzip(buffer);
    }
    const headers = {};
    if (res.LastModified) {
      headers['last-modified'] = res.LastModified.toUTCString();
    }
    if (res.ContentType) {
      headers['content-type'] = res.ContentType;
    }
    return new Response(buffer, {
      status: 200,
      headers,
    });
  } catch (e) {
    const code = e.Code || e.$metadata.httpStatusCode;
    if (code === 'AccessDenied' || code === 404) {
      log.info(`Could not find file at ${bucketId}/${key}: ${code}`);
      return new Response('', {
        status: 404,
      });
    } else {
      log.error(`Error while fetching file from ${bucketId}/${key}: ${code}`);
      return new Response('', {
        status: 502,
        headers: {
          'x-error': `error while fetching: ${code}`,
        },
      });
    }
  }
}

module.exports = fetchS3;
