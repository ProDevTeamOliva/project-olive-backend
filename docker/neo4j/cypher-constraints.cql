CREATE CONSTRAINT user_unique_login IF NOT EXISTS ON (n:User) ASSERT n.login IS UNIQUE;
CREATE CONSTRAINT user_unique_sessionUserID IF NOT EXISTS ON (n:User) ASSERT n.sessionUserID IS UNIQUE;
