#!/bin/bash

# When Elasticsearch cannot correctly mount, we need to clear corrupted translog
# before an index can be correctly read.
#
# Usage: $ ./clear-translog <index directory name>
# Example: $ ./clear-translog 3u8JeNJQSPaxxjTHk69qEQ
#

docker-compose run elasticsearch bin/elasticsearch-translog truncate -d data/nodes/0/indices/$1/0/translog/

