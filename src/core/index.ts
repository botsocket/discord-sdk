import { CommandInteraction, Interaction, Message } from "discord.js";
import { BotSocketClient } from "../client";
import { PluginContext, PluginRegister } from "../plugin";

export const name = "core";

export const register: PluginRegister = function () {
    const { client, logger } = this;

    this.event({
        name: "log",
        handler: (log: { name: string; type: string; message: string }) => {
            console.log(`[${log.name}] [${log.type}] ${log.message}`);
        },
    });
    this.event({
        name: "ready",
        handler: async () => {
            logger.info(`Logged in as ${client.user?.tag}`);
        },
    });
    this.event({
        name: "interactionCreate",
        handler: (interaction: Interaction) => {
            if (interaction.isCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (command) {
                    command.handler.call(
                        this,
                        createCommandInteractionContext(this, interaction)
                    );
                }
            }
        },
    });

    this.command({
        name: "ping",
        description: "Pong!",
        handler: async ({ interaction }) => {
            const reply = (await interaction.reply({
                content: "Ping?",
                fetchReply: true,
            })) as Message;
            return interaction.editReply({
                content: `Pong! Took: ${Date.now() - reply.createdTimestamp}ms`,
            });
        },
    });
};

function createCommandInteractionContext(
    plugin: PluginContext,
    interaction: CommandInteraction
): CommandInteractionContext {
    return {
        client: plugin.client,
        interaction,
        plugin: plugin,
    };
}

export interface CommandInteractionContext {
    client: BotSocketClient;
    plugin: PluginContext;
    interaction: CommandInteraction;
}
