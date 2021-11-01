import {
    CommandInteraction,
    Interaction,
    Message,
    Permissions,
} from "discord.js";
import { BotSocketClient } from "../client";
import { PluginContext, PluginRegister } from "../plugin";
import { snakeCaseToTitle } from "../util";

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
        handler: async (interaction: Interaction) => {
            if (interaction.isCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (command) {
                    try {
                        if (command.guildOnly && !interaction.guildId) {
                            return interaction.reply(
                                "This command can only be used in a guild."
                            );
                        }
                        if (interaction.guildId) {
                            if (
                                command.userPermissions &&
                                !interaction.memberPermissions!.has(
                                    command.userPermissions
                                )
                            ) {
                                return interaction.reply(
                                    `You do not have the required permissions to use this command.\n` +
                                        `Required permissions: ${new Permissions(
                                            command.userPermissions
                                        )
                                            .toArray()
                                            .map(snakeCaseToTitle)
                                            .join(" ")}`
                                );
                            }
                            if (
                                command.clientPermissions &&
                                !interaction.guild?.me?.permissions.has(
                                    command.clientPermissions,
                                    false
                                )
                            ) {
                                return interaction.reply(
                                    `I do not have the required permissions to use this command.\n` +
                                        `Required permissions: ${new Permissions(
                                            command.clientPermissions
                                        )
                                            .toArray()
                                            .map(snakeCaseToTitle)
                                            .join(" ")}`
                                );
                            }
                        }
                        await command.handler.call(
                            this,
                            createCommandInteractionContext(this, interaction)
                        );
                    } catch (e) {
                        logger.error(e);
                        await interaction
                            .reply({ content: `\`${e}\`` })
                            .catch(() => {});
                    }
                }
            }
        },
    });

    this.command({
        name: "ping",
        description: "Pong!",
        userPermissions: "BAN_MEMBERS",
        clientPermissions: "KICK_MEMBERS",
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
