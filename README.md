【Cofacts 真的假的】Open Datasets
=====

[![Build Status](https://travis-ci.org/cofacts/opendata.svg?branch=master)](https://travis-ci.org/cofacts/opendata)

Cofacts data sets includes instant messages reported by [Cofacts chatbot](https://line.me/R/ti/p/@cofacts) users, and the replies written by [Cofacts crowd-sourced fact-checking community](https://www.facebook.com/groups/cofacts/).

## Access the datasets

<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" /></a>

Cofacts Working Group distributes the dataset using Google Drive.

📥 **Please fill in [this form][form-link] to access the dataset.**

Cofacts 真的假的工作小組使用 Google Drive 發布 Cofacts 所提供資料。

📥 **請填寫[此份表單][form-link]存取 Cofacts 所提供資料。**

[form-link]: https://forms.gle/nYaaVSLDX5i5vScT7

Accessing the Cofacts data means that you agree to the Data User Agreement described in `LEGAL.md`. In general, **Everyone can freely share and adapt the dataset** as long as they follow the terms and conditions described in [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/) and in `LEGAL.md`.

In general, when you redistribute Cofacts data outside of LINE application, the attribution specified by Cofacts Working Group is:

> This data by Cofacts message reporting chatbot and crowd-sourced fact-checking community is licensed under CC BY-SA 4.0. To provide more info, please visit Cofacts LINE bot https://line.me/ti/p/@cofacts

除非以其他方式議定，否則 Cofacts 真的假的工作小組，針對在 LINE 之外的地方散布的 Cofacts 所提供資料，所指定的中文顯名聲明為：

> 本編輯資料取自「Cofacts 真的假的」訊息回報機器人與查證協作社群，採 CC BY-SA 4.0 授權提供。若欲補充資訊請訪問 Cofacts LINE bot https://line.me/ti/p/@cofacts

Please see `LEGAL.md` for more detail.

## Terms

`LEGAL.md` is the user agreement for Cofacts data users that leverages Cofacts data described here or via API.

`LICENSE` defines the license agreement for the source code in this repository.

## Formats

All CSV files are utf-8 encoded and compressed in a zip file.

We use [`csv-stringify`](https://www.npmjs.com/package/csv-stringify) to perform escape and handle quotes.

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

### `article_categories.csv`

Categories linked to this article.

| Field            | Data type  | Description |
| ---------------- | ---------- | ---- |
| `articleId`      | String     |                                    |
| `categoryId`     | String     |
| `aiConfidence`   | Number     | Confidence level by AI marking this category. Empty for crowd-sourced labels. |
| `aiModel` .      | String     | Name of the AI model marking this cateogry. Empty for crowd-sourced labels. |
| `userIdsha` .    | String     | The person that connected article and category. |
| `appId` .        | String     |  |
| `negativeFeedbackCount` | Integer     | Number of `article_category_feedbacks` that has score `-1` |
| `positiveFeedbackCount` | Integer     | Number of `article_category_feedbacks` that has score `1` |
| `status`                | Enum string     | `NORMAL`: The category and article are connected. `DELETED`: The category does not connect to the article anymore. |
| `createdAt`      | ISO time string     | The time when the reply is connected to the article |
| `updatedAt`             | ISO time string     | The latest date when the category's status is updated |

### `categories.csv`

| Field         | Data type | Description |
| ------------- | --------- | ----------- |
| `id`          | String    |             |
| `title`       | String    | Name of the category |
| `description` | Text      | Definition of the category |
| `createdAt`   | ISO time string     |   |
| `updatedAt`   | ISO time string     |   |

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

### `analytics.csv`

Usage (visit / show) statistics of website and Cofacts LINE bot.

LINE bot data starts from April 2nd, 2018; website data starts from May 3rd, 2017.

| Field       | Data type       | Description |
| ----------- | --------------- | ----------- |
| `type`      | Enum string     | Either `article` or `reply` |
| `docId`     | String          | Article ID or Reply ID that is being visited / shown |
| `date`      | ISO Time string | The date of usage, represented by start of the day (0:00:00+08:00) |
| `lineUser`  | Integer         | The number of LINE users who inspected this article / reply in Cofacts LINE bot in this date. May be empty if no such users |
| `lineVisit` | Integer         | The number of times this article / reply is inspected in Cofacts LINE bot in this date. May be empty if no visits |
| `webUser`   | Integer         | The number of web users who visited this article page (`/article/<docId>`) / reply page (`/reply/<docId>`) in Cofacts website in this date. May be empty if no such users |
| `webVisit`  | Integer         | The number of page views of this article page (`/article/<docId>`) / reply page (`/reply/<docId>`) in Cofacts website in this date. May be empty if no page views |
| `liffUser`  | Integer         | The sum of LINE users who opened this article / reply in LIFF used by downstream chatbots in this date. May be empty if no such users |
| `liffVisit` | Integer         | The sum of times this article / reply's LIFF is opened in downstream chatbots in this date. May be empty if no visits |

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
- There may also exist malicious users sending garbage `articles` into the database. [(Previous incident report)](https://hackmd.io/@cofacts/incidents)
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

### Restore production backup from Cofacts' Google Cloud Storage bucket

For Cofacts production website, the `nodes` directly is too large to backup using simple zip files.
Actually we use [Elasticsearch snapshots](https://www.elastic.co/guide/en/elasticsearch/reference/6.8/modules-snapshots.html)
and [Google Cloud Storage Repository plugin](https://www.elastic.co/guide/en/elasticsearch/plugins/6.8/repository-gcs.html) to perform backup and restore regularly.

Below is the steps setting up GCS repository and read backups from Google Cloud Storage.

#### First-time setup

First, spin up local elasticsearch & kibana using `docker-compose up`.

Secondly, ask a team member for service account credential `gcs.json`. Put the file to under `esdata/`.

Open another terminal and execute:

```
# Install gcs plugin
$ docker-compose exec elasticsearch bin/elasticsearch-plugin install repository-gcs
# Enter "y" when asked to continue

# Install service account credential
$ docker-compose exec elasticsearch bin/elasticsearch-keystore add-file gcs.client.default.credentials_file data/gcs.json

# Restart
$ docker-compose restart elasticsearch
```

After elasticsearch turns green, go to [Kibana](http://localhost:62224/app/kibana#/dev_tools/console)
and execute the following commands

```
# Run in Kibana

# Initialize snapshot respository named "cofacts" as GCS repository.
# Since we only read from the repository, turn on "readonly" flag.
#
PUT _snapshot/cofacts
{
  "type": "gcs",
  "settings": {
    "bucket": "rumors-db",
    "readonly": true
  }
}
```

#### Loading snapshot from GCS

Before publishing opendata, update your elasticsearch with the following commands in Kibana.

```
# Gets all snapshots in the repository
GET /_snapshot/cofacts/_all?verbose=false
```

Find the latest snapshot name (like `2020-07-05` below), then run the following command to
restore the snapshot to your local Elasticsearch indices.

```
# You may need to remove all your local Elasticsearch indices before restore
DELETE /_all

# 2020-07-05 is the snapshot name.
#
POST /_snapshot/cofacts/2020-07-05/_restore
{
  "indices": "*,-urls*"
}
```

To find out current recovery progress, run this:

```
GET /_recovery?human&filter_path=*.shards.stage,*.shards.index.size.percent
```

After all indices are restored, run `npm start` in CLI to generate opendata files.
