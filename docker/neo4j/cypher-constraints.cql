CREATE CONSTRAINT user_unique_username IF NOT EXISTS ON (n:User) ASSERT n.username IS UNIQUE;
CREATE CONSTRAINT user_unique_sessionUserID IF NOT EXISTS ON (n:User) ASSERT n.sessionUserID IS UNIQUE;
