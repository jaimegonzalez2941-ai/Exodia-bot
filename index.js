const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// 1. DEFINE SLASH COMMANDS
const commands = [
    new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Log a quick evaluation for a candidate')
        .addUserOption(option => option.setName('candidate').setDescription('The player being evaluated').setRequired(true))
        .addNumberOption(option => option.setName('score').setDescription('Overall Rating (1.0 - 10.0, No 7.0)').setRequired(true))
        .addStringOption(option => option.setName('notes').setDescription('Scout notes & coaching feedback').setRequired(true)),

    new SlashCommandBuilder()
        .setName('assign-role')
        .setDescription('Auto-assign recruitment stage roles')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option => option.setName('target').setDescription('The target player').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('Role to assign').setRequired(true))
].map(cmd => cmd.toJSON());

// Helper: Enforce the "No 7.0 Rule"
function validateScore(value, label) {
    const score = parseFloat(value);
    if (isNaN(score) || score < 1.0 || score > 10.0) {
        return `⚠️ **${label}** must be a number between 1.0 and 10.0.`;
    }
    if (score === 7 || (score >= 6.8 && score <= 7.2)) {
        return `❌ **${label}:** Ratings of 7.0 are disabled! Decide if the candidate is below standard (6.0 or lower) or trial-ready (8.0 or higher).`;
    }
    return null;
}

client.once('ready', async () => {
    console.log(`🤖 [BOT ONLINE] Logged in as ${client.user.tag}`);
    
    // Register Slash Commands with Discord API
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('🔄 Registering Slash Commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Slash Commands Registered Successfully!');
    } catch (err) {
        console.error('⚠️ Failed to register Slash Commands:', err.message);
    }

    // Auto-deploy public recruitment landing panel
    if (process.env.TRIAL_SUBMISSION_CHANNEL_ID) {
        try {
            const channel = await client.channels.fetch(process.env.TRIAL_SUBMISSION_CHANNEL_ID);
            const messages = await channel.messages.fetch({ limit: 10 });
            const existing = messages.find(m => m.author.id === client.user.id && m.components.length > 0);
            
            if (!existing) {
                const embed = new EmbedBuilder()
                    .setTitle('⚽ LA ACADEMIA // RECRUITMENT PORTAL')
                    .setDescription('Welcome! Submit your trial application or transfer request below to join our competitive roster pipeline.')
                    .setColor(0x0052FF)
                    .addFields(
                        { name: '🎯 Open Positions', value: '• Center Backs (CB)\n• Defensive Mids (CDM)\n• Playmakers (CAM/CM)\n• Forwards (ST/LW/RW)', inline: true },
                        { name: '⚡ Status', value: '🟢 OPEN', inline: true }
                    );

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('apply_tryout').setLabel('Apply for Tryouts').setStyle(ButtonStyle.Success).setEmoji('⚽'),
                    new ButtonBuilder().setCustomId('request_transfer').setLabel('Transfer Request').setStyle(ButtonStyle.Primary).setEmoji('🔄')
                );

                await channel.send({ embeds: [embed], components: [row] });
                console.log('📌 Panel deployed to #trial-submission');
            }
        } catch (err) {
            console.error('⚠️ Could not post recruitment panel:', err.message);
        }
    }
});

// Main Interaction Router
client.on('interactionCreate', async interaction => {
    try {
        // 2. HANDLE SLASH COMMANDS
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            if (commandName === 'eval') {
                const target = interaction.options.getUser('candidate');
                const score = interaction.options.getNumber('score');
                const notes = interaction.options.getString('notes');

                const err = validateScore(score, 'Rating');
                if (err) return interaction.reply({ content: err, ephemeral: true });

                const scoreEmbed = new EmbedBuilder()
                    .setTitle('📊 QUICK SCOUT EVALUATION')
                    .setColor(score >= 7.5 ? 0x00FF00 : 0xFF9900)
                    .setDescription(`Logged by <@${interaction.user.id}> for candidate <@${target.id}>`)
                    .addFields(
                        { name: '⭐ Score', value: `**${score.toFixed(1)} / 10.0**`, inline: true },
                        { name: '📝 Scout Notes', value: notes, inline: false }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [scoreEmbed] });
            }

            if (commandName === 'assign-role') {
                const targetUser = interaction.options.getUser('target');
                const role = interaction.options.getRole('role');
                const member = await interaction.guild.members.fetch(targetUser.id);

                try {
                    await member.roles.add(role);
                    return interaction.reply({ content: `🎖️ Successfully assigned **${role.name}** to <@${targetUser.id}>!` });
                } catch (err) {
                    return interaction.reply({ content: `⚠️ Could not assign role. Ensure bot role is positioned higher than target role!`, ephemeral: true });
                }
            }
        }

        // 3. PUBLIC BUTTON INTERACTION
        if (interaction.isButton()) {
            if (interaction.customId === 'apply_tryout' || interaction.customId === 'request_transfer') {
                const isTransfer = interaction.customId === 'request_transfer';
                
                const modal = new ModalBuilder()
                    .setCustomId(isTransfer ? 'modal_transfer' : 'modal_tryout')
                    .setTitle(isTransfer ? 'Transfer Request Form' : 'Tryout Application Form');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ign_input').setLabel('In-Game Tag / Platform ID').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('role_input').setLabel('Primary & Secondary Roles').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rank_input').setLabel('Competitive Rank & Experience').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('origin_input').setLabel('Origin Team / Free Agent Status').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('links_input').setLabel('Stats Tracker / VOD Links (Optional)').setStyle(TextInputStyle.Paragraph).setRequired(false))
                );

                return await interaction.showModal(modal);
            }

            // Staff Positional Scorecard Buttons
            if (interaction.customId.startsWith('eval_')) {
                const parts = interaction.customId.split('_');
                const posGroup = parts[1];
                const targetUserId = parts[2];

                const titles = { def: '🛡️ Defender Scorecard', mid: '🧠 Midfielder Scorecard', att: '🎯 Attacker Scorecard' };
                const labels = {
                    def: ['Aerial Duels & Clearances', 'Defensive Line Shifting', 'Manual Tackle Discipline'],
                    mid: ['Press Resistance & Retention', 'Passing Tempo & Vision', 'Defensive Cover Transitions'],
                    att: ['Off-Ball Movement & Spacing', 'Clinical Chance Finishing', 'High-Press Triggering']
                };

                const modal = new ModalBuilder()
                    .setCustomId(`modal_eval_${posGroup}_${targetUserId}`)
                    .setTitle(titles[posGroup]);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m1').setLabel(`${labels[posGroup][0]} (1-10, No 7)`).setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m2').setLabel(`${labels[posGroup][1]} (1-10, No 7)`).setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m3').setLabel(`${labels[posGroup][2]} (1-10, No 7)`).setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m4').setLabel('Voice Leadership & Comms (1-10, No 7)').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('notes').setLabel('Scout Notes & Coaching Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
                return await interaction.showModal(modal);
            }

            // Accept & Reject Workflow
            if (interaction.customId.startsWith('staff_accept_')) {
                const userId = interaction.customId.split('_')[2];
                try {
                    const member = await interaction.guild.members.fetch(userId);
                    if (process.env.ROLE_TRIALIST) await member.roles.remove(process.env.ROLE_TRIALIST);
                    if (process.env.ROLE_PROSPECT) await member.roles.add(process.env.ROLE_PROSPECT);

                    await interaction.reply({ content: `✅ <@${userId}> promoted to **@Academia Prospect**!` });
                } catch (err) {
                    await interaction.reply({ content: `✅ Candidate accepted!`, ephemeral: true });
                }
            } else if (interaction.customId.startsWith('staff_reject_')) {
                const userId = interaction.customId.split('_')[2];
                await interaction.reply({ content: `❌ Candidate <@${userId}> trial closed.` });
            }
        }

        // 4. MODAL SUBMISSION HANDLER
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_tryout' || interaction.customId === 'modal_transfer') {
                await interaction.reply({ content: '✅ Application submitted successfully!', ephemeral: true });

                const ign = interaction.fields.getTextInputValue('ign_input');
                const roles = interaction.fields.getTextInputValue('role_input');
                const rank = interaction.fields.getTextInputValue('rank_input');
                const origin = interaction.fields.getTextInputValue('origin_input');
                const links = interaction.fields.getTextInputValue('links_input') || 'None provided';
                const isTransfer = interaction.customId === 'modal_transfer';

                try {
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    if (process.env.ROLE_TRIALIST) await member.roles.add(process.env.ROLE_TRIALIST);
                } catch (err) {}

                if (process.env.STAFF_DOCKET_CHANNEL_ID) {
                    const staffChannel = await client.channels.fetch(process.env.STAFF_DOCKET_CHANNEL_ID);
                    
                    const docketEmbed = new EmbedBuilder()
                        .setTitle(`📋 SCOUTING DOCKET: ${ign}`)
                        .setColor(0xFFB000)
                        .addFields(
                            { name: '👤 Candidate', value: `<@${interaction.user.id}>`, inline: false },
                            { name: '📂 Type', value: isTransfer ? '🔄 External Transfer' : '⚽ Open Tryout', inline: true },
                            { name: '⚽ Positions', value: roles, inline: true },
                            { name: '🏆 Experience', value: rank, inline: false },
                            { name: '🏛️ Origin Club', value: origin, inline: true },
                            { name: '🔗 Links / VODs', value: links, inline: false }
                        )
                        .setTimestamp();

                    const row1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`eval_def_${interaction.user.id}`).setLabel('Eval DEF').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
                        new ButtonBuilder().setCustomId(`eval_mid_${interaction.user.id}`).setLabel('Eval MID').setStyle(ButtonStyle.Primary).setEmoji('🧠'),
                        new ButtonBuilder().setCustomId(`eval_att_${interaction.user.id}`).setLabel('Eval ATT').setStyle(ButtonStyle.Primary).setEmoji('🎯')
                    );

                    const row2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`staff_accept_${interaction.user.id}`).setLabel('Accept & Promote').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`staff_reject_${interaction.user.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
                    );

                    await staffChannel.send({ embeds: [docketEmbed], components: [row1, row2] });
                }
            }

            if (interaction.customId.startsWith('modal_eval_')) {
                const parts = interaction.customId.split('_');
                const posGroup = parts[2];
                const targetUserId = parts[3];

                const v1 = interaction.fields.getTextInputValue('m1');
                const v2 = interaction.fields.getTextInputValue('m2');
                const v3 = interaction.fields.getTextInputValue('m3');
                const v4 = interaction.fields.getTextInputValue('m4');
                const notes = interaction.fields.getTextInputValue('notes');

                const err = validateScore(v1, 'Metric 1') || validateScore(v2, 'Metric 2') || validateScore(v3, 'Metric 3') || validateScore(v4, 'Metric 4');
                if (err) return await interaction.reply({ content: err, ephemeral: true });

                const s1 = parseFloat(v1), s2 = parseFloat(v2), s3 = parseFloat(v3), s4 = parseFloat(v4);
                const overall = ((s1 * 0.35) + (s2 * 0.25) + (s3 * 0.25
