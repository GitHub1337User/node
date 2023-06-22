const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

// Функция для извлечения тайтла из HTML-кода страницы
function getTitle(html) {
  const $ = cheerio.load(html);
  return $('title').text();
}

// Функция для проверки защиты от ботов (в этом примере просто проверяем, есть ли тег <title>)
function isBotProtected(html) {
  const $ = cheerio.load(html);
  return $('title').length === 0;
}

function isYandexCaptchaDetected(html) {
  const regex = /Ой!|Oops!/i;
  const $ = cheerio.load(html);
  return regex.test($('title').text());
}

async function processRow(row) {
  const url = row['URL'];
  console.log(row);
  try {
    const response = await axios.get('https://' + url, { responseType: 'arraybuffer', timeout: 3600 });
    const html = iconv.decode(Buffer.from(response.data), 'utf8');
    const cleanText = getTitle(html);
    let decodedText = iconv.encode(iconv.decode(Buffer.from(response.data), 'windows-1251'), 'utf8').toString();
    const regex = /[а-яА-ЯЁё]/;
    let title;

    if (regex.test(cleanText)) {
      title = cleanText;
    } else {
      title = getTitle(decodedText);
    }

    if (isBotProtected(html)) {
      title = '';
    }

    if (isYandexCaptchaDetected(html)) {
      title = '';
    }

    console.log(title);

    parentPort.postMessage({ url, title });

  } catch (error) {
    console.error(`Error processing ${url}: ${error.message}`);
    let title = '';
    parentPort.postMessage({ url, title });
  }
}

if (!isMainThread) {
  processRow(workerData);
}
