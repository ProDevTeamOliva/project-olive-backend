const testUser1 = {
  nameFirst: "test1",
  nameLast: "user1",
  login: "testUser1",
  password: "zaq1@WSX",
  sessionUserID: ""
};

const testUser2 = {
  nameFirst: "test2",
  nameLast: "user2",
  login: "testUser2",
  password: "zaq1@WSX",
  sessionUserID: ""
};

const testUser3 = {
  nameFirst: "test3",
  nameLast: "user3",
  login: "testUser3",
  password: "zaq1@WSX",
  sessionUserID: ""
};

const testPostPublicNoImages = {
  content: "Hello world!",
  tags: ["helloworld"],
  type: "public",
  pictures: [],
};

const testPostFriendsNoImages = {
  content: "Hello world!",
  tags: ["helloworld"],
  type: "friends",
  pictures: [],
};

module.exports = {
    testUser1,
    testUser2,
    testUser3,
    testPostPublicNoImages,
    testPostFriendsNoImages
};
