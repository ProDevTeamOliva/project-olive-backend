ARG NEO4J_IMAGE

FROM ${NEO4J_IMAGE}

COPY ./wrapper.sh .

RUN ["chmod", "755", "./wrapper.sh"]

COPY ./cypher-constraints.cql /cyphers/

ENTRYPOINT ["bash", "wrapper.sh"]