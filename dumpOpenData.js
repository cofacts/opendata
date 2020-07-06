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
    ? crypto
        .createHash('sha256')
        .update(input, 'utf8')
        .digest('hex')
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

  initialResult.hits.hits.forEach(hit => {
    result.push(hit);
  });

  while (result.length < totalCount) {
    const { body: scrollResult } = await client.scroll({
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
      'normalArticleReplyCount',
      'appId',
      'text',
      'createdAt',
      'updatedAt',
      'lastRequestedAt',
    ],
    ...articles.map(({ _id, _source }) => [
      _id,
      _source.references.map(ref => ref.type).join(','),
      sha256(_source.userId),
      _source.normalArticleReplyCount,
      _source.appId,
      _source.text,
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
function dumpArticleHyperlinks(articles) {
  return generateCSV([
    ['articleId', 'url', 'normalizedUrl', 'title'],
    ...articles.flatMap(({ _id, _source }) =>
      (_source.hyperlinks || []).map(hyperlink => [
        _id,
        hyperlink.url,
        hyperlink.normalizedUrl,
        hyperlink.title,
      ])
    ),
  ]);
}

/**
 * @param {object[]} articles
 * @returns {Promise<string>} Generated CSV string
 */
function dumpArticleCategories(articles) {
  return generateCSV([
    [
      'articleId',
      'categoryId',
      'aiConfidence',
      'aiModel',
      'userIdsha',
      'appId',
      'negativeFeedbackCount',
      'positiveFeedbackCount',
      'status',
      'createdAt',
      'updatedAt',
    ],
    ...articles.flatMap(({ _id, _source }) =>
      (_source.articleCategories || []).map(ac => [
        _id,
        ac.categoryId,
        ac.aiConfidence,
        ac.aiModel,
        sha256(ac.userId),
        ac.appId,
        ac.negativeFeedbackCount,
        ac.positiveFeedbackCount,
        ac.status,
        ac.createdAt,
        ac.updatedAt,
      ])
    ),
  ]);
}

/**
 * @param {object[]} articles
 * @returns {Promise<string>} Generated CSV string
 */
function dumpArticleReplies(articles) {
  return generateCSV([
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
    ...articles.flatMap(({ _source: { articleReplies }, _id }) =>
      (articleReplies || []).map(ar => [
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
      ])
    ),
  ]);
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
 * @param {object[]} replies
 * @returns {Promise<string>} Generated CSV string
 */
function dumpReplyHyperlinks(replies) {
  return generateCSV([
    ['replyId', 'url', 'normalizedUrl', 'title'],
    ...replies.flatMap(({ _id, _source }) =>
      (_source.hyperlinks || []).map(hyperlink => [
        _id,
        hyperlink.url,
        hyperlink.normalizedUrl,
        hyperlink.title,
      ])
    ),
  ]);
}

/**
 * @param {object[]} categories
 * @returns {Promise<string>} Generated CSV string
 */
function dumpCategories(categories) {
  return generateCSV([
    ['id', 'title', 'description', 'createdAt', 'updatedAt'],
    ...categories.map(({ _id, _source }) => [
      _id,
      _source.title,
      _source.description,
      _source.createdAt,
      _source.updatedAt,
    ]),
  ]);
}

/**
 * @param {object[]} replyRequests
 * @returns {Promise<string>} Generated CSV string
 */
function dumpReplyRequests(replyRequests) {
  return generateCSV([
    [
      'articleId',
      'reason',
      'positiveFeedbackCount',
      'negativeFeedbackCount',
      'userIdsha256',
      'appId',
      'createdAt',
    ],
    ...replyRequests.map(({ _source }) => [
      _source.articleId,
      _source.reason,
      (_source.feedbacks || []).reduce((sum, { score }) => {
        if (score === 1) sum += 1;
        return sum;
      }, 0),
      (_source.feedbacks || []).reduce((sum, { score }) => {
        if (score === -1) sum += 1;
        return sum;
      }, 0),
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
    [
      'articleId',
      'replyId',
      'score',
      'comment',
      'userIdsha256',
      'appId',
      'createdAt',
    ],
    ...articleReplyFeedbacks.map(({ _source }) => [
      _source.articleId,
      _source.replyId,
      _source.score,
      _source.comment,
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
function dumpAnalytics(analytics) {
  return generateCSV([
    ['type', 'docId', 'date', 'lineUser', 'lineVisit', 'webUser', 'webVisit'],
    ...analytics.map(({ _source }) => [
      _source.type,
      _source.docId,
      _source.date,
      _source.stats.lineUser,
      _source.stats.lineVisit,
      _source.stats.webUser,
      _source.stats.webVisit,
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
      .on('finish', () => console.log(`${fileName}.zip written.`));
  };
}

/**
 * Main process
 */

const articlePromise = scanIndex('articles');
articlePromise.then(dumpArticles).then(writeFile('articles.csv'));
articlePromise.then(dumpArticleReplies).then(writeFile('article_replies.csv'));
articlePromise
  .then(dumpArticleHyperlinks)
  .then(writeFile('article_hyperlinks.csv'));
articlePromise
  .then(dumpArticleCategories)
  .then(writeFile('article_categories.csv'));

const replyPromise = scanIndex('replies');
replyPromise.then(dumpReplies).then(writeFile('replies.csv'));
replyPromise.then(dumpReplyHyperlinks).then(writeFile('reply_hyperlinks.csv'));

scanIndex('replyrequests')
  .then(dumpReplyRequests)
  .then(writeFile('reply_requests.csv'));

scanIndex('categories')
  .then(dumpCategories)
  .then(writeFile('categories.csv'));

scanIndex('articlereplyfeedbacks')
  .then(dumpArticleReplyFeedbacks)
  .then(writeFile('article_reply_feedbacks.csv'));

scanIndex('analytics')
  .then(dumpAnalytics)
  .then(writeFile('analytics.csv'));
