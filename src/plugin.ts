import {
    ApplicationCommandOptionData,
    ApplicationCommandType,
} from "discord.js";
import { Logger } from "./logger";
import { BotSocketClient, BotSocketClientEvents } from "./client";
import { CommandInteractionContext } from "./core";

export class PluginContext {
    client: BotSocketClient;
    name: string;
    logger: Logger;
    [key: string]: any;

    constructor(client: BotSocketClient, plugin: PluginDefiniton) {
        this.client = client;
        this.name = plugin.name;
        this.logger = new Logger(client, plugin.name);
    }

    command(...defintions: CommandDefinition[]) {
        for (const defintion of defintions) {
            const command: Command = {
                name: defintion.name,
                description: defintion.description,
                options: defintion.options ?? [],
                type: defintion.type || "CHAT_INPUT",
                handler: defintion.handler.bind(this),
                plugin: this,
            };
            this.client.commands.set(command.name, command);
        }
    }

    event(...definitions: EventDefinition[]) {
        for (const definition of definitions) {
            this.client[definition.once ? "once" : "on"](
                definition.name,
                definition.handler.bind(this)
            );
        }
    }

    expose(property: string, value: any) {
        this[property] = value;
        return this;
    }
}

export interface EventDefinition {
    name: keyof BotSocketClientEvents;
    once?: boolean;
    handler: (this: PluginContext, ...args: any[]) => void;
}

export interface CommandDefinition {
    name: string;
    description: string;
    type?: ApplicationCommandType;
    options?: ApplicationCommandOptionData[];
    guildId?: string | string[];
    handler: (this: PluginContext, context: CommandInteractionContext) => void;
}

export interface Command extends CommandDefinition {
    type: ApplicationCommandType;
    plugin: PluginContext;
}

export interface PluginRegister {
    (this: PluginContext, plugin: PluginContext): void;
}
export interface PluginDefiniton {
    name: string;
    register: PluginRegister;
}