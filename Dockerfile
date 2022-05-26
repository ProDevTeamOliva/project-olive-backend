FROM node:16.14.0

ARG COMPOSE_PROFILES=${COMPOSE_PROFILES}
WORKDIR /opt/chattermatter
COPY . .
# RUN if [ -z "${COMPOSE_PROFILES}" ] ; then echo PRODUCTION=1 >> /etc/environment && export NODE_ENV=production ; fi
RUN if [ -z "${COMPOSE_PROFILES}" ] ; then export NODE_ENV=production ; fi
RUN yarn install

CMD if [ -z "${COMPOSE_PROFILES}" ] ; then yarn prod ; else yarn start ; fi
