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
        GatewayIntentBits.GuildMembers
    ]
});

// Helper: Enforce the "No 7.0 Rule" (Forced Choice)
function validateScore(value, label) {
    const score = parseFloat(value);
    if (isNaN(score) || score < 1.0 || score > 10.0) {
        return `⚠️ **${label}** must be a number between 1.0 and 10.0.`;
    }
    if (score === 7 || (score >= 6.8 && score <= 7.2)) {
        return `❌ **${label}:** Ratings of 7.0 are disabled! You must decide if the candidate is below standard (6.0 or lower) or trial-ready (8.0 or higher).`;
    }
    return null;
}

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
                    .setTitle('⚽ LA ACADEMIA // RECRUITMENT PORTAL')
                    .setDescription('Welcome! Submit your trial application or transfer request below to join our competitive roster pipeline.\n\n**Minimum Requirements:**\n• Active communication & team availability\n• High tactical awareness & discipline\n• Openness to coaching & trial feedback')
                    .setColor(0x0052FF)
                    .addFields(
                        { name: '🎯 Open Positions', value: '• Center Backs (CB)\n• Defensive Mids (CDM)\n• Playmakers (CAM/CM)\n• Forwards (ST/LW/RW)', inline: true },
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
        // 1. PUBLIC BUTTON INTERACTION: Open Intake Modal
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
                    .setLabel('Primary & Secondary Roles (CB, CDM, CAM, ST)')
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

            // 2. STAFF BUTTON: Open Positional Scorecard Modals
            if (interaction.customId.startsWith('eval_')) {
                const parts = interaction.customId.split('_');
                const posGroup = parts[1]; // 'def', 'mid', or 'att'
                const targetUserId = parts[2];

                if (posGroup === 'def') {
                    const modal = new ModalBuilder()
                        .setCustomId(`modal_eval_def_${targetUserId}`)
                        .setTitle('🛡️ Defender Evaluation Scorecard');

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m1').setLabel('Aerial Duels & Clearances (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m2').setLabel('Defensive Line Shifting (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m3').setLabel('Manual Tackle Discipline (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m4').setLabel('Voice Leadership & Comms (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('notes').setLabel('Scout Notes & Coaching Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true))
                    );
                    return await interaction.showModal(modal);
                }

                if (posGroup === 'mid') {
                    const modal = new ModalBuilder()
                        .setCustomId(`modal_eval_mid_${targetUserId}`)
                        .setTitle('🧠 Midfielder Evaluation Scorecard');

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m1').setLabel('Press Resistance & Retention (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m2').setLabel('Passing Tempo & Vision (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m3').setLabel('Defensive Cover Transitions (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m4').setLabel('Voice Leadership & Comms (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('notes').setLabel('Scout Notes & Coaching Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true))
                    );
                    return await interaction.showModal(modal);
                }

                if (posGroup === 'att') {
                    const modal = new ModalBuilder()
                        .setCustomId(`modal_eval_att_${targetUserId}`)
                        .setTitle('🎯 Attacker Evaluation Scorecard');

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m1').setLabel('Off-Ball Movement & Spacing (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m2').setLabel('Clinical Chance Finishing (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m3').setLabel('High-Press Triggering (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m4').setLabel('Voice Leadership & Comms (1.0-10.0, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('notes').setLabel('Scout Notes & Coaching Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true))
                    );
                    return await interaction.showModal(modal);
                }
            }

            // 3. STAFF BUTTONS: Accept / Reject Promotion Workflow
            if (interaction.customId.startsWith('staff_accept_')) {
                const userId = interaction.customId.split('_')[2];
                try {
                    const member = await interaction.guild.members.fetch(userId);
                    
                    // Auto-Assign Roles
                    if (process.env.ROLE_TRIALIST) await member.roles.remove(process.env.ROLE_TRIALIST);
                    if (process.env.ROLE_PROSPECT) await member.roles.add(process.env.ROLE_PROSPECT);

                    await interaction.reply({ content: `✅ <@${userId}> has been officially accepted and promoted to **@Academia Prospect**!`, ephemeral: false });
                } catch (err) {
                    await interaction.reply({ content: `✅ Candidate accepted! (Note: Could not update roles automatically. Verify bot role hierarchy and ROLE_PROSPECT ID).`, ephemeral: true });
                }
            } else if (interaction.customId.startsWith('staff_reject_')) {
                const userId = interaction.customId.split('_')[2];
                try {
                    const member = await interaction.guild.members.fetch(userId);
                    if (process.env.ROLE_TRIALIST) await member.roles.remove(process.env.ROLE_TRIALIST);
                } catch (err) {}
                await interaction.reply({ content: `❌ Candidate <@${userId}> trial process closed.`, ephemeral: false });
            }
        }

        // 4. MODAL SUBMISSION HANDLER
        if (interaction.isModalSubmit()) {
            // Intake Modal Submission
            if (interaction.customId === 'modal_tryout' || interaction.customId === 'modal_transfer') {
                await interaction.reply({ content: '✅ Application submitted successfully! You have been granted the @Trialist role.', ephemeral: true });

                const ign = interaction.fields.getTextInputValue('ign_input');
                const roles = interaction.fields.getTextInputValue('role_input');
                const rank = interaction.fields.getTextInputValue('rank_input');
                const origin = interaction.fields.getTextInputValue('origin_input');
                const links = interaction.fields.getTextInputValue('links_input') || 'None provided';
                const isTransfer = interaction.customId === 'modal_transfer';

                // Automatically Give @Trialist Role
                try {
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    if (process.env.ROLE_TRIALIST) await member.roles.add(process.env.ROLE_TRIALIST);
                } catch (err) {
                    console.error('⚠️ Could not auto-assign @Trialist role:', err.message);
                }

                // Send Scouting Docket to Staff Channel
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

                    const staffRow1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`eval_def_${interaction.user.id}`).setLabel('Eval DEF').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
                        new ButtonBuilder().setCustomId(`eval_mid_${interaction.user.id}`).setLabel('Eval MID').setStyle(ButtonStyle.Primary).setEmoji('🧠'),
                        new ButtonBuilder().setCustomId(`eval_att_${interaction.user.id}`).setLabel('Eval ATT').setStyle(ButtonStyle.Primary).setEmoji('🎯')
                    );

                    const staffRow2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`staff_accept_${interaction.user.id}`).setLabel('Accept & Promote').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`staff_reject_${interaction.user.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
                    );

                    await staffChannel.send({ embeds: [docketEmbed], components: [staffRow1, staffRow2] });
                }
            }

            // Evaluation Modal Submission (Defender, Midfielder, Attacker)
            if (interaction.customId.startsWith('modal_eval_')) {
                const parts = interaction.customId.split('_');
                const posGroup = parts[2]; // 'def', 'mid', 'att'
                const targetUserId = parts[3];

                const v1 = interaction.fields.getTextInputValue('m1');
                const v2 = interaction.fields.getTextInputValue('m2');
                const v3 = interaction.fields.getTextInputValue('m3');
                const v4 = interaction.fields.getTextInputValue('m4');
                const notes = interaction.fields.getTextInputValue('notes');

                // Enforce No-7 Rule Validation
                const err1 = validateScore(v1, 'Metric 1');
                const err2 = validateScore(v2, 'Metric 2');
                const err3 = validateScore(v3, 'Metric 3');
                const err4 = validateScore(v4, 'Metric 4');

                const errorMsg = err1 || err2 || err3 || err4;
                if (errorMsg) {
                    return await interaction.reply({ content: errorMsg, ephemeral: true });
                }

                const s1 = parseFloat(v1), s2 = parseFloat(v2), s3 = parseFloat(v3), s4 = parseFloat(v4);
                
                // Calculate Weighted Overall Rating (35% / 25% / 25% / 15%)
                const overall = ((s1 * 0.35) + (s2 * 0.25) + (s3 * 0.25) + (s4 * 0.15)).toFixed(1);

                const groupNames = { def: '🛡️ DEFENDER', mid: '🧠 MIDFIELDER', att: '🎯 ATTACKER' };

                const scoreEmbed = new EmbedBuilder()
                    .setTitle(`📊 SCOUT SCORECARD: ${groupNames[posGroup]}`)
                    .setColor(overall >= 7.5 ? 0x00FF00 : 0xFF9900)
                    .setDescription(`Logged by <@${interaction.user.id}> for candidate <@${targetUserId}>`)
                    .addFields(
                        { name: 'Metric 1 Rating', value: `${s1} / 10.0`, inline: true },
                        { name: 'Metric 2 Rating', value: `${s2} / 10.0`, inline: true },
                        { name: 'Metric 3 Rating', value: `${s3} / 10.0`, inline: true },
                        { name: 'Voice & Comms', value: `${s4} / 10.0`, inline: true },
                        { name: '⭐ Calculated Overall', value: `**${overall} / 10.0**`, inline: false },
                        { name: '📝 Scout Notes & Feedback', value: notes, inline: false }
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
