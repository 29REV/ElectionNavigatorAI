const axios = require('axios');
const cheerio = require('cheerio');

async function debugScrape() {
  const url = "https://myneta.info/TamilNadu2026/index.php?action=show_candidates&constituency_id=33";
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const table = $('table').eq(3);
    console.log("TABLE 3 FULL TEXT SAMPLE:");
    console.log(table.text().substring(0, 1000));
    console.log("ROW COUNT:", table.find('tr').length);
  } catch (e) {
    console.error(e);
  }
}



debugScrape();
