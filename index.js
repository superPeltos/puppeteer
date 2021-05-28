const puppeteer = require('puppeteer');
//const yargs = require('yargs');
//const argv = yargs.argv;
const http = require('http');
const parseString = require('xml2js').parseString;
const fs = require('fs');
const {performance} = require('perf_hooks');
const options = {
    host: 'preprod-client.eberhardt-pro.infra.fr',
    path: '/1_fr_0_sitemap.xml'
}

/**
 * Package
 */
const packageLength = 10;
let packageCount = 0;
let packageKey = 0;

/**
 * Package
 */
const needle = '/c/';
const fileName = 'crawler.json'

console.log('----------- INIT -------------');
console.log('----------- INIT  TIMER-------------');
let t0 = performance.now()
init();
function deleteFile(){
    try {
        fs.unlinkSync(fileName)
    } catch(err) {
        console.log(err);
    }
}

function init(){
    if(fs.existsSync(fileName)) {
        deleteFile()
    }
    let request = http.request(options, function (res) {
        let data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end',   async function () {
            let packageData = createPackage(data);
            await crawlPackage(packageData)
        });

    });
    request.on('error', function (e) {
        console.log(e.message);
    });
    request.end();
}

async function crawlPackage(packageData){
    let dataForJson = []
    for (let pack of packageData){
        //console.log('pack',pack)
        const promises = pack.map(crawlUrl);
        // wait until all promises are resolved
        let datasCrawled = await Promise.all(promises);
        datasCrawled.map(item => {
            if(item !== null){
                dataForJson.push(item);
            }
        })
        console.log('Done!');
    }
    if(dataForJson.length !== 0){
        writeFile(dataForJson);
    }else{
        timerEnd()
        console.log('----------------------- Nothing found... -----------------------')
    }
}
/**
 * Create pakage from request
 * @param data
 */
function createPackage(data){
    let packageData = []
    parseString(data, (err, res) => {
        res.urlset.url.forEach((item) => {
            if(item.loc[0].search(needle) !== -1){
                console.log(item.loc[0])
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
    console.log(packageData);
    return packageData;

}


function timerEnd(){
    let t1 = performance.now()
    console.log('Saved! in '+ ((t1 - t0) / 1000) +' seconde');
}
function writeFile(data){
    fs.appendFile(fileName, JSON.stringify(data), function (err) {
        if (err) throw err;
        timerEnd()
    })
}

async function crawlUrl(url){
    let data = null;
    let hrefs = [];
    const needle = '/content/'
    console.log('------------------URL CRAWLED BEGIN-------------',url);
    const browserFetcher = puppeteer.createBrowserFetcher();
    const revisionInfo = await browserFetcher.download('869685');
    const browser = await puppeteer.launch({executablePath: revisionInfo.executablePath});
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36');
    await page.setDefaultNavigationTimeout(0);
    await page.goto(url, {waitUntil: 'networkidle2'});
    //let hrefSearched = await page.$$(".elementor-video-wrapper"); ->  video
    let hrefSearched = await page.$$("a");

    for( let link of hrefSearched ) {
        //hrefs.push('here') ->> video
        const href = await page.evaluate(el => el.getAttribute("href"), link);
        if(href.search(needle) !== -1 && !hrefs.includes(href)){
            hrefs.push(href)
        }
    }
    if(hrefs.length === 0 ){
        console.log('------------------NO URL CRAWLER END-------------',url);
    }else{
        data = {
            'url' : url,
            'hrefs' : hrefs
        }
        console.log('------------------URL FOUND CRAWLER DATA : -------------',data);
    }

    await browser.close();
    console.log('------------------URL CRAWLED END-------------',url);
    return data;
}