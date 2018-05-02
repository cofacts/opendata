import fs from 'fs';
import crypto from 'crypto';
import elasticsearch from 'elasticsearch';
import csvStringify from 'csv-stringify';
import JSZip from 'jszip';

const ELASTICSEARCH_URL = 'http://localhost:62222';
const OUTPUT_DIR = './data';

const client = new elasticsearch.Client({
  host: ELASTICSEARCH_URL,
  log: 'info',
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
    ? crypto
        .createHash('sha256')
        .update(input, 'utf8')
        .digest('hex')
    : '';
}

async function scanIndex(index) {
  let result = [];

  const initialResult = await client.search({
    index,
    size: 200,
    scroll: '5m',
  });

  const totalCount = initialResult.hits.total;

  initialResult.hits.hits.forEach(hit => {
    result.push(hit);
  });

  while (result.length < totalCount) {
    const scrollResult = await client.scroll({
      scrollId: initialResult._scroll_id,
      scroll: '5m',
    });
    scrollResult.hits.hits.forEach(hit => {
      result.push(hit);
    });
  }

  return result;
}

/**
 * @param {object[]} articles
 * @returns {Promise<string>} Generated CSV string
 */
function dumpArticles(articles) {
  return generateCSV([
    [
      'id',
      'references', // array of strings
      'userIdsha256',
      'tags', // array of strings
      'normalArticleReplyCount',
      'appId',
      'text',
      'hyperlinks',
      'createdAt',
      'updatedAt',
      'lastRequestedAt',
    ],
    ...articles.map(({ _id, _source }) => [
      _id,
      _source.references.map(ref => ref.type).join(','),
      sha256(_source.userId),
      _source.tags.join(','),
      _source.normalArticleReplyCount,
      _source.appId,
      _source.text,
      (_source.hyperlinks || []).join(','),
      _source.createdAt,
      _source.updatedAt,
      _source.lastRequestedAt,
    ]),
  ]);
}

/**
 * @param {object[]} articles
 * @returns {Promise<string>} Generated CSV string
 */
function dumpArticleReplies(articles) {
  const csvInput = [
    [
      'articleId',
      'replyId',
      'userIdsha256',
      'negativeFeedbackCount',
      'positiveFeedbackCount',
      'replyType',
      'appId',
      'status',
      'createdAt',
      'updatedAt',
    ],
  ];

  articles.forEach(({ _source: { articleReplies }, _id }) => {
    if (!articleReplies) return;

    articleReplies.forEach(ar => {
      csvInput.push([
        _id,
        ar.replyId,
        sha256(ar.userId),
        ar.negativeFeedbackCount,
        ar.positiveFeedbackCount,
        ar.replyType,
        ar.appId,
        ar.status,
        ar.createdAt,
        ar.updatedAt,
      ]);
    });
  });

  return generateCSV(csvInput);
}

/**
 * @param {object[]} replies
 * @returns {Promise<string>} Generated CSV string
 */
async function dumpReplies(replies) {
  return generateCSV([
    ['id', 'type', 'reference', 'userIdsha256', 'appId', 'text', 'createdAt'],
    ...replies.map(({ _source, _id }) => [
      _id,
      _source.type,
      _source.reference,
      sha256(_source.userId),
      _source.appId,
      _source.text,
      _source.createdAt,
    ]),
  ]);
}

/**
 * @param {object[]} replyRequests
 * @returns {Promise<string>} Generated CSV string
 */
function dumpReplyRequests(replyRequests) {
  return generateCSV([
    ['articleId', 'userIdsha256', 'appId', 'createdAt'],
    ...replyRequests.map(({ _source }) => [
      _source.articleId,
      sha256(_source.userId),
      _source.appId,
      _source.createdAt,
    ]),
  ]);
}

/**
 * @param {object[]} articleReplyFeedbacks
 * @returns {Promise<string>} Generated CSV string
 */
function dumpArticleReplyFeedbacks(articleReplyFeedbacks) {
  return generateCSV([
    ['articleId', 'replyId', 'score', 'userIdsha256', 'appId', 'createdAt'],
    ...articleReplyFeedbacks.map(({ _source }) => [
      _source.articleId,
      _source.replyId,
      _source.score,
      sha256(_source.userId),
      _source.appId,
      _source.createdAt,
    ]),
  ]);
}

/**
 * @param {string} fileName The name of file to be put in a zip file
 * @returns {({string}) => (none)}
 */
function writeFile(fileName) {
  return data => {
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
      .on('finish', () => console.log(`${fileName} written.`));
  };
}

/**
 * Main process
 */

const articlePromise = scanIndex('articles');
articlePromise.then(dumpArticles).then(writeFile('articles.csv'));
articlePromise.then(dumpArticleReplies).then(writeFile('article_replies.csv'));

scanIndex('replies')
  .then(dumpReplies)
  .then(writeFile('replies.csv'));

scanIndex('replyrequests')
  .then(dumpReplyRequests)
  .then(writeFile('reply_requests.csv'));

scanIndex('articlereplyfeedbacks')
  .then(dumpArticleReplyFeedbacks)
  .then(writeFile('article_reply_feedbacks.csv'));
