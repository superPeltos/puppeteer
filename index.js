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
let packageLength = 100;
var dataForJson = []
let packageCount = 0;
let packageKey = 0;
let needle = '/c/';
let fileName = 'crawler.json'
const {performance} = require('perf_hooks');
console.log('----------- INIT -------------');
init();
//crawlWebPage('https://preprod-client.eberhardt-pro.infra.fr/content/25-hotellerie');

function init(){
    try {
        fs.unlinkSync(fileName)
        //file removed
    } catch(err) {
        console.error(err)
    }
    var t0 = performance.now()
    var request = http.request(options, function (res) {
        var data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end',  function () {
            parseString(data, (err, res) => {
                res.urlset.url.forEach((item) => {
                    // if content is not in url
                     if(item.loc[0].search(needle) !== -1){
                        if(packageCount <= packageLength){
                            if(packageData[packageKey] == undefined){
                                packageData[packageKey] = []
                            }
                            packageData[packageKey].push(item.loc[0])
                        }else{
                            packageKey++;
                            packageCount = 0;
                        }
                        packageCount++
                    }

                })
            })
            let actions = packageData.map(crawlPackage)
            var results =  Promise.all(actions);
            results.then( data => {
                    fs.appendFile(fileName, JSON.stringify(data), function (err) {
                        if (err) throw err;
                        var t1 = performance.now()
                        console.log('Saved! in '+ ((t1 - t0) / 1000) +' seconde');
                    })
                }
            );

        });
    });
    request.on('error', function (e) {
        console.log(e.message);
    });
    request.end();

}

let crawlPackage = function asynCrawl(pack){
    return new Promise((resolve,reject) => {
        let subactions = pack.map(crawlWebPage)
        var results = Promise.all(subactions);
        results.then(data => {
                console.log(data);
                resolve(dataForJson);
            }
        );
    })
}

let crawlWebPage =  async function crawlUrl(url){
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
    return new Promise((resolve,reject) =>{
        console.log('crawled');
        //console.log('test data json',dataForJson)
        resolve(dataForJson)
    })


    // console.log(dataForJson.length)
    // if(dataForJson.length > 0){
    //     await fs.appendFile('test.json', JSON.stringify(dataForJson[0]), function (err) {
    //         if (err) throw err;
    //         var t1 = performance.now()
    //         console.log('Saved! in  milliseconds');
    //     });
    // }

}


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
