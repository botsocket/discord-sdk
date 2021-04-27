'use strict';

const Util = require('util');

const Discord = require('discord.js');
const Ruby = require('@botsocket/ruby');

module.exports = class {

    constructor(options) {

        this.client = new Discord.Client(options.djs);
        this.registry = Ruby.registry(options.registry);
        this.plugins = {};
        this.state = {};                                        // Safe namespace for application-specific state

        this.logger = {
            inspect: (data) => {

                if (typeof data === 'string') {
                    return data;
                }

                return Util.inspect(data);
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
