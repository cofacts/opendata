import fs from 'fs';
import crypto from 'crypto';
import elasticsearch from '@elastic/elasticsearch';
import csvStringify from 'csv-stringify';
import JSZip from 'jszip';

const ELASTICSEARCH_URL = 'http://localhost:62223';
const OUTPUT_DIR = './data';

const client = new elasticsearch.Client({
  node: ELASTICSEARCH_URL,
});

/**
 * @param {any[][]} input
 * @returns {Promise<string>} CSV content
 */
function generateCSV(input) {
  return new Promise((resolve, reject) => {
    csvStringify(input, (err, csvData) => {
      if (err) {
        return reject(err);
      }
      return resolve(csvData);
    });
  });
}

/**
 * @param {string} input
 * @returns {string} - input's sha256 hash hex string. Empty string if input is falsy.
 */
function sha256(input) {
  return input
    ? crypto.createHash('sha256').update(input, 'utf8').digest('hex')
    : '';
}

async function scanIndex(index) {
  let result = [];

  const { body: initialResult } = await client.search({
    index,
    size: 200,
    scroll: '5m',
  });

  const totalCount = initialResult.hits.total;

  initialResult.hits.hits.forEach((hit) => {
    result.push(hit);
  });

  while (result.length < totalCount) {
    const { body: scrollResult } = await client.scroll({
      scrollId: initialResult._scroll_id,
      scroll: '5m',
    });
    scrollResult.hits.hits.forEach((hit) => {
      result.push(hit);
    });
  }

  return result;
}

/**
 * @param {object[]} articles
 * @returns {Promise<string>} Generated CSV string
 */
function dumpUsers(users) {
  return generateCSV([
    [
      'userIdsha256',
      'name',
      'email',
      'facebookId',
      'githubId',
      'twitterId',
      'updatedAt',
    ],
    ...users.map(({ _id, _source }) => [
      sha256(_id),
      _source.name,
      _source.email,
      _source.facebookId,
      _source.githubId,
      _source.twitterId,
      _source.updatedAt,
    ]),
  ]);
}

/**
 * @param {string} fileName The name of file to be put in a zip file
 * @returns {({string}) => (none)}
 */
function writeFile(fileName) {
  return (data) => {
    const zip = new JSZip();
    zip.file(fileName, data);

    // Ref: https://stuk.github.io/jszip/documentation/howto/write_zip.html#in-nodejs
    //
    zip
      .generateNodeStream({
        type: 'nodebuffer',
        streamFiles: true,
        compression: 'DEFLATE',
        compressionOptions: { level: 8 },
      })
      .pipe(fs.createWriteStream(`${OUTPUT_DIR}/${fileName}.zip`))
      .on('finish', () => console.log(`${fileName}.zip written.`));
  };
}

/**
 * Main process
 */

scanIndex('users').then(dumpUsers).then(writeFile('users.csv'));
