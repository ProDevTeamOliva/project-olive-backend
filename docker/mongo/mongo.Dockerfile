FROM mongo:5.0.4

COPY ./init.js /docker-entrypoint-initdb.d/
