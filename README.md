# Project Olive - Backend

### Project requires Node 16.x

<br>

## Setup
1. Make sure to use `yarn`

        yarn install

2. Create `.env` file and fill all of the necessary global variables (use `.env.sample` file as a sample)
3. Make sure you have `docker` and `docker-compose` installed and run this command from the root of the project (it will run MongoDB and Neo4j databases inside docker containers)

        docker-compose up -d

4. Make sure that directory `./public/pictures` exists
5. [OPTIONAL] You can fill database with sample data using this command

        nodejs fillDatabase.js
6. Run project

        yarn run start

<br>

## Development
### If you want to contribute to the project please run 
        configurehooks.sh
### It requires user to use specific branch and commit name convention. Both branch and commit has to start with right Jira Task ID
### F.e. Branch: `PO-123_your_branch_name`, Commit: `PO-123_your_commit_message`
### Commit prefix has to match branch prefix for it to be pushed to a remote branch
