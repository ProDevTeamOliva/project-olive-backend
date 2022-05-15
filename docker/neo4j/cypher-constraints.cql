CREATE CONSTRAINT user_unique_login IF NOT EXISTS ON (n:User) ASSERT n.login IS UNIQUE;
CREATE CONSTRAINT user_unique_sessionUserID IF NOT EXISTS ON (n:User) ASSERT n.sessionUserID IS UNIQUE;

CREATE CONSTRAINT post_unique_id IF NOT EXISTS ON (n:Post) ASSERT n.id IS UNIQUE;
CREATE CONSTRAINT message_unique_id IF NOT EXISTS ON (n:Message) ASSERT n.id IS UNIQUE;
CREATE CONSTRAINT user_unique_id IF NOT EXISTS ON (n:User) ASSERT n.id IS UNIQUE;
CREATE CONSTRAINT conversation_unique_id IF NOT EXISTS ON (n:Conversation) ASSERT n.id IS UNIQUE;
CREATE CONSTRAINT comment_unique_id IF NOT EXISTS ON (n:Comment) ASSERT n.id IS UNIQUE;
CREATE CONSTRAINT picture_unique_id IF NOT EXISTS ON (n:Picture) ASSERT n.id IS UNIQUE;
CREATE CONSTRAINT avatar_unique_id IF NOT EXISTS ON (n:Avatar) ASSERT n.id IS UNIQUE;
