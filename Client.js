'use strict';

const Core = require('./Core');

module.exports = class Client {
    constructor(parent, name = 'default', payload) {

        this._core = parent ? parent._core : new Core(payload);
        this.plugins = this._core.plugins;

        this._realm = {
            name,
            parent,
        };

        this.logger = this._core.logger;
    }

    clone(name) {

        return new Client(this, name);
    }

    start(token) {

        if (this._core.client.ready) {
            return this;
        }

        return new Promise((resolve, reject) => {

            this.event({
                name: 'ready',
                handler: () => {

                    this.logger.info('Ready!');
                    resolve(this);
                },
            });

            this.event({
                name: 'message',
                handler: (_client, message) => {

                    const matches = this._core.registry.match(message.content);
                    if (!matches) {
                        return;
                    }

                    for (const match of matches) {
                        const { validation, handler } = match.definition.data;

                        if (validation?.args?._definition) {
                            const result = validation.args.validate(match.args);
                            if (result.errors) {
                                if (!validation.failAction || validation.failAction === 'error') {
                                    return message.channel.send(result.errors[0].message);
                                }
                                else if (validation.failAction === 'ignore') {
                                    return;
                                }
                                else if (typeof failAction === 'function') {
                                    return validation.failAction(message, result, 'args');
                                }
                            }
                        }

                        if (validation?.flags?._definition) {
                            const result = validation.flags.validate(match.flags);
                            if (result.errors) {
                                if (!validation.failAction || validation.failAction === 'error') {
                                    return message.channel.send(result.errors[0].message);
                                }
                                else if (validation.failAction === 'ignore') {
                                    return;
                                }
                                else if (typeof failAction === 'function') {
                                    return validation.failAction(message, result, 'flags');
                                }
                            }
                        }

                        handler(message, match);
                    }
                },
            });

            this.event({
                name: 'log',
                handler: (_client, log) => {

                    console.log(
                        `[${log.type[0].toUpperCase()}${log.type.slice(1)}] ${log.message}`,
                    );
                },
            });

            setTimeout(() => {

                reject(new Error('Timeout'));
            }, 10000);

            this._core.client.login(token);
        });
    }

    command(...definitions) {

        return this._core.registry.add(...definitions);
    }

    event(...events) {

        for (const event of events) {
            this._core.client[event.once ? 'once' : 'on'](event.name, (...args) => event.handler(this._core.client, ...args),
            );
        }
    }

    async register(...plugins) {

        for (const plugin of plugins) {
            try {
                if (typeof plugin.register === 'function') {
                    const client = this.clone(plugin.name);
                    await plugin.register(client);
                    this.logger.info(`Plugin ${plugin.name} loaded`);
                }
                else if (plugin.plugin) {
                    const client = this.clone(plugin.plugin.name);
                    await plugin.plugin.register(client, plugin.options);
                    this.logger.info(`Plugin ${plugin.plugin.name} loaded`);
                }
            }
            catch (e) {
                this.logger.error(`Error while loading plugin ${plugin.name}`);
                this.logger.error(e);
            }
        }
    }

    expose(property, value) {

        let exposures = this._core.plugins[this._realm.name];

        if (!exposures) {
            exposures = this._core.plugins[this._realm.name] = {};
        }

        exposures[property] = value;
        return value;
    }
};
