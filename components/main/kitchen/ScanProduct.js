import DateTimePicker from '@react-native-community/datetimepicker';
import dateFormat from "dateformat";
import { BarCodeScanner } from 'expo-barcode-scanner';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar, BottomSheet, Button, Card, Header, Icon, Text } from 'react-native-elements';
import { showMessage } from "react-native-flash-message";
import { moderateScale, moderateVerticalScale } from 'react-native-size-matters';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { theme } from '../../../css/theme';
import { getI18n } from '../../../i18n/translationService';
import { generateRandomId } from '../../../utils/utilsService';
import PermissionScreen from '../../common/Permission';
import EmptyLogoScreen from '../../common/EmptyLogo';
require("firebase/compat/firestore");
require("firebase/compat/storage");
require("core-js/actual/array/group-by");
import SplashScreen from '../../common/Splash';
import { checkForExpiringProductInKitchenAndSchedulePush } from '../../service/notificationService';
import { updateUserTutorial, KITCHEN_TUTORIAL } from '../../service/rewardService';

const ScanProductScreen = (props, { navigation }) => {

    const language = props.currentUser?.language;
    const locale = props.currentUser?.language ? props.currentUser?.language : 'en-US';
    const i18n = language ? getI18n(language) : getI18n();

    const kitchenId = props.route.params.kitchenId;
    const productKey = props.route.params.productKey;
    const instancesStatus = props.route.params.instancesStatus === 'all' ? 'closed' : props.route.params.instancesStatus;
    const filter = props.route.params.filter;
    const uploadedUrl = props.route.params.uploadedURL;

    let initInstancesToAdd = props.route.params.instancesToAdd;

    let selectedProducts = props.route.params.selectedProducts;
    const isAdd = initInstancesToAdd ? true : productKey ? false : true;
    const isSwap = selectedProducts ? true : false;
    const isEdit = !isSwap && !isAdd;
    const place = isSwap ? i18n.get('swapProduct') : isAdd ? i18n.get('addProduct') : i18n.get('editProduct');

    const currentUser = props.currentUser;
    const [hasPermission, setHasPermission] = useState(null);
    const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
    const [androidBottomSheetVisible, setAndroidBottomSheetVisible] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [ean, setEan] = useState('')
    const [type, setType] = useState('')
    const [formError, setFormError] = useState('')
    const [product, setProduct] = useState(emptyProduct)
    const [productPrice, setProductPrice] = useState(null)
    const [changedProductPrice, setChangedProductPrice] = useState(false)

    const [expirationDate, setExpirationDate] = useState(null)
    const [isValid, setIsValid] = useState(false);
    const isAndroid = Platform.OS === 'android' ? true : false;

    const [instanceKey, setInstanceKey] = useState(null);
    const [instanceForExpirationDate, setInstanceForExpirationDate] = useState(null);
    const [exampleExpirationDate, setExampleExpirationDate] = useState(null);

    const emptyInstance = {
        quantity: 1,
        expirationDate: null,
        statusExpirationDate: null,
        status: instancesStatus,
        id: generateRandomId(10)
    };
    initInstancesToAdd = initInstancesToAdd ? [] : [emptyInstance];
    const [instancesToAdd, setInstancesToAdd] = useState(initInstancesToAdd);

    const emptyProduct = {
        code: null,
        brands: null,
        productName: null,
        quantity: 1,
        image: null,
        instances: []
    }

    const findPrice = async (productKey, kitchenId) => {
        //search prices inserted from this user first, then for this kitchen, then last inserted by anyone (or average!)

        await firebase.firestore()
            .collection("productPrices")
            .doc(productKey)
            .get()
            .then((prices) => {
                const priceLogs = prices.data() ? prices.data() : {};
                const sortedPriceLogs = Object.keys(priceLogs).sort().reverse();

                sortedPriceLogs.every(key => {
                    const currentProductPrice = priceLogs[key];
                    if ((currentProductPrice.creator === firebase.auth().currentUser.uid)
                        || (currentProductPrice.kitchenId === kitchenId)) {
                        setProductPrice(currentProductPrice.price.toString());
                        return false;
                    } else return true;
                });
            })
    }

    const savePrice = async (productKey, kitchenId) => {
        await firebase.firestore()
            .collection("productPrices")
            .doc(productKey)
            .get()
            .then(async (prices) => {
                const priceLogs = prices.data() ? prices.data() : {};
                const currentTimestamp = new Date().getTime();

                priceLogs[currentTimestamp] = {
                    price: productPrice ? parseFloat(productPrice) : productPrice,
                    creator: firebase.auth().currentUser.uid,
                    currency: 'EUR',
                    kitchenId,
                    location: {},
                    creationDate: currentTimestamp
                }

                await firebase.firestore()
                    .collection("productPrices")
                    .doc(productKey)
                    .set(priceLogs)
            })
    }

    useEffect(() => {
        const loadData = async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
            if (productKey) {
                await handleBarCodeScanned({ type: 'org.gs1.EAN-13', data: productKey });
                if (product?.productName) {
                    setIsValid(true);
                }

                //search product price for this productKey!
                findPrice(productKey, kitchenId, currentUser)
            }
        };
        loadData().then(() => {
            const timeout = setTimeout(() => {
                setLoaded(true);
            }, 500);
        })
    }, []);

    useEffect(() => {
        setInstancesToAdd(instancesToAdd)
    }, [instanceKey]);

    const getFormatFromLocale = () => {
        return formatDateToLocale(new Date()).replace(/[0-9]/g, '-');
    }

    const formatDateToLocale = (date) => {
        return dateFormat(date, i18n.get('dateFormat'));
    }

    const validateProduct = () => {
        let validity = false;
        if (!product.productName) {
            setFormError(i18n.t('productName') + i18n.t('error.mandatory'));
        } else {
            validity = true;
        }
        setIsValid(validity)
        return validity;
    }

    const isEan = (code) => {
        return /^\d+$/.test(code);
    }

    const getListToConsider = () => {
        return (instancesStatus === 'toBuy' || instancesStatus === 'inTheCart') ? 'shoppingList' : 'productsList';
    }

    const getOtherList = () => {
        return getListToConsider() === 'shoppingList' ? 'productsList' : 'shoppingList';
    }

    const openCameraToAdd = async (productKey, kitchenId) => {
        const key = productKey ? productKey : ean;
        if (validateProduct()) {
            await confirmProduct(false);
            props.navigation.replace("Add", { language, imageType: 'productPicture', listToConsider: getListToConsider(), productKey: key, kitchenId, instancesStatus, instancesToAdd });
        }
    }

    const changeProductName = (changedProductName) => {
        const updatedProduct = Object.assign({}, product);
        updatedProduct.productName = changedProductName;
        setProduct(updatedProduct);
        validateProduct();
    }

    const changeProductBrands = (changedProductBrands) => {
        const updatedProduct = Object.assign({}, product);
        updatedProduct.brands = changedProductBrands;
        setProduct(updatedProduct);
        validateProduct();
    }

    const changeProductFormat = (changedProductFormat) => {
        const updatedProduct = Object.assign({}, product);
        updatedProduct.productFormat = changedProductFormat;
        setProduct(updatedProduct);
        validateProduct();
    }

    const changeProductPrice = (text) => {
        const productPrice = text.replace(/[^\d.]|\.(?=.*\.)/g, '');
        setProductPrice(productPrice);
        setChangedProductPrice(true);
    }

    const hideBottomSheet = () => {
        setBottomSheetVisible(false);
    }

    const hideAndroidBottomSheet = () => {
        setAndroidBottomSheetVisible(false);
    }

    const addInstance = (product) => {
        const updatedDate = exampleExpirationDate ? exampleExpirationDate.setHours(23, 59, 59, 999) : null;
        const newInstanceKey = generateRandomId(10);
        instancesToAdd.push({
            quantity: 1,
            expirationDate: updatedDate,
            statusExpirationDate: updatedDate,
            status: instancesStatus,
            id: newInstanceKey
        });
        setInstanceKey(newInstanceKey);
        setInstancesToAdd(sortInstances(instancesToAdd));
    }

    const removeInstance = (product, instanceKey) => {
        const index = instancesToAdd.findIndex(instance => instance.id === instanceKey);
        instancesToAdd.splice(index, 1);

        setProduct(product);
        //barbatrucco per far aggiornare quella merda di react!
        setInstanceKey(generateRandomId(10));
        setInstanceForExpirationDate(null);
        setInstancesToAdd(sortInstances(instancesToAdd));
    }

    const setBackNullAsExpirationDate = (product) => {
        if (exampleExpirationDate) {
            setProduct(product);
            setExpirationDate(null);
            setExampleExpirationDate(null);
            setInstanceForExpirationDate(null);
        }
    }

    const showBottomSheetForInstance = (instanceKey) => {
        setInstanceKey(instanceKey);
        setInstanceForExpirationDate(instanceKey);
        setExpirationDate(new Date());
        if (isAndroid) {
            setAndroidBottomSheetVisible(true)
        } else {
            setBottomSheetVisible(true)
        }
    }

    const showBottomSheet = () => {
        setExpirationDate(new Date());
        if (isAndroid) {
            setAndroidBottomSheetVisible(true)
        } else {
            setBottomSheetVisible(true)
        }
    }

    const sortInstances = (instancesToAdd) => {
        instancesToAdd.sort((a, b) => {
            const aExpirationDate = a?.statusExpirationDate ? a.statusExpirationDate : a.expirationDate;
            const bExpirationDate = b?.statusExpirationDate ? b.statusExpirationDate : b.expirationDate;
            if (!aExpirationDate) {
                return 1;
            }
            if (!bExpirationDate) {
                return -1;
            }
            return aExpirationDate - bExpirationDate;
        });
        return instancesToAdd;
    }

    const changeExpirationDate = (event, selectedDate) => {
        if (isAndroid) {
            hideAndroidBottomSheet();
        }
        if (event.type === 'set') {
            setExpirationDate(selectedDate);
            if (isAndroid) {
                confirmExpirationDate(selectedDate);
            }
        }
    }

    const confirmExpirationDate = (androidSelectedDate) => {
        let updatedDate = androidSelectedDate ? androidSelectedDate : expirationDate;
        if (instanceForExpirationDate) {
            const index = instancesToAdd.findIndex(instance => instance.id === instanceForExpirationDate);
            instancesToAdd[index].expirationDate = updatedDate.setHours(23, 59, 59, 999);
            instancesToAdd[index].statusExpirationDate = updatedDate.setHours(23, 59, 59, 999);
        } else {
            setExampleExpirationDate(updatedDate);
        }
        setProduct(product);
        setInstanceForExpirationDate(null);
        setInstancesToAdd(sortInstances(instancesToAdd));
        hideBottomSheet();
    }

    const saveOpenFoodInProducts = (product) => {
        firebase.firestore()
            .collection("products")
            .doc(product.code)
            .set({
                brands: product.brands ? product.brands : null,
                code: product.code ? product.code : null,
                image: product.image ? product.image : null,
                productName: product.productName ? product.productName : null,
                productFormat: product.productFormat ? product.productFormat : null,
                creationDate: new Date().getTime(),
                creator: firebase.auth().currentUser.uid
            })
    }

    const updateVersionsInProducts = async (product, eanCode) => {
        firebase.firestore()
            .collection("products")
            .doc(eanCode)
            .update({
                brands: product.brands ? product.brands : null,
                code: product.code ? product.code : null,
                image: product.image ? product.image : null,
                productName: product.productName ? product.improductNameage : null,
                productFormat: product.productFormat ? product.productFormat : null,
                versions: product.versions
            })
    }

    const getKitchenData = async (kitchenId) => {
        let kitchenData = null;
        await firebase.firestore()
            .collection("kitchens")
            .doc(kitchenId)
            .get()
            .then((kitchen) => {
                kitchenData = kitchen.data();
            })
        return kitchenData;
    }

    const getOpenFoodFromProducts = async (data) => {
        let productData = null;
        await firebase.firestore()
            .collection("products")
            .doc(data)
            .get()
            .then((product) => {
                productData = product.data();
            })
        return productData;
    }

    const checkIfProductChanged = (prodFromDb, product) => {
        let changed = false;
        if (product.brands && product.brands != prodFromDb.brands) {
            changed = true;
        } else if (product.image && product.image != prodFromDb.image) {
            changed = true;
        } else if (product.productFormat && product.productFormat != prodFromDb.productFormat) {
            changed = true;
        } else if (product.productName && product.productName != prodFromDb.productName) {
            changed = true;
        }
        return changed;
    }

    const storeProductIntoProducts = async (product, eanCode) => {
        let productData = await getOpenFoodFromProducts(eanCode);
        if (productData) {
            //we need to check if anything changed, in case save new version in products!
            let changed = checkIfProductChanged(productData, product);
            if (changed) {
                let versions = productData.versions ? productData.versions : [];
                versions.push({
                    brands: product.brands ? product.brands : null,
                    code: product.code ? product.code : null,
                    image: product.image ? product.image : null,
                    productName: product.productName,
                    productFormat: product.productFormat ? product.productFormat : null,
                    creationDate: new Date().getTime(),
                    creator: firebase.auth().currentUser.uid,
                    language: language ? language : 'en-GB'
                });
                productData.versions = versions;
                await updateVersionsInProducts(productData, eanCode);
            }
        }
    }

    const removeInstancesFromSelectedProduct = (toChangeList, product) => {
        const selectedProduct = toChangeList[product.code];
        if (selectedProduct) {
            product.instances.forEach(item => {
                const index = selectedProduct.instances.findIndex(instance => instance.id === item);
                selectedProduct.instances.splice(index, 1);
            });
            if (selectedProduct.instances.length === 0) {
                delete toChangeList[product.code];
            }
        }
    }

    const moveInstancesFromSelectedProduct = (toChangeList, product, updatedProduct) => {
        const selectedProduct = toChangeList[product.code];
        if (selectedProduct) {
            product.instances.forEach(item => {
                const instance = selectedProduct.instances.find(instance => instance.id === item);
                updatedProduct.instances = updatedProduct?.instances ? updatedProduct.instances : [];
                updatedProduct.instances.push({
                    quantity: 1,
                    expirationDate: instance.expirationDate,
                    statusExpirationDate: instance.statusExpirationDate,
                    status: instance.status,
                    id: instance.id
                })
            });
        }
    }


    const updateProduct = (kitchenData, instancesToAdd) => {
        const listToChange = getListToConsider();
        let toChangeList = kitchenData[listToChange];
        let updatedProduct = toChangeList[ean] ? toChangeList[ean] : {};
        let filteredInstances = [];

        if (selectedProducts) {
            //We are into the SWAP
            for (let key in selectedProducts) {
                const selectedProduct = selectedProducts[key];
                moveInstancesFromSelectedProduct(toChangeList, selectedProduct, updatedProduct);
                removeInstancesFromSelectedProduct(toChangeList, selectedProduct);
            }
        } else {
            //We are into the normal ScanProduct flow
            if (updatedProduct) {
                updatedProduct.instances = updatedProduct.instances ? updatedProduct.instances : [];
            } else {
                updatedProduct = {};
                updatedProduct.instances = filteredInstances;
            }
            updatedProduct.instances = instancesToAdd;
        }

        updatedProduct.code = product?.code ? product.code : null;
        updatedProduct.productName = product.productName;
        updatedProduct.image = product?.image ? product.image : null;
        updatedProduct.productFormat = product?.productFormat ? product.productFormat : null;
        updatedProduct.creationDate = new Date().getTime();
        updatedProduct.importedBy = firebase.auth().currentUser.uid;
        toChangeList[ean] = updatedProduct;

        return kitchenData;
    }


    const confirmationScreen = () => {
        return (instancesStatus === 'toBuy' || instancesStatus === 'inTheCart') ? 'ShoppingList' : 'Kitchen';
    }

    const displayMessage = () => {
        const msg = isSwap ? 'swappedProduct' : isAdd ? 'addedProduct' : 'editedProduct';
        showMessage({
            message: i18n.get(msg),
            type: "info",
            icon: { icon: "auto", position: "left" },
        });
    }

    const confirmProduct = async (navigate) => {
        if (validateProduct()) {
            firebase.firestore()
                .collection("kitchens")
                .doc(kitchenId)
                .get()
                .then((kitchen) => {
                    const kitchenData = kitchen.data();
                    const updatedKitchenData = updateProduct(kitchenData, instancesToAdd);
                    const productsList = updatedKitchenData.productsList;
                    const shoppingList = updatedKitchenData.shoppingList;

                    firebase.firestore().collection("kitchens")
                        .doc(kitchenId)
                        .update({
                            productsList,
                            shoppingList
                        })
                        .then(async (result) => {
                            storeProductIntoProducts(product, ean);
                            if (changedProductPrice) {
                                await savePrice(ean, kitchenId);
                            }
                            if (navigate) {
                                if (isSwap || isEdit) {
                                    props.navigation.replace('Main', { screen: confirmationScreen(), params: { kitchenId, filter } });
                                    if (isSwap) {
                                        await updateUserTutorial(KITCHEN_TUTORIAL, "10_REPLACE_WITH_SCAN");
                                    }
                                } else {
                                    checkForExpiringProductInKitchenAndSchedulePush(productsList, kitchenId);
                                    setScanned(false)
                                }
                                displayMessage();
                                await updateUserTutorial(KITCHEN_TUTORIAL, "02_SCAN_PRODUCT");
                            }
                        })
                })
        }
    }

    const getProductDataFromOneOfTheLists = (kitchenData, code) => {
        const listToConsider = getListToConsider();
        const otherList = getOtherList();
        if (kitchenData[listToConsider] && kitchenData[listToConsider].hasOwnProperty(code)) {
            return kitchenData[listToConsider][code];
        } else if (kitchenData[otherList] && kitchenData[otherList].hasOwnProperty(code)) {
            return kitchenData[otherList][code];
        } else return null;
    }

    const handleBarCodeScanned = async ({ type, data }) => {
        if (type == 'org.gs1.EAN-13' || type == 'org.gs1.EAN-8' || type === 32 || type === 64 || type === 512 || type === 1024) {
            setScanned(true);
            setType(type);
            setEan(data);

            //Before using openFood, check if object is already into kitchen!
            let product = undefined;
            let kitchenData = await getKitchenData(kitchenId);
            selectedProducts = productKey === data ? null : selectedProducts;

            const productFromList = getProductDataFromOneOfTheLists(kitchenData, data);

            if (productFromList) {
                product = productFromList;
            } else {
                //read it from products db
                const productFromDb = await getOpenFoodFromProducts(data);
                if (productFromDb) {
                    product = {
                        code: productFromDb?.code ? productFromDb.code : null,
                        brands: productFromDb?.brands ? productFromDb.brands : null,
                        productName: productFromDb.productName,
                        productFormat: productFromDb?.productFormat ? productFromDb.productFormat : null,
                        image: productFromDb?.image ? productFromDb.image : null,
                    }
                } else {
                    // call OpenFood
                    const openFoodResponse = await getFoodDataFromOpenFoodAPI(data);
                    const imageList = openFoodResponse && openFoodResponse?.status != 0 && openFoodResponse?.product?.selected_images?.front?.display ? openFoodResponse?.product?.selected_images?.front?.display : {};
                    const image = imageList.hasOwnProperty(currentUser.language) ? imageList[currentUser.language] : Object.values(imageList)[0];

                    product = {
                        code: openFoodResponse?.code ? openFoodResponse?.code : null,
                        brands: openFoodResponse?.product?.brands ? openFoodResponse?.product?.brands : null,
                        productName: openFoodResponse?.product?.product_name,
                        productFormat: openFoodResponse?.product?.quantity ? openFoodResponse?.product?.quantity : null,
                        image,
                        instances: [{
                            quantity: 1,
                            expirationDate: null,
                            statusExpirationDate: null,
                            status: instancesStatus,
                            id: generateRandomId(10)
                        }]
                    }

                    saveOpenFoodInProducts(product);
                }
            }
            product.image = uploadedUrl ? uploadedUrl : product.image;
            if (product.instances) {
                setInstancesToAdd(product.instances);
            }
            setProduct(product);
            setIsValid(true);
        }
    };

    if (hasPermission === null && !scanned) {
        return <EmptyLogoScreen />;
    }
    if (hasPermission === false && !scanned) {
        return <PermissionScreen />;
    }

    async function getFoodDataFromOpenFoodAPI(ean) {
        try {
            let response = await fetch(
                `https://world.openfoodfacts.org/api/v0/product/${ean}.json`,
            );
            let responseJson = await response.json();
            return responseJson;
        } catch (error) {
            console.error(error);
        }
    }

    if (!loaded)
        return (
            <SplashScreen />
        )
    else
        return (
            <View style={[theme.flex1, theme.container]}>
                <Header
                    containerStyle={{ borderBottomWidth: 0, marginLeft: moderateScale(5), marginRight: moderateScale(5) }}
                    backgroundColor={theme.container.backgroundColor}
                    leftComponent={
                        <Icon
                            size={moderateScale(30)}
                            name='md-arrow-back-circle-sharp'
                            type='ionicon'
                            color='#fff'
                            onPress={() => props.navigation.replace('Main', { screen: confirmationScreen(), params: { kitchenId, filter } })}
                            activeOpacity={0.7}
                        />
                    }
                    centerComponent={{ text: place, style: { color: '#fff', fontSize: moderateScale(20), fontWeight: 'bold' } }}
                />
                {
                    !scanned && <BarCodeScanner
                        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                        style={[theme.flex1]} >

                        <View style={theme.barCodeContainer}>
                            <View style={{ flex: 1, backgroundColor: 'rgba(1,1,1,0.6)' }}></View>
                            <View style={{
                                flex: 1,
                                borderColor: 'red',
                                borderWidth: moderateScale(2),
                                margin: moderateScale(5)
                            }}></View>
                            <View style={{ flex: 1, backgroundColor: 'rgba(1,1,1,0.6)' }}></View>
                        </View>
                    </BarCodeScanner>

                }
                {scanned &&
                    <KeyboardAvoidingView
                        style={[theme.flex1, theme.container]}
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                    >
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Card containerStyle={{
                                backgroundColor: theme.cardContainer.backgroundColor,
                                color: theme.whiteFont.color,
                                borderRadius: moderateScale(12),
                                borderWidth: 0
                            }}>
                                <View style={{
                                    alignItems: 'center'
                                }}>
                                    {!product?.image && <Avatar
                                        size={moderateScale(150)}
                                        icon={{ name: 'camera', type: 'font-awesome', color: 'white' }}
                                        source={{ uri: 'https://' }} //added to remove ReactImageView: Image source "null" doesn't exist
                                        onPress={() => openCameraToAdd(productKey, kitchenId)}
                                        activeOpacity={0.7}
                                        avatarStyle={{ borderWidth: 0 }}
                                        containerStyle={{
                                            backgroundColor: theme.button.backgroundColor,
                                            borderRadius: moderateScale(20)
                                        }}
                                    />}
                                    {product?.image && <Avatar
                                        size={moderateScale(150)}
                                        onPress={() => openCameraToAdd(productKey, kitchenId)}
                                        source={{ uri: product.image }}
                                        imageProps={{ resizeMode: 'contain' }}
                                        activeOpacity={0.7}
                                    />}
                                </View>
                                <View style={{
                                    flex: 1,
                                    marginTop: moderateVerticalScale(10)
                                }}>
                                    {isEan(product?.code) &&
                                        <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10) }]} h6>{i18n.t('productEan')}</Text>
                                    }
                                    {isEan(product?.code) &&
                                        <View style={{
                                            flexDirection: 'row', flex: 1
                                        }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[theme.inputBlack, { color: theme.inputPlaceholderColor.color }]}>
                                                    {product?.code}
                                                </Text>
                                            </View>
                                        </View>
                                    }

                                    <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10) }]} h6>{i18n.t('productBrand')}</Text>
                                    <TextInput
                                        placeholder={i18n.t('productBrand')}
                                        placeholderTextColor={theme.inputPlaceholderColor.color}
                                        autoCorrect={false}
                                        autoComplete="off"
                                        autoFocus={false}
                                        style={theme.inputBlack}
                                        value={product?.brands}
                                        onChangeText={(productBrands) =>
                                            changeProductBrands(productBrands)
                                        }
                                    />

                                    <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10) }]} h6>{i18n.t('productName')}</Text>
                                    <TextInput
                                        placeholder={i18n.t('productName')}
                                        placeholderTextColor={theme.inputPlaceholderColor.color}
                                        autoCorrect={false}
                                        autoComplete="off"
                                        autoFocus={false}
                                        style={theme.inputBlack}
                                        value={product?.productName}
                                        onChangeText={(productName) =>
                                            changeProductName(productName)
                                        }
                                        onBlur={() =>
                                            setFormError("")
                                        }
                                    />
                                    {formError.length > 0 &&
                                        <Text style={theme.errorMessage}>{formError}</Text>
                                    }

                                    <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10) }]} h6>{i18n.t('productFormat')}</Text>
                                    <TextInput
                                        placeholder={i18n.t('productFormat')}
                                        placeholderTextColor={theme.inputPlaceholderColor.color}
                                        autoCorrect={false}
                                        autoComplete="off"
                                        autoFocus={false}
                                        style={theme.inputBlack}
                                        value={product?.productFormat}
                                        onChangeText={(productFormat) =>
                                            changeProductFormat(productFormat)
                                        }
                                    />

                                    <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10) }]} h6>{i18n.t('productPrice')}</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        placeholder={i18n.t('productPrice')}
                                        placeholderTextColor={theme.inputPlaceholderColor.color}
                                        autoCorrect={false}
                                        autoComplete="off"
                                        autoFocus={false}
                                        style={theme.inputBlack}
                                        value={productPrice}
                                        onChangeText={(text) =>
                                            changeProductPrice(text)
                                        }
                                    />

                                    {isAdd && !isSwap && <View>
                                        <View style={{
                                            flex: 1, flexDirection: 'row', alignItems: 'center',
                                            marginTop: moderateVerticalScale(10),
                                            marginBottom: moderateVerticalScale(10)
                                        }}>
                                            <View style={[styles.leftText]}>
                                                <Text style={theme.whiteFont}>{i18n.t('addInstanceAndExpiration') + ':'}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginBottom: moderateVerticalScale(10) }}>
                                            <View style={{ flex: 1, margin: moderateVerticalScale(-10), alignItems: 'center' }}>
                                                <Button
                                                    onPress={() => setBackNullAsExpirationDate(product)}
                                                    icon={{
                                                        name: 'times-circle',
                                                        type: 'font-awesome-5',
                                                        color: 'white',
                                                        size: moderateScale(14),
                                                    }}
                                                    buttonStyle={{
                                                        backgroundColor: exampleExpirationDate ? theme.button.backgroundColor : theme.disabledButton.backgroundColor,
                                                        borderColor: 'transparent',
                                                        borderWidth: 0,
                                                        borderRadius: moderateScale(5),
                                                        padding: moderateVerticalScale(2),
                                                        margin: 0,
                                                        width: moderateScale(28),
                                                        height: moderateScale(26)
                                                    }}
                                                    type="solid"
                                                />
                                            </View>
                                            <View
                                                style={[{ flex: 2 }, theme.expirationDateUnselectedBox]}
                                            >
                                                <Text style={{ color: 'white' }}>{exampleExpirationDate ?
                                                    formatDateToLocale(new Date(exampleExpirationDate)) : getFormatFromLocale()}</Text>
                                            </View>
                                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                                                <Button
                                                    onPress={() => showBottomSheet(product)}
                                                    icon={{
                                                        name: 'calendar-day',
                                                        type: 'font-awesome-5',
                                                        color: 'white',
                                                        size: moderateScale(18),
                                                    }}
                                                    buttonStyle={{
                                                        backgroundColor: theme.button.backgroundColor,
                                                        borderColor: 'transparent',
                                                        borderWidth: 0,
                                                        borderRadius: moderateScale(5),
                                                        padding: moderateVerticalScale(2),
                                                        margin: 0,
                                                        width: moderateScale(28),
                                                        height: moderateScale(26)
                                                    }}
                                                    type="solid"
                                                />
                                                <Button
                                                    onPress={() => addInstance(product)}
                                                    icon={{
                                                        name: 'plus',
                                                        type: 'font-awesome',
                                                        size: moderateScale(18),
                                                        color: 'white'
                                                    }}
                                                    buttonStyle={{
                                                        backgroundColor: theme.button.backgroundColor,
                                                        borderColor: 'transparent',
                                                        borderWidth: 0,
                                                        borderRadius: moderateScale(5),
                                                        padding: 0,
                                                        margin: 0,
                                                        marginLeft: moderateScale(5),
                                                        width: moderateScale(28),
                                                        height: moderateScale(26)
                                                    }}
                                                    type="solid"
                                                />
                                            </View>
                                        </View>

                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginBottom: moderateVerticalScale(10) }}>
                                            <View style={[styles.leftText]}>
                                                <Text style={instancesStatus == 'open' ? theme.open : theme.frozen}>{i18n.t('productsStatusToAdd.' + instancesStatus) + ':'}</Text>
                                            </View>
                                        </View>
                                        {instancesToAdd && instancesToAdd.map((instance) => {
                                            const instanceExpirationDate = instance?.statusExpirationDate ? instance.statusExpirationDate : instance.expirationDate;
                                            const instanceKey = instance.id;
                                            return (
                                                <View key={instance.id} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginTop: moderateVerticalScale(5) }}>
                                                    <View style={{ flex: 1, margin: moderateVerticalScale(-10), alignItems: 'center' }}>
                                                        <Text style={{ color: 'white' }}>1 x</Text>
                                                    </View>
                                                    <View
                                                        style={[{ flex: 2 }, theme.expirationDateUnselectedBox]}
                                                    >
                                                        <Text style={{ color: 'white', fontWeight: '700' }}>{instanceExpirationDate ? formatDateToLocale(new Date(instanceExpirationDate)) : getFormatFromLocale()}</Text>
                                                    </View>
                                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                                                        <Button
                                                            onPress={() => showBottomSheetForInstance(instance.id)}
                                                            icon={{
                                                                name: 'calendar-day',
                                                                type: 'font-awesome-5',
                                                                color: 'white',
                                                                size: moderateScale(18),
                                                            }}
                                                            buttonStyle={{
                                                                backgroundColor: theme.button.backgroundColor,
                                                                borderColor: 'transparent',
                                                                borderWidth: 0,
                                                                borderRadius: moderateScale(5),
                                                                padding: moderateVerticalScale(2),
                                                                margin: 0,
                                                                width: moderateScale(28),
                                                                height: moderateScale(26)
                                                            }}
                                                            type="solid"
                                                        />
                                                        <Button
                                                            onPress={() => removeInstance(product, instanceKey)}
                                                            icon={{
                                                                name: 'trash',
                                                                type: 'font-awesome',
                                                                color: 'white',
                                                                size: moderateScale(21),
                                                            }}
                                                            buttonStyle={{
                                                                backgroundColor: 'red',
                                                                borderColor: 'transparent',
                                                                borderWidth: 0,
                                                                borderRadius: moderateScale(5),
                                                                padding: 0,
                                                                margin: 0,
                                                                marginLeft: moderateScale(5),
                                                                width: moderateScale(28),
                                                                height: moderateScale(26)
                                                            }}
                                                            type="solid"
                                                        />
                                                    </View>
                                                </View>)
                                        })}
                                    </View>}

                                    <TouchableOpacity
                                        onPress={() => confirmProduct(true)}
                                        style={isValid ?
                                            [theme.button, theme.bottomSheetConfirmContainer] :
                                            [theme.disabledButton, theme.bottomSheetConfirmContainer]}
                                    >
                                        <Text style={theme.buttonText}>{i18n.t('confirm')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        </ScrollView>
                    </KeyboardAvoidingView>}
                {
                    !isAndroid && <BottomSheet modalProps={{}}
                        onBackdropPress={() => hideBottomSheet()}
                        isVisible={bottomSheetVisible}
                    >
                        <View>
                            <Card containerStyle={{
                                marginTop: moderateScale(15),
                                backgroundColor: theme.bottomSheet.backgroundColor,
                                color: theme.whiteFont.color
                            }}>
                                <View style={theme.bottomSheetIconTextContainer}>
                                    <Icon
                                        name='calendar-range'
                                        type='material-community'
                                        color={theme.whiteFont.color}
                                        size={moderateScale(50)}
                                        iconStyle={{ padding: moderateScale(10) }}
                                        backgroundColor={theme.button.backgroundColor}
                                    />
                                    <View style={theme.bottomSheetTextContainer}>
                                        <Text style={theme.whiteTitle} h4>{product?.productName ? product.productName : i18n.t('productName')}</Text>
                                        <Text style={theme.whiteFont} h4>{i18n.t('expirationDateAskingTitle')}</Text>
                                    </View>
                                </View>
                                <Card.Divider />
                                <DateTimePicker locale={locale} display="spinner" value={expirationDate} onChange={changeExpirationDate} />
                                <TouchableOpacity
                                    style={[theme.button, theme.bottomSheetConfirmContainer]}
                                    onPress={() => confirmExpirationDate()}
                                >
                                    <Text style={theme.buttonText}>{i18n.t('confirm')}</Text>
                                </TouchableOpacity>
                            </Card>
                        </View>
                    </BottomSheet>}
                {
                    androidBottomSheetVisible &&
                    <DateTimePicker value={expirationDate} onChange={changeExpirationDate} />
                }
            </View >
        );


}

const mapStateToProps = (store) => ({
    currentUser: store.userState.currentUser
})

const mapDispatchProps = (dispatch) => bindActionCreators({ reload }, dispatch);

export default connect(mapStateToProps, null)(ScanProductScreen);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#0782F9',
        width: '80%',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 40,
    },
    buttonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    }
})