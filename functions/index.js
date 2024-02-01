const functions = require("firebase-functions");
const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));
const admin = require('firebase-admin');
admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

const generateDeltaArray = (fileResponse) => {
    return fileResponse.split(/\r?\n/);
}

const readDelta = async (url) => {
    let fileResponse = null;
    await fetch(url)
        .then(res => res.text())
        .then(text => fileResponse = text);
    return generateDeltaArray(fileResponse);
}

const saveFileOnStorage = async (fileUrl) => {
    const response = await fetch('https://static.openfoodfacts.org/data/delta/' + fileUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const BUCKET = process.env.BUCKET_NAME;
    const FOLDER = 'deltaFiles/'

    await admin.storage()
        .bucket('gs://' + BUCKET)
        .file(FOLDER + fileUrl)
        .save(buffer);

    await admin.storage()
        .bucket('gs://' + BUCKET)
        .file(FOLDER + fileUrl).makePublic();

    let downloadURL = 'https://storage.googleapis.com/' + BUCKET + '/' + FOLDER + fileUrl;

    return downloadURL;
}

const checkIfFileIsAlreadyDownloaded = async (fileUrl) => {
    let outcome = false;
    await admin.firestore()
        .collection('deltas')
        .doc(fileUrl)
        .get()
        .then(
            response => {
                const fileInDB = response.data();
                if (fileInDB?.internalFileUrl) {
                    outcome = true;
                }
            }
        ).catch(err => {
            console.error(err);
        })
    return outcome;
}

exports.saveDeltaFilesCronJob = functions
    .region('europe-west6')
    .pubsub
    .schedule('10 10 * * *')
    .timeZone('Europe/Zurich')
    .onRun(async (context) => {
        functions.logger.info("Calling saveDeltaFiles!", { structuredData: true });

        const url = "https://static.openfoodfacts.org/data/delta/index.txt";
        const fileList = await readDelta(url);

        for (let index in fileList) {
            const file = fileList[index].trimEnd();
            if (file != "") {
                functions.logger.info(`Checking file: ${file}.`, { structuredData: true });
                const fileIsNotSaved = !await checkIfFileIsAlreadyDownloaded(file)
                if (fileIsNotSaved) {
                    functions.logger.info(`Saving file: ${file}.`, { structuredData: true });
                    const internalFileUrl = await saveFileOnStorage(file);

                    await admin.firestore().collection('deltas').doc(file).set({ file, processed: false, internalFileUrl });
                }
            }
        }
        functions.logger.info("Closing saveDeltaFiles!", { structuredData: true });
    })

const getOldestNotProcessedDelta = async () => {
    let oldestFile = null;
    await admin.firestore()
        .collection('deltas')
        .orderBy(admin.firestore.FieldPath.documentId(), "asc")
        .where("processed", '==', false)
        .limit(1)
        .get()
        .then(result => result.forEach(res => {
            oldestFile = res.data();
        }));
    return oldestFile;
}

const setDeltaAsProcessed = async (oldestDelta) => {
    const docId = oldestDelta.file;
    await admin.firestore()
        .collection('deltas')
        .doc(docId)
        .update({ processed: true });
}

const runtimeOpts = {
    timeoutSeconds: 540,
    memory: '4GB'
}

const saveImageOnStorage = async (imageUrl, code) => {
    const response = await fetch(imageUrl);
    let downloadURL = null;

    if (response.status === 200) {
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const BUCKET = process.env.BUCKET_NAME;
        const FOLDER = 'products/';

        await admin.storage()
            .bucket('gs://' + BUCKET)
            .file(FOLDER + code)
            .save(buffer, {
                contentType: 'image/jpeg'
            });

        await admin.storage()
            .bucket('gs://' + BUCKET)
            .file(FOLDER + code).makePublic();

        downloadURL = 'https://storage.googleapis.com/' + BUCKET + '/' + FOLDER + code;
    }

    return downloadURL;
}

exports.processOldestDelta = functions
    .runWith(runtimeOpts)
    .region('europe-west6')
    .pubsub
    .schedule('*/10 11-14 * * *')
    .timeZone('Europe/Zurich')
    .onRun(async (context) => {
        functions.logger.info("processOldestDelta: START", { structuredData: true });

        const { ungzip } = require('node-gzip');

        const oldestFile = await getOldestNotProcessedDelta();

        if (oldestFile) {
            const fileRead = await fetch(oldestFile.internalFileUrl);
            const blob = await fileRead.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer, 'utf8');

            const unzipped = (await ungzip(buffer)).toString();
            const arrayResponse = unzipped.split(/\r?\n/);
            const lastIndex = oldestFile?.lastIndex ? parseInt(oldestFile.lastIndex) : -1;

            for (let index in arrayResponse) {
                if (index > lastIndex) {
                    if (arrayResponse[index].trim() !== "") {
                        const product = JSON.parse(arrayResponse[index]);

                        if (product.code) {
                            if (product) {
                                const code = product.code;
                                const readCurrentProduct = await admin.firestore()
                                    .collection('products')
                                    .doc(product.code)
                                    .get();
                                const currentProduct = readCurrentProduct.data();

                                let imageRev = 0;
                                //let frontImage = product.image_front_url;
                                let frontImage = "";
                                //if (!frontImage) {
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
                                //}


                                // Itero la mappa "languagesCodes", acquisisco le sigle delle lingue e le memorizzo in un array di oggetti
                                let languagesCodes = [];
                                if (product.languages_codes.length) {
                                    for (const [key, value] of Object.entries(product.languages_codes[0])) {
                                        languagesCodes.push({ langCode: key });
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


                                // Imposto il json da memorizzare nel database di Food Manager
                                const modelJson = {
                                    code: code ? code : null,
                                    lang: product.lang ? product.lang : currentProduct?.lang ? currentProduct.lang : null,
                                    productName: product.product_name ? product.product_name : currentProduct?.productName ? currentProduct.productName : null,
                                    productFormat: product.quantity ? product.quantity : currentProduct?.productFormat ? currentProduct.productFormat : null,
                                    brands: product.brands ? product.brands : currentProduct?.brands ? currentProduct.brands : null,
                                    productNamesLangs: productNamesLangs ? productNamesLangs : currentProduct?.productNamesLangs ? currentProduct.productNamesLangs : null,
                                    frontImage: frontImage ? frontImage : currentProduct?.frontImage ? currentProduct.frontImage : null,
                                    frontImageRev: imageRev ? imageRev : currentProduct?.imageRev ? currentProduct.imageRev : null,
                                    creator: "openfood-import",
                                    ingredients: product.ingredients ? product.ingredients : currentProduct?.ingredients ? currentProduct.ingredients : null,
                                    lastUpdatedDate: new Date().getTime()
                                };

                                if (currentProduct) {
                                    if (currentProduct.frontImage != modelJson.frontImage) {
                                        if (modelJson.frontImage) {
                                            //new Image is not null, try to download it!
                                            const url = await saveImageOnStorage(modelJson.frontImage, modelJson.code);
                                            if (url) {
                                                modelJson.image = url;
                                            } else {
                                                modelJson.frontImage = currentProduct.frontImage;
                                                modelJson.image = currentProduct.image ? currentProduct.image : null;
                                            }
                                        }
                                    }
                                    await admin.firestore().collection("products").doc(modelJson.code).update(modelJson);
                                } else {
                                    modelJson.creationDate = new Date().getTime()
                                    await admin.firestore().collection("products").doc(modelJson.code).set(modelJson);
                                }
                                await admin.firestore()
                                    .collection('deltas')
                                    .doc(oldestFile.file)
                                    .update({ lastIndex: index });
                            }
                        }
                    }
                }
            }
            setDeltaAsProcessed(oldestFile);
        }
        functions.logger.info("processOldestDelta: END", { structuredData: true });
    })



