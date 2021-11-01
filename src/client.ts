import { Client, ClientEvents, ClientOptions, Collection } from "discord.js";
import * as CorePlugin from "./core";
import { Logger } from "./logger";
import { Command, PluginContext, PluginDefiniton } from "./plugin";

export interface BotSocketClientOptions extends ClientOptions {}

export class BotSocketClient extends Client {
    commands: Collection<string, Command>;
    plugins: PluginCollection;
    logger: Logger;

    constructor(options: BotSocketClientOptions) {
        super(options);

        this.commands = new Collection();
        this.plugins = new Collection();
        this.logger = new Logger(this, "client");
    }

    async register(...plugins: PluginDefiniton[]) {
        for (const plugin of plugins) {
            try {
                const context = new PluginContext(this, plugin);
                await plugin.register.call(context, context);
                this.plugins.set(plugin.name, context);
                this.logger.info(`Loaded ${plugin.name} plugin`);
            } catch (e) {
                this.logger.error(`Failed to load ${plugin.name} plugin`);
            }
        }
    }

    async registerSlashCommands() {
        const commands = await this.application?.commands.set(
            Array.from(this.commands.values())
        );
        return commands;
    }
}

export interface BotSocketClientEvents extends ClientEvents {
    log: [log: { name: string; type: string; message: string }];
}

export async function createClient(options: BotSocketClientOptions) {
    const client = new BotSocketClient(options);
    await client.register(CorePlugin);
    return client;
}

declare module "discord.js" {
    export interface Client {
        on<K extends keyof BotSocketClientEvents>(
            event: K,
            listener: BotSocketClientEvents[K]
        ): Awaitable<void>;
        once<K extends keyof BotSocketClientEvents>(
            event: K,
            listener: BotSocketClientEvents[K]
        ): Awaitable<void>;
    }
}

export interface Plugins {
    core: PluginContext;
}
interface PluginCollection extends Collection<string, PluginContext> {
    get<K extends keyof Plugins>(name: K): Plugins[K] | undefined;
}
