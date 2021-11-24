import { APIGatewayProxyHandler } from 'aws-lambda';
import fetch from 'node-fetch';
import {
  InlineQuery,
  InlineQueryResult,
  InlineQueryResultArticle,
  InputTextMessageContent,
  Update,
} from 'node-telegram-bot-api';
import { URL } from 'url';

const BASE_LMGTFY_URL = 'https://letmegooglethat.com/';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_SEND_MESSAGE_BASE_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const TELEGRAM_ANSWER_INLINE_QUERY_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerInlineQuery`;

const getLmgtfyLink = (queryStr: string): string => {
  const url = new URL(BASE_LMGTFY_URL);
  url.searchParams.append('q', queryStr);
  return url.href;
};

const getLinkAsMarkdown = (link: string, text: string) => `[${text}](${link})`;

const sendMessage = async (chatId: number, message: string): Promise<void> => {
  const url = new URL(TELEGRAM_SEND_MESSAGE_BASE_URL);
  url.searchParams.append('chat_id', chatId.toString());
  url.searchParams.append('text', message);
  url.searchParams.append('parse_mode', 'MarkdownV2');
  url.searchParams.append('disable_web_page_preview', 'true');

  const res = await fetch(url);

  console.info({
    info: 'send message',
    response: res,
    chat_id: chatId,
    text: message,
  });
};

const answerQuery = async (inlineQuery: InlineQuery, message: string) => {
  const answers: InlineQueryResult[] = [
    {
      id: '1',
      title: `Send LetMeGoogleThat link for "${inlineQuery.query}"`,
      input_message_content: {
        message_text: message,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      } as InputTextMessageContent,
      type: 'article',
    } as InlineQueryResultArticle,
  ];

  const url = new URL(TELEGRAM_ANSWER_INLINE_QUERY_URL);
  url.searchParams.append('inline_query_id', inlineQuery.id);
  url.searchParams.append('results', JSON.stringify(answers));

  const res = await fetch(url);
  console.info({
    info: 'answer query',
    response: res,
    queryId: inlineQuery.id,
    text: message,
  });
};

const handleUpdate = async (update: Update): Promise<void> => {
  if (update.message) {
    const { chat, text } = update.message;

    if (text) {
      // handle start command
      if (text.includes('/start')) {
        await sendMessage(
          chat.id,
          'Hello there, type in any text to get the LetMeGoogleThat link for it.'
        );
        return;
      }

      const link = getLmgtfyLink(text);
      const message = getLinkAsMarkdown(link, text);
      await sendMessage(chat.id, message);
    } else {
      await sendMessage(
        chat.id,
        `Whoops, I don't recognize that. Please send text.`
      );
    }
  } else if (update.inline_query) {
    const link = getLmgtfyLink(update.inline_query.query);
    const message = getLinkAsMarkdown(link, update.inline_query.query);

    await answerQuery(update.inline_query, message);
  }
};

export const lmgtfy: APIGatewayProxyHandler = async (event) => {
  const update: Update = JSON.parse(event.body as string);

  await handleUpdate(update);

  return { statusCode: 200, body: '' };
};
