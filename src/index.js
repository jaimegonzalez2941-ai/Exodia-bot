const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    EmbedBuilder 
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    console.log(`🤖 [BOT ONLINE] Logged in as ${client.user.tag}`);
    
    // Auto-deploy public recruitment landing panel
    if (process.env.TRIAL_SUBMISSION_CHANNEL_ID) {
        try {
            const channel = await client.channels.fetch(process.env.TRIAL_SUBMISSION_CHANNEL_ID);
            const messages = await channel.messages.fetch({ limit: 10 });
            const existing = messages.find(m => m.author.id === client.user.id && m.components.length > 0);
            
            if (!existing) {
                const embed = new EmbedBuilder()
                    .setTitle('⚽ RECRUITMENT & TRANSFER PORTAL')
                    .setDescription('Welcome! Submit your trial application or transfer request below to join our competitive roster pipeline[span_2](start_span)[span_2](end_span)[span_3](start_span)[span_3](end_span).\n\n**Minimum Requirements:**\n• Active communication & team availability\n• High tactical awareness & discipline\n• Openness to coaching & trial feedback')
                    .setColor(0x0052FF)
                    .addFields(
                        { name: '🎯 Target Roles', value: '• Center Backs (CB)\n• Defensive Mids (CDM)\n• Playmakers (CAM/CM)', inline: true },
                        { name: '⚡ Status', value: '🟢 OPEN', inline: true }
                    )
                    .setFooter({ text: 'Recruitment Engine • Select an option below to apply' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('apply_tryout')
                        .setLabel('Apply for Tryouts')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('⚽'),
                    new ButtonBuilder()
                        .setCustomId('request_transfer')
                        .setLabel('Transfer Request')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄')
                );

                await channel.send({ embeds: [embed], components: [row] });
                console.log('📌 Panel deployed to #trial-submission');
            }
        } catch (err) {
            console.error('⚠️ Could not post recruitment panel:', err.message);
        }
    }
});

// Main Interaction Event Router
client.on('interactionCreate', async interaction => {
    try {
        // 1. Handle Public Application Button Clicks
        if (interaction.isButton()) {
            if (interaction.customId === 'apply_tryout' || interaction.customId === 'request_transfer') {
                const isTransfer = interaction.customId === 'request_transfer';
                
                const modal = new ModalBuilder()
                    .setCustomId(isTransfer ? 'modal_transfer' : 'modal_tryout')
                    .setTitle(isTransfer ? 'Transfer Request Form' : 'Tryout Application Form');

                const ignInput = new TextInputBuilder()
                    .setCustomId('ign_input')
                    .setLabel('In-Game Tag / Platform ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., PlayerOne#1234')
                    .setRequired(true);

                const roleInput = new TextInputBuilder()
                    .setCustomId('role_input')
                    .setLabel('Primary & Secondary Roles')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., CB / CDM')
                    .setRequired(true);

                const rankInput = new TextInputBuilder()
                    .setCustomId('rank_input')
                    .setLabel('Competitive Rank & Experience')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., Elite Division / League Experience')
                    .setRequired(true);

                const originInput = new TextInputBuilder()
                    .setCustomId('origin_input')
                    .setLabel('Origin Team / Free Agent Status')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., FC Alpha or Free Agent')
                    .setRequired(true);

                const linksInput = new TextInputBuilder()
                    .setCustomId('links_input')
                    .setLabel('Stats Tracker / VOD Links (Optional)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Paste YouTube, Twitch, or stat links here...')
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(ignInput),
                    new ActionRowBuilder().addComponents(roleInput),
                    new ActionRowBuilder().addComponents(rankInput),
                    new ActionRowBuilder().addComponents(originInput),
                    new ActionRowBuilder().addComponents(linksInput)
                );

                return await interaction.showModal(modal);
            }

            // Handle Staff Evaluation Button Click
            if (interaction.customId.startsWith('staff_eval_')) {
                const targetUserId = interaction.customId.split('_')[2];
                
                const evalModal = new ModalBuilder()
                    .setCustomId(`modal_eval_${targetUserId}`)
                    .setTitle('Scout Evaluation Scorecard');

                const mechInput = new TextInputBuilder()
                    .setCustomId('s_mech')
                    .setLabel('Mechanics Rating (1.0 - 10.0)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., 8.5')
                    .setRequired(true);

                const tactInput = new TextInputBuilder()
                    .setCustomId('s_tact')
                    .setLabel('Tactical Rating (1.0 - 10.0)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., 7.0')
                    .setRequired(true);

                const commInput = new TextInputBuilder()
                    .setCustomId('s_comm')
                    .setLabel('Communication Rating (1.0 - 10.0)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., 9.0')
                    .setRequired(true);

                const compInput = new TextInputBuilder()
                    .setCustomId('s_comp')
                    .setLabel('Roster Fit Rating (1.0 - 10.0)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., 8.0')
                    .setRequired(true);

                evalModal.addComponents(
                    new ActionRowBuilder().addComponents(mechInput),
                    new ActionRowBuilder().addComponents(tactInput),
                    new ActionRowBuilder().addComponents(commInput),
                    new ActionRowBuilder().addComponents(compInput)
                );

                return await interaction.showModal(evalModal);
            }

            // Handle Staff Decision Buttons
            if (interaction.customId.startsWith('staff_accept_')) {
                const userId = interaction.customId.split('_')[2];
                await interaction.reply({ content: `✅ Candidate <@${userId}> accepted for trial process!`, ephemeral: false });
            } else if (interaction.customId.startsWith('staff_reject_')) {
                const userId = interaction.customId.split('_')[2];
                await interaction.reply({ content: `❌ Candidate <@${userId}> rejected.`, ephemeral: false });
            }
        }

        // 2. Handle Application Modal Submissions
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_tryout' || interaction.customId === 'modal_transfer') {
                await interaction.reply({ content: '✅ Application submitted successfully! Our scouting staff will review your dossier.', ephemeral: true });

                const ign = interaction.fields.getTextInputValue('ign_input');
                const roles = interaction.fields.getTextInputValue('role_input');
                const rank = interaction.fields.getTextInputValue('rank_input');
                const origin = interaction.fields.getTextInputValue('origin_input');
                const links = interaction.fields.getTextInputValue('links_input') || 'None provided';
                const isTransfer = interaction.customId === 'modal_transfer';

                if (process.env.STAFF_DOCKET_CHANNEL_ID) {
                    const staffChannel = await client.channels.fetch(process.env.STAFF_DOCKET_CHANNEL_ID);
                    
                    const docketEmbed = new EmbedBuilder()
                        .setTitle(`📋 SCOUTING DOCKET: ${ign}`)
                        .setColor(0xFFB000)
                        .addFields(
                            { name: '👤 Candidate', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: false },
                            { name: '📂 Type', value: isTransfer ? '🔄 External Transfer' : '⚽ Open Tryout', inline: true },
                            { name: '⚽ Positions', value: roles, inline: true },
                            { name: '🏆 Experience', value: rank, inline: false },
                            { name: '🏛️ Origin Club', value: origin, inline: true },
                            { name: '🔗 Links / VODs', value: links, inline: false }
                        )
                        .setTimestamp();

                    const staffRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`staff_eval_${interaction.user.id}`)
                            .setLabel('Log Evaluation')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('📊'),
                        new ButtonBuilder()
                            .setCustomId(`staff_accept_${interaction.user.id}`)
                            .setLabel('Accept')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`staff_reject_${interaction.user.id}`)
                            .setLabel('Reject')
                            .setStyle(ButtonStyle.Danger)
                    );

                    await staffChannel.send({ embeds: [docketEmbed], components: [staffRow] });
                }
            }

            // 3. Handle Scout Evaluation Scorecard Submission
            if (interaction.customId.startsWith('modal_eval_')) {
                const targetUserId = interaction.customId.split('_')[2];
                
                const mech = parseFloat(interaction.fields.getTextInputValue('s_mech')) || 0;
                const tact = parseFloat(interaction.fields.getTextInputValue('s_tact')) || 0;
                const comm = parseFloat(interaction.fields.getTextInputValue('s_comm')) || 0;
                const comp = parseFloat(interaction.fields.getTextInputValue('s_comp')) || 0;

                // Weighted Score Formula: 35% Mech, 25% Tact, 25% Comm, 15% Comp
                const overall = ((mech * 0.35) + (tact * 0.25) + (comm * 0.25) + (comp * 0.15)).toFixed(1);

                const scoreEmbed = new EmbedBuilder()
                    .setTitle(`📊 SCOUT SCORECARD`)
                    .setColor(overall >= 7.5 ? 0x00FF00 : 0xFF9900)
                    .setDescription(`Evaluation recorded by <@${interaction.user.id}> for candidate <@${targetUserId}>`)
                    .addFields(
                        { name: '⚙️ Mechanics', value: `${mech} / 10`, inline: true },
                        { name: '🧠 Tactics', value: `${tact} / 10`, inline: true },
                        { name: '🗣️ Comms', value: `${comm} / 10`, inline: true },
                        { name: '🧩 Roster Fit', value: `${comp} / 10`, inline: true },
                        { name: '⭐ Overall Rating', value: `**${overall} / 10.0**`, inline: false }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [scoreEmbed] });
            }
        }
    } catch (err) {
        console.error('⚠️ Interaction Error:', err);
    }
});

client.login(process.env.TOKEN);
