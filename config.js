'use strict';

exports.port = process.env.PORT || 3000;
exports.mongodb = {
  uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/neuralquest'
};
exports.companyName = 'Neualquest';
exports.projectName = 'Neualquest';
exports.systemEmail = 'chris@flash.a2000.nl';
exports.cryptoKey = 'k3yb0ardc4t';
exports.loginAttempts = {
  forIp: 50,
  forIpAndUser: 7,
  logExpiration: '20m'
};
exports.requireAccountVerification = false;
exports.smtp = {
  from: {
    name: process.env.SMTP_FROM_NAME || exports.projectName +' Website',
    address: process.env.SMTP_FROM_ADDRESS || 'your@email.addy'
  },
  credentials: {
    user: process.env.SMTP_USERNAME || 'your@email.addy',
    password: process.env.SMTP_PASSWORD || 'bl4rg!',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    ssl: true
  }
};
exports.oauth = {
  twitter: {
    key: process.env.TWITTER_OAUTH_KEY || '',
    secret: process.env.TWITTER_OAUTH_SECRET || ''
  },
  facebook: {
    key: process.env.FACEBOOK_OAUTH_KEY || '',
    secret: process.env.FACEBOOK_OAUTH_SECRET || ''
  },
  github: {
    key: process.env.GITHUB_OAUTH_KEY || '',
    secret: process.env.GITHUB_OAUTH_SECRET || ''
  },
  google: {
    key: process.env.GOOGLE_OAUTH_KEY || '840303517074-4c97kthsp7pien2luan592qo0fdlmrfp.apps.googleusercontent.com',
    secret: process.env.GOOGLE_OAUTH_SECRET || '8CUt6rMdQgWHb9_kbSOof4Gq'
  },
  tumblr: {
    key: process.env.TUMBLR_OAUTH_KEY || '',
    secret: process.env.TUMBLR_OAUTH_SECRET || ''
  }
};
exports.constants = {
  VIEW_CLASS: 74,
  ATTRREF_CLASS: 63
};
exports.reveseAssoc = {
  subClasses:'parent',
  instantiations:'parent',
  orderedParent:'ordered',
  previous:'next',
  manyToManyReverse:'manyToMany',
  manyToOne:'oneToMany',
  ownedBy:'owns'
};
exports.cardinality = {
  //to many
  subClasses:'many',
  manyToMany:'many',
  ordered:'many',
  instantiations:'many',
  oneToMany:'many',
  manyToManyReverse:'many',
  attributeOf:'many',
  mappedToBy:'many',
  owns:'many',
  associations:'many',
  defaultOf:'many',
  byAssociationType:'many',
  //to one
  parent: 'one',
  theUser: 'one',
  attribute: 'one',
  mapsTo: 'one',
  default: 'one',
  oneToOne: 'one',
  next: 'one',
  orderedParent: 'one',
  ownedBy: 'one',
  oneToOneReverse: 'one',
  manyToOne: 'one'
};
