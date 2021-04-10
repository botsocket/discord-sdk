'use strict';

const Client = require('./Client.js');

module.exports = {
    Client,
    client: (options) => new Client(undefined, undefined, options),
};
