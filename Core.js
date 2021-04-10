'use strict';

const Discord = require('discord.js');
const Ruby = require('@botsocket/ruby');
const { inspect } = require('util');

module.exports = class Core {
    constructor(options) {

        this._options = options;
        this.client = new Discord.Client(options.client);
        this.registry = Ruby.registry(options.registry);
        this.client.token = options.token;

        this.plugins = {};

        this.logger = {
            inspect: (data) => {

                if (typeof data === 'string') {
                    return data;
                }

                return inspect(data);
            },
            join: (data) => {

                return data.map(this.logger.inspect).join(' ');
            },
            info: (...data) => {

                this.client.emit('log', {
                    type: 'info',
                    message: this.logger.join(data),
                });
            },
            log: (...data) => {

                this.client.emit('log', {
                    type: 'info',
                    message: this.logger.join(data),
                });
            },
            warn: (...data) => {

                this.client.emit('log', {
                    type: 'warn',
                    message: this.logger.join(data),
                });
            },
            error: (...data) => {

                this.client.emit('log', {
                    type: 'error',
                    message: this.logger.join(data),
                });
            },
        };
    }
};
