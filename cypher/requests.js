// ACCESS
const accessRegister =
  "CREATE (u:User:ID {id: randomUUID(), nameFirst: $nameFirst, nameLast: $nameLast, login: $login, sessionUserID: $sessionUserID, avatar: $avatar, registrationDate:datetime()}) RETURN u";

// ME
const meGet = "MATCH (u:User {sessionUserID: $sessionUserID}) RETURN u";
const meFriendGet =
  "MATCH (u1:User {sessionUserID: $sessionUserID})-[r:PENDING|FRIEND]-(u2:User) RETURN u2,r";
const mePostGet =
  "MATCH (p:Post)<-[:POSTED]-(u:User{sessionUserID:$sessionUserID}) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l order by p.date desc";
const meLikeGet =
  "MATCH (p:Post)<-[:LIKED]-(u:User{sessionUserID:$sessionUserID}) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l";
const mePictureGet =
  "MATCH (u: User {sessionUserID: $sessionUserID})-[r:UPLOADED]->(p:Picture) RETURN p";
const mePicturePost =
  "UNWIND $pictures as picture MATCH (u:User {sessionUserID: $sessionUserID}) MERGE (u)-[r:UPLOADED]->(p:Picture {id: picture.id, picture: picture.picture, private: picture.private}) RETURN p";
const meAvatarGet = "MATCH (u:User {sessionUserID: $sessionUserID}) RETURN u";
const meAvatarPatch =
  "MATCH (u:User {sessionUserID: $sessionUserID}) MERGE (u)-[r:UPLOADED]->(a:Avatar {id: $avatar.id, avatar: $avatar.picture}) SET u.avatar = $avatar.picture RETURN u";

// POST
const postGet =
  "MATCH (p:Post)<-[:POSTED]-(u:User) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l order by p.date desc";
const postSearchGet =
  "MATCH (p:Post)<-[:POSTED]-(u:User) WHERE $tag IN p.tags optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l order by p.date desc";
const postPost =
  "MATCH (u:User{sessionUserID:$sessionUserID}) merge (u)-[:POSTED]->(p:Post:ID{id:randomUUID(), content:$content, tags:$tags, type:$type, date:datetime(), pictures:$picturesParsed}) return p, u";
const postGetById =
  "MATCH (p:Post {id: $id})<-[:POSTED]-(u:User) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l";
const postDelete = "MATCH (p:Post {id: $id}) detach delete p RETURN p";
const postLikePost =
  "MATCH (u:User{sessionUserID: $sessionUserID}) MATCH (p:Post{id: $id}) WHERE NOT exists((u)-[:LIKED]-(p)) MERGE (u)-[l:LIKED]->(p) RETURN u,l,p";
const postLikeDelete =
  "MATCH (u:User{sessionUserID: $sessionUserID})-[r:LIKED]->(p:Post{id: $id}) DELETE r RETURN u,p";

// USER
const userGetById = "MATCH (u:User {id: $id}) RETURN u";
const userGetPost =
  "MATCH (u:User{id:$id}) optional MATCH (p:Post)<-[:POSTED]-(u) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l order by p.date desc";
const userGetLikes =
  "MATCH (u:User{id:$id}) optional match (p:Post)<-[:LIKED]-(u) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l";
const userFriendPost =
  "MATCH (u1:User{sessionUserID: $sessionUserID}) MATCH (u2:User{id: $id}) WHERE NOT exists((u1)-[:PENDING|FRIEND]-(u2)) MERGE (u1)-[p:PENDING]->(u2) RETURN u1,p,u2";
const userAcceptPost =
  "MATCH (u1:User{sessionUserID: $sessionUserID})<-[p:PENDING]-(u2:User{id: $id}) DELETE p MERGE (u1)-[f:FRIEND]-(u2) RETURN u1,f,u2";
const userFriendDelete =
  "MATCH (u1:User{sessionUserID: $sessionUserID})-[r:PENDING|FRIEND]-(u2:User{id: $id}) DELETE r RETURN u1,u2";
const userPictureGet =
  "MATCH (u:User {id: $id})-[UPLOADED]->(p: Picture) RETURN p";
const userGet = "MATCH (u:User) RETURN u";
const userGetByValue =
  "MATCH (u:User ) WHERE (toLower(u.nameFirst) CONTAINS $searchValue OR toLower(u.nameLast) CONTAINS $searchValue) AND NOT u.sessionUserID=$sessionUserID  RETURN u LIMIT 15";

module.exports = {
  accessRegister,
  meGet,
  meFriendGet,
  mePostGet,
  meLikeGet,
  mePictureGet,
  mePicturePost,
  meAvatarGet,
  meAvatarPatch,
  postGet,
  postSearchGet,
  postPost,
  postGetById,
  postDelete,
  postLikePost,
  postLikeDelete,
  userGetById,
  userGetPost,
  userGetLikes,
  userFriendPost,
  userAcceptPost,
  userFriendDelete,
  userPictureGet,
  userGet,
  userGetByValue,
};
