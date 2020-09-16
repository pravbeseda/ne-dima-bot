// Thanks to Francisco Gutiérrez "Serverless Telegram Bot with Firebase"
// https://medium.com/@pikilon/serverless-telegram-bot-with-firebase-d11d07579d8a

import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';
import { addHours, differenceInHours, isBefore } from 'date-fns'

const botNames = [ 'кда' ];
const botPause = 24; // Пауза после последнего случайного сообщения, в часах
const banPause = 48; // Пауза после "заткнись", в часах
const botProbability = 5; // вероятность высказывания, в %

let lastMsgDate: Date;
let banUntilDate: Date;
const canSay = () => !lastMsgDate || differenceInHours(lastMsgDate, new Date()) > botPause;
const isNotBanned = () => !banUntilDate || isBefore(banUntilDate, new Date());
const rand = (list: string[]): string => list[Math.round((Math.random() * list.length))];
const isRand = (probability: number): boolean => Math.random() > ((100 - probability) / 100);

// give us the possibility of manage request properly
const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

// our single entry point for every message
app.post('/', async (req, res) => {
  // https://core.telegram.org/bots/api#update

  const isTelegramMessage = req.body
    && req.body.message
    && req.body.message.chat
    && req.body.message.chat.id
    && req.body.message.from
    && req.body.message.from.first_name;

  if (isTelegramMessage) {
    const chat_id = req.body.message.chat.id;
    const { text } = req.body.message;
    const { first_name, username } = req.body.message.from;

    let answer = null;

    const txt = text?.toLowerCase() ?? '';
    if (botNames.some(name => txt.includes(name)) && txt.includes('статус')) {
      answer = `Статус бота: \n Блокировка: ${isNotBanned() ? 'нет' : 'до ' + banUntilDate }`;
      answer += `\n Последнее сообщение: ${lastMsgDate || 'не помню'}`;
      answer += `\n Может говорить: ${ canSay() ? 'да' : 'да, но не хочет.'}`;
      // Отправляю тут, чтобы не портить статистику даты последнего сообщения
      return res.status(200).send({
        method: 'sendMessage',
        chat_id,
        text: answer
      });
    } else if (isNotBanned()) {
      if (botNames.some(name => txt.includes(name))) { // К боту обратились
        if (txt.includes('извинись')) {
          answer = rand(['Извините', 'Нет']);
        } else if (txt.includes('заткнись')) {
          answer = rand(['Грубо', 'Молчу']);
          banUntilDate = addHours(new Date(), banPause);
        } else if (txt.includes('привет')) {
          answer = `Привет, ${first_name}!`;
        } else if (['?', 'подтверди', 'скажи', 'правда'].some(item => txt.includes(item))) {
          answer = rand([
            'Конечно, я всегда об этом говорил!',
            'Не было такого',
            'Так точно',
            'Не помню',
            `${first_name}, ты о чем вообще?`,
            'Конечно, я всегда об этом говорил!',
            'Конечно, я всегда об этом говорил!',
          ]);
        } else {
          answer = rand([
            'Не понимаю, о чем ты?',
            'Через 15 минут всем быть у меня в кабинете',
            'Поясни',
            'Лучше Астру переставь'
          ]);
        }
      } else if (canSay() && isRand(botProbability)) {
        if (username.toLowerCase() === 'availov') {
          answer = rand([
            'Юра, кончай страдать фигней, возвращайся!',
            `Юра, webrtc сам себя не напишет.`,
            `Юра, вернись, я все прощу!`,
            `Юра, в понедельник едешь на Балаковку и сиди там, пока все не починишь`,
          ]);
        } else {
          answer = rand([
            'А я всегда об этом говорил!',
            `Дайте мне двух студентов и одну неделю!`,
            `А наши предки никаких аджайлов не знали, делали танки по ГОСТу и войну выиграли!`,
            `Нет, все-таки вы не профессионалы`,
            'Это фигня, я в детском саду такое за полдня писал!',
            `Так, ${first_name}, а почему ты не работаешь?`,
          ]);
        }
      }
    } else {
      if (botNames.some(name => txt.includes(name)) && txt.includes('прости')) {
        answer = rand(['Ладно, забыли', 'Принято']);
        banUntilDate = new Date();
      }
    }

    if (answer) {
      lastMsgDate = new Date();
      return res.status(200).send({
        method: 'sendMessage',
        chat_id,
        text: answer
      });
    } else {
      return res.status(200).send({ status: 'OK' });
    }
  }

  return res.status(200).send({ status: 'not a telegram message' });
})
// this is the only function it will be published in firebase
export const router = functions.https.onRequest(app);
