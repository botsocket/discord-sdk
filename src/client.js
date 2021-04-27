'use strict';

const Jade = require('@botsocket/jade');

const Core = require('./core');
const Settings = require('./settings');

const internals = {
    sdkData: Symbol('sdkData'),
};

exports.create = function (options = {}) {

    const settings = Settings.apply('client', options);
    const core = new Core(settings);
    return new internals.Client(core);
};

internals.Client = class {

    constructor(core, name, parent) {

        this._core = core;

        this.plugins = core.plugins;
        this.registry = core.registry;
        this.logger = core.logger;
        this.djsClient = core.client;
        this.state = core.state;

        this.realm = {
            name,
            parent: parent ? parent.realm : null,
            bind: null,
        };
    }

    clone(name) {

        return new internals.Client(this._core, name, this);
    }

    bind(context) {

        this.realm.bind = context;
        return this;
    }

    start(token) {

        const djsClient = this.djsClient;

        if (djsClient.ready) {
            return;
        }

        djsClient.login(token);

        djsClient.on('message', (message) => {

            this._dispatch(message);
        });

        djsClient.on('log', (log) => {

            console.log(`[${log.type}] ${log.message}`);
        });

        return new Promise((resolve) => {

            djsClient.on('ready', () => {

                this.logger.info('Ready!');
                resolve();
            });
        });
    }

    command(...definitions) {

        for (let definition of definitions) {
            definition = Settings.apply('command', definition);

            if (definition.validate) {
                if (definition.validate.args) {
                    definition.validate.args = Jade.compile(definition.validate.args);
                }

                if (definition.validate.flags) {
                    definition.validate.flags = Jade.compile(definition.validate.flags);
                }

                if (definition.validate.failAction === 'error') {
                    definition.validate.failAction = (message, errors) => {

                        message.channel.send(errors[0].message);
                    };
                }
            }

            definition.data = {
                ...definition.data,
                [internals.sdkData]: {
                    validate: definition.validate,
                    handler: definition.handler,
                    client: this,
                },
            };

            delete definition.handler;
            delete definition.validate;

            this._core.registry.add(definition);
        }

        return this;
    }

    event(...events) {

        for (let event of events) {
            event = Settings.apply('event', event);

            const method = event.once ? 'once' : 'on';

            this.djsClient[method](event.name, async (...args) => {

                try {
                    await event.handler.call(this.realm.bind, ...args);
                }
                catch (error) {
                    this.logger.error(`Failed to execute event ${event.name}`);
                    this.logger.error(error);
                }
            });
        }

        return this;
    }

    async register(...plugins) {

        for (let plugin of plugins) {
            plugin = Settings.apply('plugin', plugin);
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
                this.logger.error(`Error while loading plugin ${(plugin.plugin || plugin).name}`);
                this.logger.error(e);
            }
        }
    }

    expose(property, value) {

        let exposures = this.plugins[this.realm.name];

        if (!exposures) {
            exposures = this.plugins[this.realm.name] = {};
        }

        exposures[property] = value;
        return this;
    }

    _dispatch(message) {

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
            const { validate, handler } = match.definition.data[internals.sdkData];

            if (validate) {
                try {
                    this._validate('args', validate, match);
                    this._validate('flags', validate, match);
                }
                catch (error) {
                    if (error instanceof internals.ValidationError) {
                        if (validate.failAction !== 'ignore') {
                            this._execute(validate.failAction, message, error.errors, error.source);
                        }
                    }
                    else {
                        message.channel.send('Command failed to execute!');
                        this.logger.error(error);
                    }

                    return;
                }
            }

            this._execute(handler, message, match);
        }
    }

    async _execute(handler, message, ...args) {

        try {
            const result = await handler.call(this.realm.bind, message, ...args);

            if (typeof result === 'string' ||
                typeof result === 'number') {

                return message.channel.send(result);
            }

            if (result === undefined ||
                result === null) {

                return;
            }

            throw new Error('Command handler must return a promise, a string, a number, undefined or null');
        }
        catch (error) {
            message.channel.send('Command failed to execute!');
            this.logger.error(error);
        }
    }

    _validate(source, settings, match) {

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
    }
};

internals.ValidationError = class extends Error {

    constructor(errors, source) {

        super();

        this.source = source;
        this.errors = errors;
    }
};
