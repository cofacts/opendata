# Cofacts opendata contributor

## Generating opendata files

We generate the opendata files by backing up production DB to local machine, then run this script on local machine.

### Spin up ElasticSearch on local environment.

Run this to spin up a local elasticsearch for the backed up file

```
$ docker-compose up
```

This spins up elasticsearch on `localhost:62223`, with Kibana available in `localhost:62224`.

### Restore production backup from Cofacts' Google Cloud Storage bucket

We use [Elasticsearch snapshots](https://www.elastic.co/guide/en/elasticsearch/reference/6.8/modules-snapshots.html)
and [Google Cloud Storage Repository plugin](https://www.elastic.co/guide/en/elasticsearch/plugins/6.8/repository-gcs.html) to perform backup and restore regularly.

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

### Loading snapshot from GCS

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

#### See progress

To find out current recovery progress, run this:

```
GET /_recovery?human&filter_path=*.shards.stage,*.shards.index.size.percent
```

### Generate CSV files
After all indices are restored, run `npm start` in CLI to generate opendata files.

All files are written to `/data` directory in `*.csv.zip`.
