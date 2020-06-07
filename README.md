【Cofacts 真的假的】Open Datasets
=====

In order to facilitate academic research and analysis in fact-checking field under closed messaging platform, Cofacts releases all instant messages and replies in its database to the public domain, under [CC0 license](https://creativecommons.org/publicdomain/zero/1.0/). **Everyone can freely distribute and leverage the dataset**.

## Files and formats

Please find the open data files under `data/` directory. All CSV files are utf-8 encoded and compressed in a zip file.

### Fields across different entities

* `userIdsha` (string) Hashed user identifier.
* `appId` (string) Possible values:
    * `LEGACY_APP`: Articles collected before 2017-03.
    * `RUMORS_LINE_BOT`: Articles collected with the current LINE bot client after 2017-03.

The two fields together identifies an unique user across different CSV files. For instance, if one row (reply) in `replies.csv` and another row (feedback) in `article_reply_feedbacks.csv` have identical `userIdsha` and `appId`, the reply and the feedback are submitted by the same user.

## Fields

### `articles.csv`

The instant messages LINE bot users submitted into the database.

| Field            | Data type | Description |
| ----------------------- | -------- | ---- |
| `id`                      | String     |  |
| `references`              | Enum string     | Where the message is from. Currently the only possible value is `LINE`. |
| `userIdsha`                  | String     | Author of the article.|
| `appId`                   | String     |  |
| `normalArticleReplyCount` | Integer     | The number of replies are associated to this article, excluding the deleted reply associations. |
| `text`                    | Text     | The instant message text |
| `createdAt`               | ISO time string     | When the article is submitted to the database. |
| `updatedAt`               | ISO time string     | Preserved, currently identical to `createdAt` |
| `lastRequestedAt`         | ISO time string     | The submission time of the last `reply_request` is sent on the article, before the article is replied.  |

### `article_hyperlinks.csv`

Parsed hyperlink contents in each instant messages, parsed using [cofacts/url-resolver](https://github.com/cofacts/url-resolver/).
The data is used in Cofacts system for indexing and retrieving messages.

| Field            | Data type | Description |
| ---------------- | -------- | ---- |
| `articleId`      | String     |                                    |
| `url`            | String     | The URL string detected in article |
| `normalizedUrl`  | String     | Canonical URL after normalization process including unfolding shortened URLs |
| `title`          | String     | Title of the scrapped web content |

Note: Scrapped contents do not belong to Cofacts and are redistributed under research purposes.
The scrapping mechanism is not reliable either.
Researchers may need to implement their own scrapper if content is important in their research.

### `article_replies.csv`

Articles and replies are in has-and-belongs-to-many relationship. That is, an article can have multiple replies, and a reply can be connected to multiple similar articles.

`article_replies` is the "join table" between `articles` and `replies`, bringing `articleId` and `replyId` together, along with other useful properties related to this connection between an article and a reply.

One pair of `articleId`, `replyId` will map to exactly one `article_reply`.


| Field            | Data type | Description |
| --------------------- | -------- | - |
| `articleId`             | String     | Relates to `id` field of `articles` |
| `replyId`               | String     | Relates to `id` field of `replies` |
| `userId`                | String     | The user connecting the reply with the article |
| `negativeFeedbackCount` | Integer     | Number of `article_reply_feedbacks` that has score `-1` |
| `positiveFeedbackCount` | Integer     | Number of `article_reply_feedbacks` that has score `1` |
| `replyType`             | Enum string     | Duplicated from `replies`'s type. |
| `appId`                 | String     | |
| `status`                | Enum string     | `NORMAL`: The reply and article are connected. `DELETED`: The reply does not connect to the article anymore. |
| `createdAt`             | ISO time string     | The time when the reply is connected to the article |
| `updatedAt`             | ISO time string     | The latest date when the reply's status is updated |


### `replies.csv`

Editor's reply to the article.

| Field            | Data type | Description |
| --------- | -------- | - |
| `id`        | String     | |
| `type`      | Enum string     | Type of the reply chosen by the editor. `RUMOR`: The article contains rumor. `NOT_RUMOR`: The article contains fact. `OPINIONATED`: The article contains personal opinions. `NOT_ARTICLE`: The article should not be processed by Cofacts. |
| `reference` | Text     | For `RUMOR` and `NOT_RUMOR` replies: The reference to support the chosen `type` and `text`. For `OPINIONATED` replies: References containing different perspectives from the `article`. For `NOT_ARTICLE`: empty string. |
| `userId`    | String     | The editor that authored this reply. |
| `appId`     | String     | |
| `text`      | Text     | Reply text writtern by the editor |
| `createdAt` | ISO Time string     | When the reply is written |

### `reply_hyperlinks.csv`

Parsed hyperlink contents in reply text and references, parsed using [cofacts/url-resolver](https://github.com/cofacts/url-resolver/).
The data is used in Cofacts system for URL previews.

| Field            | Data type | Description |
| ---------------- | -------- | ---- |
| `replyId`      | String     |                                    |
| `url`            | String     | The URL string detected in article |
| `normalizedUrl`  | String     | Canonical URL after normalization process including unfolding shortened URLs |
| `title`          | String     | Title of the scrapped web content |

Note: Scrapped contents do not belong to Cofacts and are redistributed under research purposes.
The scrapping mechanism implementation is not reliable either.
Researchers may need to implement their own scrapper if content is important in their research.

### `reply_requests.csv`

Before an article is replied, users may submit  `reply_requests` to indicate that they want this article to be answered.

When an article is first submitted to the article, an reply request is also created. Any further queries to the same article submits new `reply_requests`.

An user can only submit one reply request to an article.

| Field            | Data type | Description |
| --------- | -------- | - |
| `articleId`        | String     | The target of the request |
| `reason`        | Text     | The reason why the user wants to submit this reply request |
| `positiveFeedbackCount`        | Text     | Number of editors think the reason is reasonable |
| `negativeFeedbackCount`        | Text     | Number of editors think the reason is nonsense |
| `createdAt` | ISO Time string     | When the reply request is issued |

### `article_reply_feedbacks.csv`

Editors and LINE bot users can express if a reply is useful by submitting `article_reply_feedbacks` toward a `article_reply` with score `1` or `-1`.

The feedback is actually submitted toward an `article_reply`, the connection between an article and a reply. This is because a reply can be connected to multiple articles. A reply that makes sense in one article does not necessarily mean that it is useful in answering another article. Therefore, the feedback count for a reply connecting to different articles are counted separately.

| Field            | Data type | Description |
| --------- | -------- | - |
| `articleId`        | String     | Relates to `articleId` of the target `article_reply` |
| `replyId`        | String     | Relates to `replyId` of the target `article_reply` |
| `score`        | Integer     | `1`: Useful. `-1`: Not useful. |
| `comment`        | Text     | Why the user chooses such score for this article reply |
| `createdAt` | ISO Time string     | When the feedback is submitted |

## License

<p xmlns:dct="http://purl.org/dc/terms/" xmlns:vcard="http://www.w3.org/2001/vcard-rdf/3.0#">
  <a rel="license"
     href="http://creativecommons.org/publicdomain/zero/1.0/">
    <img src="http://i.creativecommons.org/p/zero/1.0/88x31.png" style="border-style: none;" alt="CC0" />
  </a>
  <br />
  To the extent possible under law,
  <a rel="dct:publisher"
     href="https://cofacts.g0v.tw">
    <span property="dct:title">g0v Cofacts Project</span></a>
  has waived all copyright and related or neighboring rights to
  <span property="dct:title">Cofacts Dataset</span>.
This work is published from:
<span property="vcard:Country" datatype="dct:ISO3166"
      content="TW" about="https://cofacts.g0v.tw">
  Taiwan</span>.
</p>

## ⚠ [NOTICE] Caveats of using this data ⚠

The methodology we use to collect these data (i.e. [how Cofacts works](https://beta.hackfoldr.org/cofacts/https%253A%252F%252Fhackmd.io%252Fs%252FBJSdbUMpZ))
could have some impact on the data credibility.

![How cofacts work](https://i.imgur.com/e3Awc50.png)

Please keep in mind that all data in this dataset are user-generated,
thus is not free from noise and sampling bias coming from these sources:
- The distribution Cofacts' users may not reflect the real distribution of all LINE users in Taiwan.
- Users may not use Cofacts in the same way we want them to be.
  Some `articles` may not be actual messages circulating in LINE network.
- `replies` may contain factual error.
  All replies should be merely regarded as "responses to the original message (`article`) to provide different point of view".
  They are neither the "truth" nor the editor's personal opinion.
- There may also exist malicious users sending garbage `articles` into the database. [(Previous incident report)](https://hackmd.io/s/SkHt8JZ6l)
- The program to collect data and to generate dataset may contain error.
  The dataset may be inaccurate systematically in this way.

Lastly, the dataset is provided without warrenty.

THE DATASET IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE DATASET OR THE USE OR OTHER DEALINGS IN THE DATASET.

## Generating opendata files

We generate the opendata files by backing up production DB to local machine, then run this script on local machine.

According to [rumors-deploy](https://github.com/cofacts/rumors-deploy/), the production DB raw data
should be available in `rumors-deploy/volumes/db-production`. (Staging is in `db-staging` instead).

To backup production DB, Just tar the `rumors-deploy/volumes/db-production`, download to local machine, extract the tar file and put it in `esdata` directory of this project's root. `esdata` should contain only `nodes` directory now.

Run this to spin up a local elasticsearch for the backed up file

```
$ docker-compose up
```

This spins up elasticsearch on `localhost:62223`, with Kibana available in `localhost:62224`, using the data in `esdata`.

Lastly, run this to generate files to `data/` directory:

```
$ npm start
```
