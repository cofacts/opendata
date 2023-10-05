import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import crypto from 'crypto';
import elasticsearch from '@elastic/elasticsearch';

// eslint-import-resolve does not support `exports` in package.json.
// eslint-disable-next-line import/no-unresolved
import { stringify as csvStringify } from 'csv-stringify/sync';
import JSZip from 'jszip';

const ELASTICSEARCH_URL = 'http://localhost:62223';
const OUTPUT_DIR = './data';

const client = new elasticsearch.Client({
  node: ELASTICSEARCH_URL,
});

/**
 * @param {string} input
 * @returns {string} - input's sha256 hash hex string. Empty string if input is falsy.
 */
function sha256(input) {
  return input
    ? crypto.createHash('sha256').update(input, 'utf8').digest('hex')
    : '';
}

async function* scanIndex(index) {
  let processedCount = 0;

  const { body: initialResult } = await client.search({
    index,
    size: 200,
    scroll: '5m',
  });

  const totalCount = initialResult.hits.total;

  for (const hit of initialResult.hits.hits) {
    processedCount += 1;
    yield hit;
  }

  while (processedCount < totalCount) {
    const { body: scrollResult } = await client.scroll({
      scrollId: initialResult._scroll_id,
      scroll: '5m',
    });
    for (const hit of scrollResult.hits.hits) {
      processedCount += 1;
      yield hit;
      if (processedCount % 100000 === 0) {
        console.info(`${index}:\t${processedCount}/${totalCount}`);
      }
    }
  }
}

/**
 * @param {AsyncIterable} articles
 * @returns {Promise<string>} Generated CSV string
 */
async function* dumpArticles(articles) {
  yield csvStringify([
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
  ]);
  for await (const { _source, _id } of articles) {
    yield csvStringify([
      [
        _id,
        _source.references.map((ref) => ref.type).join(','),
        sha256(_source.userId),
        _source.normalArticleReplyCount,
        _source.appId,
        _source.text,
        _source.createdAt,
        _source.updatedAt,
        _source.lastRequestedAt,
      ],
    ]);
  }
}

/**
 * @param {AsyncIterable} articles
 * @returns {Promise<string>} Generated CSV string
 */
async function* dumpArticleHyperlinks(articles) {
  yield csvStringify([['articleId', 'url', 'normalizedUrl', 'title']]);

  for await (const { _source, _id } of articles) {
    for (const hyperlink of _source.hyperlinks || []) {
      yield csvStringify([
        [_id, hyperlink.url, hyperlink.normalizedUrl, hyperlink.title],
      ]);
    }
  }
}

/**
 * @param {AsyncIterable} articles
 * @returns {Promise<string>} Generated CSV string
 */
async function* dumpArticleCategories(articles) {
  yield csvStringify([
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
  ]);

  for await (const { _source, _id } of articles) {
    for (const ac of _source.articleCategories || []) {
      yield csvStringify([
        [
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
        ],
      ]);
    }
  }
}

/**
 * @param {AsyncIterator} articles
 * @returns {Promise<string>} Generated CSV string
 */
async function* dumpArticleReplies(articles) {
  yield csvStringify([
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
  ]);

  for await (const { _source, _id } of articles) {
    for (const ar of _source.articleReplies || []) {
      yield csvStringify([
        [
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
        ],
      ]);
    }
  }
}

/**
 * @param {AsyncIterable} replies
 * @returns {Promise<string>} Generated CSV string
 */
async function* dumpReplies(replies) {
  yield csvStringify([
    ['id', 'type', 'reference', 'userIdsha256', 'appId', 'text', 'createdAt'],
  ]);

  for await (const { _source, _id } of replies) {
    yield csvStringify([
      [
        _id,
        _source.type,
        _source.reference,
        sha256(_source.userId),
        _source.appId,
        _source.text,
        _source.createdAt,
      ],
    ]);
  }
}

/**
 * @param {AsyncIterable} replies
 * @returns {Promise<string>} Generated CSV string
 */
async function* dumpReplyHyperlinks(replies) {
  yield csvStringify([['replyId', 'url', 'normalizedUrl', 'title']]);

  for await (const { _source, _id } of replies) {
    for (const hyperlink of _source.hyperlinks || []) {
      yield csvStringify([
        [_id, hyperlink.url, hyperlink.normalizedUrl, hyperlink.title],
      ]);
    }
  }
}

/**
 * @param {object[]} categories
 * @returns {Promise<string>} Generated CSV string
 */
async function* dumpCategories(categories) {
  yield csvStringify([
    ['id', 'title', 'description', 'createdAt', 'updatedAt'],
  ]);

  for await (const { _id, _source } of categories) {
    yield csvStringify([
      [
        _id,
        _source.title,
        _source.description,
        _source.createdAt,
        _source.updatedAt,
      ],
    ]);
  }
}

/**
 * @param {AsyncIterable} replyRequests
 * @returns {Promise<string>} Generated CSV string
 */
async function* dumpReplyRequests(replyRequests) {
  yield csvStringify([
    [
      'articleId',
      'reason',
      'positiveFeedbackCount',
      'negativeFeedbackCount',
      'userIdsha256',
      'appId',
      'createdAt',
    ],
  ]);

  for await (const { _source } of replyRequests) {
    yield csvStringify([
      [
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
      ],
    ]);
  }
}

/**
 * @param {AsyncIterable} articleReplyFeedbacks
 * @returns {Promise<string>} Generated CSV string
 */
async function* dumpArticleReplyFeedbacks(articleReplyFeedbacks) {
  yield csvStringify([
    [
      'articleId',
      'replyId',
      'score',
      'comment',
      'userIdsha256',
      'appId',
      'createdAt',
    ],
  ]);

  for await (const { _source } of articleReplyFeedbacks) {
    yield csvStringify([
      [
        _source.articleId,
        _source.replyId,
        _source.score,
        _source.comment,
        sha256(_source.userId),
        _source.appId,
        _source.createdAt,
      ],
    ]);
  }
}

/**
 * @param {AsyncIterable} analytics
 * @returns {Promise<string>} Generated CSV string
 */
async function* dumpAnalytics(analytics) {
  yield csvStringify([
    [
      'type',
      'docId',
      'date',
      'lineUser',
      'lineVisit',
      'webUser',
      'webVisit',
      'liffUser',
      'liffVisit',
    ],
  ]);

  for await (const { _source } of analytics) {
    yield csvStringify([
      [
        _source.type,
        _source.docId,
        _source.date,
        _source.stats.lineUser,
        _source.stats.lineVisit,
        _source.stats.webUser,
        _source.stats.webVisit,
        (_source.stats.liff || []).reduce((sum, { user }) => sum + user, 0),
        (_source.stats.liff || []).reduce((sum, { visit }) => sum + visit, 0),
      ],
    ]);
  }
}

/**
 * @param {string} fileName The name of file to be put in a zip file
 * @returns {(source: AsyncIterable) => void}
 */
function writeFile(fileName) {
  return (source) => {
    const zip = new JSZip();
    zip.file(fileName, Readable.from(source), { binary: false });

    return new Promise((resolve) => {
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
        .on('finish', () => {
          console.info(`${fileName}.zip written.`);
          resolve(fileName);
        });
    });
  };
}

/**
 * Main process
 */
pipeline(scanIndex('articles'), dumpArticles, writeFile('articles.csv'));
pipeline(
  scanIndex('articles'),
  dumpArticleReplies,
  writeFile('article_replies.csv')
);
pipeline(
  scanIndex('articles'),
  dumpArticleHyperlinks,
  writeFile('article_hyperlinks.csv')
);
pipeline(
  scanIndex('articles'),
  dumpArticleCategories,
  writeFile('article_categories.csv')
);

pipeline(scanIndex('replies'), dumpReplies, writeFile('replies.csv'));
pipeline(
  scanIndex('replies'),
  dumpReplyHyperlinks,
  writeFile('reply_hyperlinks.csv')
);

pipeline(
  scanIndex('replyrequests'),
  dumpReplyRequests,
  writeFile('reply_requests.csv')
);

pipeline(scanIndex('categories'), dumpCategories, writeFile('categories.csv'));

pipeline(
  scanIndex('articlereplyfeedbacks'),
  dumpArticleReplyFeedbacks,
  writeFile('article_reply_feedbacks.csv')
);

pipeline(scanIndex('analytics'), dumpAnalytics, writeFile('analytics.csv'));
