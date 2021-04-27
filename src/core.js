'use strict';

const Util = require('util');

const Discord = require('discord.js');
const Ruby = require('@botsocket/ruby');

const Utils = require('./utils');

const internals = {};

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

        this.setup();
    }

    setup() {

        this.client.on('log', (log) => {

            console.log(`[${log.type}] ${log.message}`);
        });

        this.client.on('ready', () => {

            this.logger.info('Ready!');
        });

        this.client.on('message', (message) => {

            this.dispatch(message);
        });
    }

    dispatch(message) {

        if (message.channel.type === 'dm' ||
            message.author.bot ||
            (message.guild && !message.guild.available) ||
            message.webhookID) {

            return;
        }

        const matches = this.registry.match(message.content);
        if (!matches) {
            return;
        }

        for (const match of matches) {
            const { validate, handler, client } = match.definition.data[Utils.symbols.sdkData];

            if (validate) {
                try {
                    internals.validate('args', validate, match);
                    internals.validate('flags', validate, match);
                }
                catch (error) {
                    if (error instanceof internals.ValidationError) {
                        if (validate.failAction !== 'ignore') {
                            this.execute(validate.failAction, client.realm.bind, message, error.errors, error.source);
                        }
                    }
                    else {
                        message.channel.send('Command failed to execute!');
                        this.logger.error(error);
                    }

                    return;
                }
            }

            this.execute(handler, client.realm.bind, message, match);
        }
    }

    async execute(handler, bind, message, ...args) {

        try {
            const result = await handler.call(bind, message, ...args);

            if (typeof result === 'string' ||
                typeof result === 'number') {

                return message.channel.send(result);
            }
        }
        catch (error) {
            message.channel.send('Command failed to execute!');
            this.logger.error(error);
        }
    }
};

internals.ValidationError = class extends Error {

    constructor(errors, source) {

        super();

        this.source = source;
        this.errors = errors;
    }
};

internals.validate = function (source, settings, match) {

    const schema = settings[source];

    if (!schema) {
        return;
    }

    const result = schema.validate(match[source], settings.options);
    if (!result.errors) {
        match[source] = result.value;
        return;
    }

    throw new internals.ValidationError(result.errors, source);
};
