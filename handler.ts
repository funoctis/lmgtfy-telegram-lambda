import { APIGatewayProxyHandler } from 'aws-lambda';
import fetch from 'node-fetch';
import {
  InlineQueryResult,
  InlineQueryResultArticle,
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

const sendMessage = async (chatId: number, message: string): Promise<void> => {
  const url = new URL(TELEGRAM_SEND_MESSAGE_BASE_URL);
  url.searchParams.append('chat_id', chatId.toString());
  url.searchParams.append('text', message);

  const res = await fetch(url);

  console.info({
    info: 'send message',
    response: res,
    chat_id: chatId,
    text: message,
  });
};

const answerQuery = async (queryId: string, message: string) => {
  const answers: InlineQueryResult[] = [
    {
      id: '1',
      title: 'Send LetMeGoogleThat Link',
      input_message_content: {
        message_text: message,
      },
      type: 'article',
    } as InlineQueryResultArticle,
  ];

  const url = new URL(TELEGRAM_ANSWER_INLINE_QUERY_URL);
  url.searchParams.append('inline_query_id', queryId);
  url.searchParams.append('results', JSON.stringify(answers));

  const res = await fetch(url);
  console.info({
    info: 'answer query',
    response: res,
    queryId: queryId,
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

      const message = getLmgtfyLink(text);
      await sendMessage(chat.id, message);
    } else {
      await sendMessage(
        chat.id,
        `Whoops, I don't recognize that. Please send text.`
      );
    }
  } else if (update.inline_query) {
    const message = getLmgtfyLink(update.inline_query.query);

    await answerQuery(update.inline_query.id, message);
  }
};

export const lmgtfy: APIGatewayProxyHandler = async (event) => {
  const update: Update = JSON.parse(event.body as string);

  await handleUpdate(update);

  return { statusCode: 200, body: '' };
};
