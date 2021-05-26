const puppeteer = require('puppeteer');
const yargs = require('yargs');
const argv = yargs.argv;

// if (argv._.length != 1) {
//   console.log("Un argument et un seul attendu, une url.");
//   process.exit();
// }
// const url = argv._[0];
//
// (
//   async () => {
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36');
//     await page.goto(url, { waitUntil: 'networkidle2' });
//     const cookies = await page._client.send('Network.getAllCookies');
//     console.log(JSON.stringify(cookies, null, 4));
//
//     await browser.close();
//   })();

var http = require('http');
var parseString = require('xml2js').parseString;
var fs = require('fs');

var options = {
    host: 'preprod-client.eberhardt-pro.infra.fr',
    path: '/1_fr_0_sitemap.xml'
}
let packageData = [];
let packageLength = 10;

let packageCount = 0;
let packageKey = 0;
let needle = '/c/';
let fileName = 'crawler.json'
const {performance} = require('perf_hooks');
console.log('----------- INIT -------------');
console.log('----------- INIT  TIMER-------------');
let t0 = performance.now()
init();
//crawlWebPage('https://preprod-client.eberhardt-pro.infra.fr/content/25-hotellerie');
function deleteFile(){
    try {
        fs.unlinkSync(fileName)
    } catch(err) {
        console.log(err);
    }
}

async function init(){
    if(fs.existsSync(fileName)) {
        deleteFile()
    }

    var request = await http.request(options, function (res) {
        var data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end',   function () {
            createPackage(data);
        });
    });
    request.on('error', function (e) {
        console.log(e.message);
    });
    request.end();


    //let actions = packageData.map(crawlPackage)


}

/**
 * Create pakage from request
 * @param data
 */
async function createPackage(data){
    let dataForJson = []
    parseString(data, (err, res) => {
        res.urlset.url.forEach((item) => {
            // if content is not in url
            if(item.loc[0].search(needle) !== -1){
                //console.log(item.loc)
                if(packageCount < packageLength){
                    if(packageData[packageKey] === undefined){
                        packageData[packageKey] = []
                        packageData[packageKey].push(item.loc[0])
                        packageCount++
                    }else{
                        packageData[packageKey].push(item.loc[0])
                        packageCount++
                    }
                }else{
                    packageKey++;
                    packageCount = 0;
                    if(packageData[packageKey] === undefined){
                        packageData[packageKey] = []
                        packageData[packageKey].push(item.loc[0])
                        packageCount++
                    }else{
                        packageData[packageKey].push(item.loc[0])
                        packageCount++
                    }
                }

            }
        })
    })

    //console.log('Package data',packageData);

    for (let pack of packageData){
        //console.log('pack',pack)
        const promises = pack.map(crawlUrl);
        // wait until all promises are resolved
        let dataCrawled = await Promise.all(promises);
        if(dataCrawled !== null){
            dataForJson.push(dataCrawled);
        }

        console.log('Done!');
    }
    console.log(dataForJson.length)
    if(dataForJson.length === 0){
        console.log('----------------------- Nothing found... -----------------------')
        return
    }
    writeFile(dataForJson);

}
function writeFile(data){
    fs.appendFile(fileName, JSON.stringify(data), function (err) {
        if (err) throw err;
        let t1 = performance.now()
        console.log('Saved! in '+ ((t1 - t0) / 1000) +' seconde');
    })
}

async function crawlUrl(url){
    let hrefs = [];
    console.log('------------------URL CRAWLED BEGIN-------------',url);
    const browserFetcher = puppeteer.createBrowserFetcher();
    const revisionInfo = await browserFetcher.download('869685');
    const browser = await puppeteer.launch({executablePath: revisionInfo.executablePath});
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36');
    await page.setDefaultNavigationTimeout(0);
    await page.goto(url, {waitUntil: 'networkidle2'});
    var hrefSearched = await page.$$("a");

    for( let link of hrefSearched ) {
        const href = await page.evaluate(el => el.getAttribute("href"), link);
        let needle = '/content/'
        if(href.search(needle) !== -1 && !hrefs.includes(href)){
            hrefs.push(href)
        }

    }
    if(hrefs.length === 0 ){
        console.log('------------------NO URL URL CRAWLED END-------------',url);
        await browser.close();
        return null
    }
    let data = {
        'url' : url,
        'hrefs' : hrefs
    }
    await browser.close();
    console.log('------------------URL CRAWLED END-------------',url);
    console.log('------------------DATA CRAWLED JSONS-------------',data);
    return data;
}
/*
let crawlWebPage =  async function crawlUrl(url){
    console.log('------------------URL CRAWLED BEGIN-------------',url);
    const browserFetcher = puppeteer.createBrowserFetcher();
    const revisionInfo = await browserFetcher.download('869685');
    const browser = await puppeteer.launch({executablePath: revisionInfo.executablePath});
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36');
    await page.setDefaultNavigationTimeout(0);
    await page.goto(url, {waitUntil: 'networkidle2'});
    var hrefSearched = await page.$$("a");
    for( let link of hrefSearched ) {
        const href = await page.evaluate(el => el.getAttribute("href"), link);
        let needle = '/content/'
        if(href.search(needle) !== -1 && !dataForJson.includes(url)){
            dataForJson.push(url)
        }
    }
    //var hrefSearched = await page.$$(".video--container");
    // if(hrefSearched.length != 0){
    //
    // }
    //console.log(dataForJson)
    await browser.close();
    console.log('------------------URL CRAWLED END-------------',url);
    return new Promise((resolve,reject) =>{
        //console.log('test data json',dataForJson)
        resolve(dataForJson)
    })
*/


    // console.log(dataForJson.length)
    // if(dataForJson.length > 0){
    //     await fs.appendFile('test.json', JSON.stringify(dataForJson[0]), function (err) {
    //         if (err) throw err;
    //         var t1 = performance.now()
    //         console.log('Saved! in  milliseconds');
    //     });
    // }




/*
* async function crawlWebPage(url){
    console.log('in crawler',url);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36');
    await page.setDefaultNavigationTimeout(0);
    await page.goto(url, {waitUntil: 'networkidle2'});
    var hrefSearched = await page.$$(" section#content .elementor-inner .btn--arrow");
    //var hrefSearched = await page.$$(".video--container");
    if(hrefSearched.length != 0){
        dataForJson.push(url)
    }
    //console.log(dataForJson)
    await browser.close();
    console.log(dataForJson.length)
    // if(dataForJson.length > 0){
    //     await fs.appendFile('test.json', JSON.stringify(dataForJson[0]), function (err) {
    //         if (err) throw err;
    //         var t1 = performance.now()
    //         console.log('Saved! in  milliseconds');
    //     });
    // }

}
* */
    //console.log(item.loc);
