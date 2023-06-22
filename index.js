const { Worker } = require('worker_threads');

const xlsx = require('xlsx');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const fs = require('fs');

const workbook = xlsx.readFile('domains2.csv');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(worksheet);
console.log(data)

const resultWorkbook = xlsx.utils.book_new();
const resultWorksheet = xlsx.utils.json_to_sheet([]);
xlsx.utils.book_append_sheet(resultWorkbook, resultWorksheet, 'response');
// const resultWorksheet = resultWorkbook.Sheets["Sheet1"];

// Максимальное количество одновременно работающих потоков
const maxConcurrentWorkers = 10;

// Очередь задач для обработки
const taskQueue = data.slice();
let strings = 0;
// Результаты обработки
// let results = [];

// Функция для обработки одной строки данных в рабочем потоке
function processRowWorker(row) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./processRowWorker.js', { workerData: row });
    
    
    worker.on('message', message => {
      // results.push(message);
      strings+=1;
      console.log("\x1b[36m","Stings resolved: "+strings+"\x1b[0m")
      xlsx.utils.sheet_add_json(resultWorksheet, [message], { skipHeader: true, origin: -1 });
      xlsx.writeFile(resultWorkbook, 'output.xlsx');
      resolve();
      
    });

    worker.on('error', error => {
      console.error(`Error processing row: ${error.message}`);
      resolve();
    });

    worker.on('exit', code => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    // if(results.length>99){
    //   // xlsx.utils.sheet_add_aoa(resultWorksheet, [results], {origin:-1});
    //   xlsx.utils.sheet_add_json(resultWorksheet, results, { skipHeader: true, origin: -1 });
    //   xlsx.writeFile(resultWorkbook, 'output.xlsx');
    //   results = [];
    // }
  });
}

// Функция для выполнения обработки строк данных
async function processRows() {
  while (taskQueue.length > 0) {
    const workerPromises = [];

    // Ограничение количества одновременно работающих потоков
    const numWorkers = Math.min(maxConcurrentWorkers, taskQueue.length);

    for (let i = 0; i < numWorkers; i++) {
      const row = taskQueue.shift();
      const workerPromise = processRowWorker(row);
      workerPromises.push(workerPromise);
    }

    await Promise.all(workerPromises);
  }

  // xlsx.utils.sheet_add_json(resultWorksheet, results, { skipHeader: true, origin: -1 });
  // xlsx.utils.book_append_sheet(resultWorkbook, resultWorksheet, 'Sheet1');
  console.log('Parsing complete. Results saved in output.xlsx');
  console.log('Time spent = '+performance.now() / 1000 / 60)
}

processRows();