import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();


// =========================
// GROQ SETUP
// =========================
const ai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});


// =========================
// DISCORD CLIENT
// =========================
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// =========================
// SLASH COMMAND (/ai)
// =========================
const commands = [
  new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Pose une question à l'IA")
    .addStringOption(option =>
      option
        .setName("prompt")
        .setDescription("Ta question")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("fistbump")
    .setDescription("Didn't know you were chill like that")
].map(cmd => cmd.toJSON());


// =========================
// REGISTER COMMAND (GUILD = instant)
// =========================
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log("Mise à jour des commandes...");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Commandes mises à jour !");
  } catch (err) {
    console.error(err);
  }
}


// =========================
// BOT READY
// =========================
bot.once("ready", async () => {
  console.log(`Connecté en tant que ${bot.user.tag}`);
  await registerCommands();
});


// =========================
// INTERACTIONS
// =========================
bot.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ai") {
    const prompt = interaction.options.getString("prompt");

    await interaction.deferReply();

    try {
      const response = await ai.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "parle francais"
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const answer = response.choices[0].message.content;

      await interaction.editReply(answer);

    } catch (err) {
      console.error(err);
      await interaction.editReply("Erreur avec l'IA.");
    }
  }
else if (interaction.commandName === "fistbump") {

  await interaction.reply("👊");

  const filter = (m) => m.author.id === interaction.user.id;

  const collector = interaction.channel.createMessageCollector({
    filter,
    max: 1,
    time: 30000
  });

  collector.on("collect", async (message) => {
    await interaction.followUp(
      `Didn't know you were chill like that...`
    );
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await interaction.followUp("pfft... no response, I see how it is.");
    }
  });
}
});


// =========================
// LOGIN
// =========================
bot.login(process.env.DISCORD_TOKEN);