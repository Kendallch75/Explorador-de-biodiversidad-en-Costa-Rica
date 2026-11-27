FROM solr:9.7

USER root

# JTS is required by SpatialRecursivePrefixTreeFieldType to index and query arbitrary WKT POLYGONs
RUN curl -fsSL -o /opt/solr/server/solr-webapp/webapp/WEB-INF/lib/jts-core-1.19.0.jar \
    https://repo1.maven.org/maven2/org/locationtech/jts/jts-core/1.19.0/jts-core-1.19.0.jar \
    && chown solr:solr /opt/solr/server/solr-webapp/webapp/WEB-INF/lib/jts-core-1.19.0.jar

USER solr
