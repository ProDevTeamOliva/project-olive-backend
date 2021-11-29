FROM neo4j:4.3.7

#COPY ./files/*.jar /var/lib/neo4j/plugins/

#RUN chmod 755 /cypher-runner/cypher-runner.sh && \
#    chmod 755 /docker-entrypoint.sh && \
#    echo 'dbms.security.procedures.unrestricted=algo.*,apoc.*' >> /var/lib/neo4j/conf/neo4j.conf

# https://github.com/neo4j/docker-neo4j/issues/166#issuecomment-486890785
COPY ./wrapper.sh .

RUN ["chmod", "755", "./wrapper.sh"]

COPY ./cypher-constraints.cql /cyphers/

ENTRYPOINT ["bash", "wrapper.sh"]