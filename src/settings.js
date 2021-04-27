'use strict';

const Jade = require('@botsocket/jade');

const internals = {};

exports.apply = function (type, raw, options) {

    const schema = internals[type];

    try {
        return schema.attempt(raw, options);
    }
    catch (error) {
        error.message = `Options ${type} failed: ${error.message}`;
        throw error;
    }
};

internals.client = Jade.obj({

    registry: Jade.any(),                   // Validated in Ruby
    djs: Jade.any(),                        // Validated in Djs
});

internals.command = Jade.obj({

    validate: {
        args: Jade.obj(),
        flags: Jade.obj(),
        options: Jade.obj(),                // Validated in Jade
        failAction: Jade.alt('error', 'ignore', Jade.function()).default('error'),
    },

    handler: Jade.function().required(),
    data: Jade.forbidden(),                 // Data should not be present as an interface
})
    .unknown();                             // The rest are validated in Ruby

internals.event = Jade.obj({

    name: Jade.str().required(),
    once: Jade.bool(),
    handler: Jade.function().required(),
});

internals.rawPlugin = Jade.obj({

    name: Jade.str().when('pkg', {
        is: Jade.present(),
        then: Jade.forbidden(),
        otherwise: Jade.required(),
    }),

    pkg: Jade.obj({
        name: Jade.str().required(),
        version: Jade.str().required(),
    })
        .unknown(),

    register: Jade.function().required(),
});

internals.plugin = Jade.alt(internals.rawPlugin, {

    plugin: internals.rawPlugin,
    options: Jade.obj(),
});
