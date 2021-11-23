import { APIGatewayProxyHandler } from 'aws-lambda';
import fetch from 'node-fetch';
import { InlineQueryResult, InlineQueryResultArticle, Update } from 'node-telegram-bot-api';
import { URL } from 'url';

const BASE_LMGTFY_URL = 'https://letmegooglethat.com/';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_SEND_MESSAGE_BASE_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const TELEGRAM_ANSWER_INLINE_QUERY_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerInlineQuery`;


const getLmgtfyLink = (queryStr: string): string => {
  const url = new URL(BASE_LMGTFY_URL);
  url.searchParams.append('q', queryStr);
  return url.href;
}

const sendMessage = async (chatId: number, message: string): Promise<void> => {
  const url = new URL(TELEGRAM_SEND_MESSAGE_BASE_URL);
  url.searchParams.append('chat_id', chatId.toString());
  url.searchParams.append('text', message);

  const res = await fetch(url);

  console.info({ info: 'send message', response: res, chat_id: chatId, text: message });
}

const answerQuery = async (queryId: string, message: string) => {
  const answers: InlineQueryResult[] = [
    {
      id: '1',
      title: 'Send LetMeGoogleThat Link',
      input_message_content: {
        message_text: message,
      },
      type: "article"
    } as InlineQueryResultArticle,
  ];

  const url = new URL(TELEGRAM_ANSWER_INLINE_QUERY_URL);
  url.searchParams.append('inline_query_id', queryId);
  url.searchParams.append('results', JSON.stringify(answers))

  const res = await fetch(url);
  console.info({ info: 'answer query', response: res, queryId: queryId, text: message });
}

export const lmgtfy: APIGatewayProxyHandler = async (event) => {
  const body: Update = JSON.parse(event.body as string);

  if (body.message) {
    const { chat, text } = body.message;

    if (text) {
      const message = getLmgtfyLink(text);
      await sendMessage(chat.id, message);
    } else {
      await sendMessage(chat.id, "No text given.");
    }

  } else if (body.inline_query) {
    const inlineQuery = body.inline_query;
    const query = inlineQuery.query;

    if (query) {
      const message = getLmgtfyLink(inlineQuery.query);
      await answerQuery(inlineQuery.id, message);
    } else {
      await answerQuery(inlineQuery.id, "No text given.");
    }
  }
  
  return { statusCode: 200, body: '' };
}
