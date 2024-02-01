const express = require('express');
const router = express.Router();
const Piscina = require('piscina');
const path = require('path');

let currentDeltaIndex = 0;
let deltaListArray = [];

const mongoose = require('mongoose');
const deltaSchemaFoodManager = require('../models/delta-food-manager');
const productSchemaOpenFoodFacts = require('../models/product-open-food-facts');
const productSchemaFoodManager = require('../models/product-food-manager');

// Effettuo la connessione ai database di Open Food Facts e di Food Manager
const connOpenFoodFacts = mongoose.createConnection(process.env.MONGODB_CONNECTION_URL + process.env.DATABASE_OPEN_FOOD_FACTS);
const connFoodManager = connOpenFoodFacts.useDb(process.env.DATABASE_FOOD_MANAGER);

/** ACQUISISCO TUTTI I PRODOTTI DAL DATABASE DI OPEN FOOD FACTS **/
router.get('/getAll/:skip/:checkProductExists', async (req, res) => {
    //try{
        const queryLimit = 30;

        // Determino il modello di Open Food Facts
        const modelOpenFoodFacts = connOpenFoodFacts.model('Product', productSchemaOpenFoodFacts);

        var totalProducts = await modelOpenFoodFacts.count({code: {$ne: ''}});

        let piscina = new Piscina({
            filename: path.resolve(__dirname, '../utils/worker.js')
        });

        for (let i = parseInt(req.params.skip); i < totalProducts - 1; i = i + queryLimit) {
            let productAcquired = 0;
            let productExs = 0;

            // Effettuo la ricerca dei prodotti, filtrati per skip e limit
            const dataTot = await modelOpenFoodFacts.find({code: {$ne: ''}}).sort({code: 1}).skip(i).limit(queryLimit);

            const data = dataTot.filter((product, index) => index === dataTot.findIndex(
                otherProduct => product.code === otherProduct.code
            ));

            productExs = dataTot.length - data.length;

            let itemsMap = {};

            if (data) {
                for (let element of data) {
                    const productSaved = await getProduct(element, req.params.checkProductExists, false);

                    itemsMap[productSaved.code] = productSaved;
                    
                    /*if (productSaved) {
                        productAcquired++;
                    } else {
                        productExs++;
                    }*/
                }
            } else {
                res.status(404).json({message: 'products not found'});
            }

            let promises = [];
            for (const key in itemsMap) {
                promises.push(piscina.run({ modelJson: itemsMap[key] }));
            }
            
            const result = await Promise.all(promises).catch(function(err) {
                console.log('A promise failed to resolve', err);
                i = i - queryLimit;
                console.log('Retry...');
            });

            promises = null;

            console.log("Step: " + i + "/" + totalProducts);
            //console.log("productsAcquired", productAcquired);
            //console.log("productsExists", productExs);
            console.log("-------------------------------");
        }

        res.status(200).json({message: 'process completed'});
    /*}
    catch(error){
        res.status(500).json({message: error.message})
    }*/
});

async function getProduct(product, checkProductExists, updateProduct) {
    const fs = require('fs');

    // Determino il modello di Food Manager
    const modelFoodManager = connFoodManager.model("Product", productSchemaFoodManager);

    // Acquisisco il codice del prodotto
    const code = product.code.toString();

    // Verifico se esiste già un prodotto con questo codice nel database di Food Manager
    let productExists = false;

    if (checkProductExists) productExists = await modelFoodManager.findOne({code: code});

    // Acquisisco la revisione dell'immagine frontale e determino l'URL dell'immagine frontale
    let imageRev = 0;
    let frontImage = '';
    if (product.images && product.images['front_' + product.lang]) {
        imageRev = product.images['front_' + product.lang].rev;

        frontImage = 'https://it.openfoodfacts.org/images/products/';

        if (code.length > 8) {
            frontImage += code.substring(0, 3);
            frontImage += '/' + code.substring(3, 6);
            frontImage += '/' + code.substring(6, 9);
            frontImage += '/' + code.substring(9, code.length);
        } else {
            frontImage += code;
        }

        frontImage += '/front_' + product.lang + '.' + imageRev + '.400.jpg';
    }

    // Itero la mappa "languagesCodes", acquisisco le sigle delle lingue e le memorizzo in un array di oggetti
    let languagesCodes = [];
    if (product.languages_codes.length) {
        for (const [key, value] of Object.entries(product.languages_codes[0])) {
            languagesCodes.push({langCode: key});
        }
    }

    // Acquisisco i nomi dei prodotti nelle varie lingue e creo una mappa
    let productNamesLangs = {};
    languagesCodes.forEach(element2 => {
        const productNameLang = product['product_name_' + element2.langCode];
        if (productNameLang) {
            productNamesLangs[element2.langCode] = productNameLang;
        }
    });

    /*let downloadURL = null;

    if (frontImage) {
        const path = `products/${code}`;

        const fileRef = firebase.storage().ref().child(path);
        const response = await fetch(frontImage);

        if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
    
            const task = await fileRef.put(arrayBuffer, { contentType: 'image/jpeg' });
            downloadURL = await task.ref.getDownloadURL();

            //fs.writeFileSync(`public/${path}`, Buffer.from(arrayBuffer));
        }
    }*/

    // Imposto il json da memorizzare nel database di Food Manager
    const modelJson = {
        code: code ? code : null,
        lang: product.lang ? product.lang : null,
        productName: product.product_name ? product.product_name : null,
        productFormat: product.quantity ? product.quantity : null,
        brands: product.brands ? product.brands : null,
        productNamesLangs: productNamesLangs ? productNamesLangs : null,
        image: '',
        frontImage: frontImage ? frontImage : null,
        frontImageRev: imageRev ? imageRev : null,
        creator: "openfood-import",
        ingredients: product.ingredients ? product.ingredients : null,
        creationDate : new Date().getTime()
    };

    return modelJson;

    // Determino il documento da memorizzare
    //if (!productExists) {
        /*const productSave = await new modelFoodManager(modelJson);

        // Effettuo il salvataggio dei dati
        productSave.save();*/

        //await firebase.firestore().collection("openfoodProducts").doc(modelJson.code).set(modelJson);

        //return true;
    /*} else if (productExists && updateProduct) {
        const query = {code: code};
        modelFoodManager.findOneAndUpdate(query, modelJson, {upsert: false}, function(err, doc) {
            if (err) return res.send(500, {error: err});
            console.log("update: " + code);
            return true;
        });
    } else {
        return false;
    }*/
}

router.get('/getOne/:code', async (req, res) => {
    try{
        // Effettuo la connessione ai database di Open Food Facts e di Food Manager
        const connOpenFoodFacts = mongoose.createConnection(process.env.MONGODB_CONNECTION_URL + process.env.DATABASE_OPEN_FOOD_FACTS);
        const connFoodManager = connOpenFoodFacts.useDb(process.env.DATABASE_FOOD_MANAGER);

        // Determino il modello di Open Food Facts
        const modelOpenFoodFacts = connOpenFoodFacts.model('Product', productSchemaOpenFoodFacts);
        
        // Effettuo la ricerca del prodotto in base al codice a barre (o codice)
        const data = await modelOpenFoodFacts.findOne({code: req.params.code});
        
        if (data) {
            // Acquisisco la revisione dell'immagine frontale
            const imageRev = data.images['front_' + data.lang].rev;

            // Determino l'URL dell'immagine frontale
            let frontImage = 'https://it.openfoodfacts.org/images/products/';
            frontImage += req.params.code.substring(0, 3);
            frontImage += '/' + req.params.code.substring(3, 6);
            frontImage += '/' + req.params.code.substring(6, 9);
            frontImage += '/' + req.params.code.substring(9, 13);
            frontImage += '/front_' + data.lang + '.' + imageRev + '.400.jpg';

            // Itero la mappa "languagesCodes", acquisisco le sigle delle lingue e le memorizzo un un array di oggetti
            let languagesCodes = [];
            for (const [key, value] of Object.entries(data.languages_codes[0])) {
                languagesCodes.push({langCode: key});
            }

            // Acquisisco i nomi dei prodotti nelle varie lingue e creo una mappa
            let productNamesLangs = {};
            languagesCodes.forEach(element => {
                const productNameLang = data['product_name_' + element.langCode];
                if (productNameLang) {
                    productNamesLangs[element.langCode] = productNameLang;
                }
            });

            // Imposto il json da memorizzare nel database di Food Manager
            const modelJson = {
                code: data.code,
                lang: data.lang,
                product_name: data.product_name,
                brands: data.brands,
                product_names_langs: productNamesLangs,
                front_image: frontImage,
                front_image_rev: imageRev,
                front_image_acquired: '',
                ingredients: data.ingredients
            };

            // Determino il modello di Food Manager
            const modelFoodManager = connFoodManager.model("Product", productSchemaFoodManager);

            // Determino il documento da memorizzare
            const productSave = new modelFoodManager(modelJson);

            // Effettuo il salvataggio dei dati
            const savedData = await productSave.save();

            // Visualizzo a schermo il responso
            res.status(200).json(savedData);
        } else {
            res.status(404).json({message: 'product not found'});
        }
    }
    catch(error){
        res.status(500).json({message: error.message})
    }
});

/** ACQUISISCO I PRODOTTI DAL DELTA DI OPEN FOOD FACTS **/
router.get('/getDelta', async (req, res) => {
    const https = require('https');
    let deltaList = '';

    currentDeltaIndex = 0;

    // Acquisco la lista degli ultimi delta da Open Food Facts
    https.get(process.env.DELTA_LIST_OPEN_FOOD_FACTS, function (deltaResponse) {
        deltaResponse.on('data', (chunk) => {
            deltaList = '' + chunk;
        });

        deltaResponse.on('end', async () => {
            deltaListArray = deltaList.split(/\r?\n/);

            checkDeltaAcquired(res);
        });
    }).on('error', (e) => {
        console.log('Error retrieving delta list: ' + e.message);
    });
});

async function checkDeltaAcquired(res) {
    if (deltaListArray.length > currentDeltaIndex + 1) {
        if (deltaListArray[currentDeltaIndex].trim() !== '') {
            // Determino il modello di Food Manager
            const modelFoodManager = connFoodManager.model('Delta', deltaSchemaFoodManager);

            const deltaAcquired = await modelFoodManager.findOne({deltafile: deltaListArray[currentDeltaIndex]});

            if (!deltaAcquired) {
                acquireDelta(res)
            } else {
                currentDeltaIndex++;
                checkDeltaAcquired(res);
            }
        }
    } else {
        deltaAcquisitionFinished(res);
    }
}

function acquireDelta(res) {
    const https = require('https');
    const fs = require('fs');
    
    // Se il delta non è stato ancora acquisito, scarico il file compresso
    let file = fs.createWriteStream('public/delta/' + deltaListArray[currentDeltaIndex]);

    https.get(process.env.DELTA_PATH_OPEN_FOOD_FACTS + deltaListArray[currentDeltaIndex], function (deltaFileResponse) {
        const contentLength = parseInt(deltaFileResponse.headers['content-length']); // in bytes
        let length = [];

        deltaFileResponse.pipe(file);
    
        // Grab the data buffer of the request
        deltaFileResponse.on('data', (d) => {
            length.push(d.length);
            let sum = length.reduce((a, b) => a + b, 0);
            let completedParcentage = (sum / contentLength) * 100;
            console.log(`completed reading ${sum} bytes out of ${contentLength} bytes`);
            console.log(`${completedParcentage} percentage of download complete`);
        });
    
        deltaFileResponse.on('end', () => {
            deltaExtract(res);
        });
    });
}

function deltaExtract(res) {
    const gunzip = require('gunzip-file');
    const jsonTemp = Date.now() + '.json';

    gunzip('public/delta/' + deltaListArray[currentDeltaIndex], 'public/delta/' + jsonTemp, () => {
        deltaReadFile(res, jsonTemp); 
    });
}

function deltaReadFile(res, jsonTemp) {
    const { once } = require('node:events');
    const { createReadStream } = require('node:fs');
    const { createInterface } = require('node:readline');

    (async function processLineByLine() {
        try {
            const rl = createInterface({
                input: createReadStream('public/delta/' + jsonTemp),
                crlfDelay: Infinity
            });
        
            rl.on('line', async (line) => {
                const product = JSON.parse(line);

                if (product.code) await getProduct(product, true, true);
            });
        
            await once(rl, 'close');
        
            deltaSetAcquired(res, jsonTemp);
        } catch (err) {
            console.error(err);
        }
    })();
}

async function deltaSetAcquired(res, jsonTemp) {
    // Determino il modello di Food Manager
    const modelFoodManager = connFoodManager.model('Delta', deltaSchemaFoodManager);

    // Imposto il json da memorizzare nel database di Food Manager
    const modelJson = {
        deltafile: deltaListArray[currentDeltaIndex]
    };

    const deltaSave = await new modelFoodManager(modelJson);

    // Effettuo il salvataggio dei dati
    deltaSave.save();

    deltaDeleteFiles(res, jsonTemp);
}

function deltaDeleteFiles(res, jsonTemp) {
    const fs = require('fs');

    fs.unlink('public/delta/' + deltaListArray[currentDeltaIndex], (err) => {
        if (err) throw err
    });
    fs.unlink('public/delta/' + jsonTemp, (err) => {
        if (err) throw err
    });

    // Procedo eventualmente con il successivo delta
    currentDeltaIndex++;
    checkDeltaAcquired(res);
}

function deltaAcquisitionFinished(res) {
    res.status(200).json({message: 'process complete'});
}

module.exports = router;