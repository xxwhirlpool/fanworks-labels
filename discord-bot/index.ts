import dotenv from "dotenv";
import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import httpServer, { IncomingMessage } from "node:http";
import { z } from "zod";

dotenv.config();

const ENVIRONMENT = z
  .object({
    DISCORD_SERVER_PORT: z.number({ coerce: true }),
    DISCORD_TOKEN: z.string(),
    DISCORD_CHANNEL_ID: z.string(),
    LABELING_SERVER_URL: z.string(),
  })
  .parse(process.env);

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});
client.login(ENVIRONMENT.DISCORD_TOKEN);

client.once(Events.ClientReady, () => {
  console.log("Discord server ready to go!");
});

const requestValidator = z.object({
  post_url: z.string().url(),
  at_uri: z.string(),
  requester: z.string(),
  labels: z.string().array(),
});

function getRequestBody(request: IncomingMessage) {
  return new Promise((resolve) => {
    const bodyParts: any[] = [];
    let body;
    request
      .on("data", (chunk) => {
        bodyParts.push(chunk);
      })
      .on("end", () => {
        body = Buffer.concat(bodyParts).toString();
        resolve(body);
      });
  });
}

const server = httpServer.createServer(async (req, res) => {
  if (req.url !== "/message" || req.method !== "POST") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end();
  }

  const body = await getRequestBody(req);
  const data = requestValidator.parse(JSON.parse(body as string));
  //   console.log(data);

  const channel = client.channels.cache.get(ENVIRONMENT.DISCORD_CHANNEL_ID);
  if (channel?.isSendable()) {
    const post = await channel?.send(
      `Please approve labeling ${data.post_url} as ${data.labels.join(
        ", "
      )} requested by ${data.requester}`
    );
    await post.react(`✅`);
    await post.react(`❌`);

    const reactionsPromise = post.awaitReactions({
      filter: (reaction) => {
        console.log(reaction.emoji.name!);
        return ["✅", "❌"].includes(reaction.emoji.name!);
      },
      max: 1,
      // Wait for 2 hours
      time: 48 * 60 * 60_000,
      errors: ["time"],
    });
    reactionsPromise
      .then(async (reactions) => {
        const reaction = reactions.first()!;

        if (reaction.emoji.name! === "✅") {
          console.log("Approved!");
          // Send request to the labeling server to add the requested labels
          const request = await fetch(
            new URL("/labels", ENVIRONMENT.LABELING_SERVER_URL),
            {
              method: "PUT",
              body: JSON.stringify({
                at_url: data.at_uri,
                labels: data.labels,
              }),
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        } else {
          console.log("whomp whomp");
        }
      })
      .catch((error) => {
        console.error("Reaction wasn't put in in time.");
      });
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({}));
});

server.on("connect", () => {
  console.log(`Server is listening on ${ENVIRONMENT.DISCORD_SERVER_PORT}`);
});

server.listen(ENVIRONMENT.DISCORD_SERVER_PORT);
