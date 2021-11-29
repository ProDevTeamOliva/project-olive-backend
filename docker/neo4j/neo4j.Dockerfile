FROM neo4j:4.3.7

COPY ./wrapper.sh .

RUN ["chmod", "755", "./wrapper.sh"]

COPY ./cypher-constraints.cql /cyphers/

ENTRYPOINT ["bash", "wrapper.sh"]