'use strict';

const Jade = require('@botsocket/jade');

const Core = require('./core');
const Settings = require('./settings');
const Utils = require('./utils');

const internals = {};

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

        return djsClient.login(token);
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
                    definition.validate.failAction = ({ message, errors }) => {

                        message.channel.send(errors[0].message);
                    };
                }
            }

            definition.data = {
                ...definition.data,
                [Utils.symbols.sdkData]: {
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
                    await event.handler.call(this.realm.bind, { client: this, args });
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
            const { name, register } = plugin.plugin ?? plugin;
            try {
                const client = this.clone(name);
                await register(client, plugin.options);
                this.logger.info(`Plugin ${name} loaded`);
            }
            catch (e) {
                this.logger.error(`Error while loading plugin ${name}`);
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
};
