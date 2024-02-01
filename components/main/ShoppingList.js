import DateTimePicker from '@react-native-community/datetimepicker';
import intervalToDuration from 'date-fns/intervalToDuration';
import dateFormat from "dateformat";
import * as Haptics from 'expo-haptics';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import React, { useEffect, useState } from 'react';
import { Image, Keyboard, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar, Badge, BottomSheet, Button, Card, CheckBox, Icon, ListItem, Text } from 'react-native-elements';
import { showMessage } from "react-native-flash-message";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScaledSheet, moderateScale, moderateVerticalScale } from 'react-native-size-matters';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { theme } from '../../css/theme';
import { getI18n } from '../../i18n/translationService';
import { generateRandomId } from '../../utils/utilsService';
import SplashScreen from '../common/Splash';
import { sortMapByExpirationDate, sortProductInstances } from '../service/orderingService';
import { groupAllProductByCodeAndStatus } from '../service/filteringService';
require("firebase/compat/firestore");
require("firebase/compat/storage");

function ShoppingListScreen(props, { navigation }) {

    const insets = useSafeAreaInsets();
    const isAndroid = Platform.OS === 'android' ? true : false;
    const shoppingListFilterList = ["toBuy", "inTheCart"];
    const paramsFilter = props?.filter ? shoppingListFilterList.includes(props.filter) ? props.filter : 'toBuy' : 'toBuy';

    const [pageIsReady, setPageIsReady] = useState(false);
    const [kitchenProducts, setKitchenProducts] = useState(null);
    const [shoppingListByEndpoint, setShoppingListByEndpoint] = useState(null);
    const [search, setSearch] = useState(null);
    const [addClicked, setAddClicked] = useState(false);
    const [filter, setFilter] = useState(paramsFilter);
    const [productName, setProductName] = useState(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const [expandedKey, setExpandedKey] = useState(null);
    const [expandedArray, setExpandedArray] = useState([]);
    const [instanceKey, setInstanceKey] = useState(null);

    const [productUniqueKey, setProductUniqueKey] = useState(null);

    const [productObjForExpirationDate, setProductObjForExpirationDate] = useState(null);
    const [productForExpirationDate, setProductForExpirationDate] = useState(null);
    const [instanceForExpirationDate, setInstanceForExpirationDate] = useState(null);
    const [productExpirations, setProductExpirations] = useState({});

    const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
    const [androidBottomSheetVisible, setAndroidBottomSheetVisible] = useState(false);
    const [expirationDate, setExpirationDate] = useState(null);


    const [selectedProducts, setSelectedProducts] = useState({});
    const [openFeature, setOpenFeature] = useState(false);
    const [openModalFeature, setOpenModalFeature] = useState(false);
    const [flagProductExpired, setFlagProductExpired] = useState(false);
    const [moveAllToKitchen, setMoveAllToKitchen] = useState(false);

    const [action, setAction] = useState(null);
    const [place, setPlace] = useState('');

    const [shoppingListPrice, setShoppingListPrice] = useState(null);

    const [additionalFeature, setAdditionalFeature] = useState(false);
    const [putInKitchen, setPutInKitchen] = useState(false);

    const locale = props.currentUser?.language ? props.currentUser?.language : 'en-US';
    const i18n = props.currentUser?.language ? getI18n(props.currentUser.language) : getI18n();

    let kitchenId = null;
    let keyboardDidShowListener = null;
    let keyboardDidHideListener = null;
    const currentUser = props.currentUser;
    const subPlace = i18n.get('shoppingList');
    let inputRef = null;

    if (props.route?.params?.kitchenId) {
        kitchenId = props.route.params.kitchenId;
    } else if (props?.kitchenId) {
        kitchenId = props.kitchenId;
    } else {
        //Do I have at least 1 kitchen?
        if (props.currentUser.kitchens.length > 0) {
            kitchenId = props.currentUser.kitchens[0].UIDKitchen;
        }
    }

    useEffect(() => {

        keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', keyboardDidShow);
        keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', keyboardDidHide);

        if (kitchenId) {
            firebase.firestore()
                .collection("kitchens")
                .doc(kitchenId)
                .get()
                .then((kitchen) => {
                    const allProductsFromEndpoint = allProductsFromKitchenData(kitchen.data());
                    setShoppingListByEndpoint(allProductsFromEndpoint);
                    organizeShoppingListData(allProductsFromEndpoint, filter, search);
                    setPageIsReady(true);
                })
        } else props.navigation.replace("AddKitchen");
    }, []);

    const keyboardDidShow = (e) => {
        if (Platform.OS === 'ios') {
            setKeyboardHeight(e.endCoordinates.height);
        }
    }

    const keyboardDidHide = () => {
        if (Platform.OS === 'ios') {
            setKeyboardHeight(0);
        }
    }

    const hideOpenFeature = () => {
        setSelectedProducts({});
        setOpenFeature(false);
    }

    const hideOpenModalFeature = () => {
        setSelectedProducts({});
        setOpenModalFeature(false);
    }

    const hideAdditionalFeature = () => {
        setAdditionalFeature(false);
    }

    const showAdditionalFeature = () => {
        setAdditionalFeature(true);
    }

    const isOneInstanceExpired = (selectedProducts) => {
        let isProductExpired = false;
        let filteredInstances = [];
        Object.keys(selectedProducts).forEach(productKey => {
            const selectedInstances = selectedProducts[productKey].instances;
            const product = kitchenProducts.find(kProduct => kProduct?.productUniqueKey === productKey);
            filteredInstances.push(...product.instances.filter(instance => selectedInstances.includes(instance.id)));
        });
        filteredInstances
            .forEach((filteredInstance) => {
                if (!isProductExpired) {
                    const instanceExpirationDate = filteredInstance?.statusExpirationDate ? filteredInstance.statusExpirationDate : filteredInstance.expirationDate;
                    if (instanceExpirationDate) {
                        isProductExpired = new Date().getTime() - instanceExpirationDate > 0 ? true : false;
                    }
                }
            })
        return isProductExpired;
    }

    const showOpenFeature = (action) => {
        setFlagProductExpired(isOneInstanceExpired(selectedProducts));
        setAction(action);
        if (action === 'confirmPurchase') {
            setMoveAllToKitchen(false);
            setOpenModalFeature(true);
        } else {
            setOpenFeature(true);
        }
        setPutInKitchen(false);
    }

    const selectAllProducts = (kitchenProducts) => {
        const updatedSelectedProducts = {}
        for (let key in kitchenProducts) {
            const product = kitchenProducts[key];
            const instancesInProduct = product.instances
                .filter(instance => instance.status === 'inTheCart')
                .map((item) => {
                    return item.id;
                });
            updatedSelectedProducts[product.productUniqueKey] = {};
            updatedSelectedProducts[product.productUniqueKey].instances = instancesInProduct;
            updatedSelectedProducts[product.productUniqueKey].code = product.code;
            updatedSelectedProducts[product.productUniqueKey].status = product.status;
        }
        setSelectedProducts(updatedSelectedProducts);
    }

    const confirmPurchase = () => {
        if (kitchenProducts && kitchenProducts.length > 0) {
            selectAllProducts(kitchenProducts);
            setAction('confirmPurchase');
            setShoppingListPrice(null);
            setOpenModalFeature(true);
            setPutInKitchen(true);
        }
    }

    const additionalMenuList = [
        {
            action: 'inTheCart',
            title: i18n.get('actions.inTheCart'),
            icon: 'cart-arrow-down',
            type: 'font-awesome-5',
            color: theme.inTheCart.backgroundColor,
            iconColor: theme.inTheCart.color,
            actionText: i18n.t('inTheCartProduct'),
            showOnAdditionalMenu: true,
            func: () => {
                hideAdditionalFeature()
                showOpenFeature('inTheCart')
            }
        },
        {
            action: 'toBuy',
            title: i18n.get('actions.toBuy'),
            icon: 'list-alt',
            type: 'font-awesome-5',
            color: theme.toBuy.backgroundColor,
            actionText: i18n.t('toBuyProduct'),
            showOnAdditionalMenu: true,
            func: () => {
                hideAdditionalFeature()
                showOpenFeature('toBuy')
            }
        },
        {
            action: 'swap',
            title: i18n.get('actions.swap'),
            icon: 'barcode-scan',
            type: 'material-community',
            color: theme.button.backgroundColor,
            actionText: i18n.t('swapProduct'),
            showOnAdditionalMenu: true,
            func: () => {
                hideAdditionalFeature()
                showOpenFeature('swap')
            }
        },
        {
            action: 'confirmPurchase',
            title: i18n.get('actions.confirmPurchase'),
            icon: 'file-invoice-dollar',
            type: 'font-awesome-5',
            color: theme.confirmButton.backgroundColor,
            actionText: i18n.t('confirmPurchase'),
            showOnAdditionalMenu: false,
        }
    ];

    const hideBottomSheet = () => {
        setBottomSheetVisible(false);
    }

    const showBottomSheet = (product) => {
        setProductForExpirationDate(product.productUniqueKey);
        setProductObjForExpirationDate(product);
        setExpirationDate(new Date());
        if (isAndroid) {
            setAndroidBottomSheetVisible(true)
        } else {
            setBottomSheetVisible(true)
        }
    }

    const showBottomSheetForInstance = (product, instanceKey) => {
        setProductForExpirationDate(product.productUniqueKey);
        setProductObjForExpirationDate(product);
        setInstanceForExpirationDate(instanceKey);
        const dateToSet = product.statusExpirationDate ? new Date(product.statusExpirationDate) : new Date();
        setExpirationDate(dateToSet);
        if (isAndroid) {
            setAndroidBottomSheetVisible(true)
        } else {
            setBottomSheetVisible(true)
        }
    }

    const hideAndroidBottomSheet = () => {
        setAndroidBottomSheetVisible(false);
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
            setInstanceExpirationDate(instanceForExpirationDate, productObjForExpirationDate, updatedDate);
        } else {
            productExpirations[productForExpirationDate] = updatedDate;
        }
        setProductExpirations(productExpirations);
        setProductForExpirationDate(null);
        setProductObjForExpirationDate(null);
        setInstanceForExpirationDate(null);
        showMessage({
            message: i18n.get('changedExpirationDate'),
            type: "success",
            icon: { icon: "success", position: "left" },
        });
        hideBottomSheet();
    }


    const showProductExpiredText = (flagProductExpired, action) => {
        if (action === 'consume' || action === 'waste') {
            return false;
        } else return flagProductExpired;
    }

    const confirmOpenFeature = () => {
        if (action === 'swap') {
            hideOpenFeature();
            props.navigation.navigate("ScanProduct", {
                kitchenId,
                instancesStatus: filter,
                filter,
                selectedProducts
            })
        } else {
            updateProducts();
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

    const moveInstancesFromSelectedProduct = (fromList, toList, product) => {
        const selectedProduct = fromList[product.code];
        let destinationProduct = toList[product.code];
        if (selectedProduct) {
            destinationProduct = destinationProduct ? destinationProduct : {};
            destinationProduct.code = selectedProduct?.code ? selectedProduct.code : null;
            destinationProduct.productName = selectedProduct.productName;
            destinationProduct.image = selectedProduct?.image ? selectedProduct.image : null;
            destinationProduct.productFormat = selectedProduct?.productFormat ? selectedProduct.productFormat : null;
            destinationProduct.creationDate = new Date().getTime();
            destinationProduct.importedBy = firebase.auth().currentUser.uid;
            product.instances.forEach(item => {
                const instance = selectedProduct.instances.find(instance => instance.id === item);
                destinationProduct.instances = destinationProduct?.instances ? destinationProduct.instances : [];
                destinationProduct.instances.push({
                    quantity: 1,
                    expirationDate: instance.expirationDate,
                    statusExpirationDate: instance.statusExpirationDate,
                    status: 'closed',
                    id: instance.id
                })
            });
            toList[product.code] = destinationProduct;
        }
    }

    const saveShopping = async (selectedProducts, kitchenId, shoppingList) => {

        await firebase.firestore()
            .collection("shoppingInstances")
            .doc(kitchenId)
            .get()
            .then(async (shoppingInstances) => {
                let products = {};
                Object.keys(selectedProducts).forEach(key => {
                    const productKey = selectedProducts[key].code;
                    const singleProduct = Object.assign(shoppingList[productKey], {});
                    singleProduct.instances = singleProduct.instances.filter(item => item.status === 'inTheCart');
                    products[productKey] = singleProduct;
                })
                const shoppingInstancesLogs = shoppingInstances.data() ? shoppingInstances.data() : {};
                const currentTimestamp = new Date().getTime();

                shoppingInstancesLogs[currentTimestamp] = {
                    price: shoppingListPrice ? parseFloat(shoppingListPrice) : shoppingListPrice,
                    creator: firebase.auth().currentUser.uid,
                    currency: 'EUR',
                    kitchenId,
                    location: {},
                    creationDate: currentTimestamp,
                    products
                }

                await firebase.firestore()
                    .collection("shoppingInstances")
                    .doc(kitchenId)
                    .set(shoppingInstancesLogs)
            });
    }

    const updateProducts = async () => {

        await firebase.firestore()
            .collection("kitchens")
            .doc(kitchenId)
            .get()
            .then(async (kitchen) => {
                const kitchenData = kitchen.data();
                let shoppingList = kitchenData.shoppingList;
                let productsList = kitchenData.productsList;

                if (action === "confirmPurchase") {
                    await saveShopping(selectedProducts, kitchenId, shoppingList);
                }

                for (let key in selectedProducts) {
                    const selectedProductToUpdate = selectedProducts[key];
                    const code = selectedProductToUpdate.code;
                    const productToUpdate = shoppingList[code];

                    if (action === "confirmPurchase") {
                        if (moveAllToKitchen) {
                            moveInstancesFromSelectedProduct(shoppingList, productsList, selectedProductToUpdate, productToUpdate);
                        }
                        removeInstancesFromSelectedProduct(shoppingList, selectedProductToUpdate);
                    } else {
                        selectedProductToUpdate.instances.forEach(selectedInstance => {
                            let instance = productToUpdate.instances.find(instanceToUpdate => instanceToUpdate.id === selectedInstance);
                            instance.status = action;
                        })
                    }
                    if (productToUpdate.instances.length === 0) {
                        delete shoppingList[productToUpdate.code];
                    }
                }
                displayMessage();
                saveAndReload(productsList, shoppingList);
            })
    }

    const displayMessage = () => {
        showMessage({
            message: i18n.get('actionWithSuccessList.' + action),
            type: "success",
            icon: { icon: "success", position: "left" },
        });
    }

    const unselect = () => {
        setSelectedProducts({});
        hideOpenFeature();
        hideOpenModalFeature();
    }

    const changeInstanceKey = (passedInstanceKey, passedProduct) => {
        if (instanceKey === passedInstanceKey) {
            setInstanceKey(null)
        } else {
            setInstanceKey(passedInstanceKey)
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        changeChecked(selectedProducts, passedProduct, passedInstanceKey);
    }

    const changeChecked = (selectedProducts, passedProduct, passedInstance) => {
        const productPresent = selectedProducts[passedProduct.productUniqueKey];
        if (productPresent) {
            if (productPresent.instances.includes(passedInstance)) {
                const filteredArray = productPresent.instances.filter(i => i != passedInstance);
                selectedProducts[passedProduct.productUniqueKey].instances = filteredArray;
                if (selectedProducts[passedProduct.productUniqueKey].instances.length === 0) {
                    delete selectedProducts[passedProduct.productUniqueKey];
                }
            } else {
                selectedProducts[passedProduct.productUniqueKey].instances.push(passedInstance);
            }
        } else {
            selectedProducts[passedProduct.productUniqueKey] = {};
            selectedProducts[passedProduct.productUniqueKey].instances = [passedInstance];
            selectedProducts[passedProduct.productUniqueKey].code = passedProduct.code;
            selectedProducts[passedProduct.productUniqueKey].status = passedProduct.status;
        }
        setSelectedProducts(selectedProducts)
    }

    const expandKey = (productUniqueKey, product) => {
        let updatedExpandedArray = expandedArray;
        if (expandedArray.includes(productUniqueKey)) {
            setExpandedKey(null);
            updatedExpandedArray = expandedArray.filter(i => i != productUniqueKey);
        } else {
            setExpandedKey(productUniqueKey);
            updatedExpandedArray.push(productUniqueKey);
        }
        setExpandedArray(updatedExpandedArray);
    }

    const allProductsFromKitchenData = (kitchenData) => {
        setPlace(kitchenData.name);
        const allProducts = [];

        for (let product in kitchenData.shoppingList) {
            for (let instance in kitchenData.shoppingList[product].instances) {
                const singleProduct = kitchenData.shoppingList[product].instances[instance];
                singleProduct.code = product;
                singleProduct.productName = kitchenData.shoppingList[product].productName;
                singleProduct.image = kitchenData.shoppingList[product].image;
                singleProduct.productType = kitchenData.shoppingList[product].productType;
                allProducts.push(singleProduct);
            }
        }
        return allProducts;
    }

    const filterByStatus = (products, filter) => {
        return products.filter(product => product.status == filter);
    }

    const filterByProductName = (products, search) => {
        setExpandedKey(null)
        const internalSearch = search ? search.toLowerCase() : search;
        let filteredProducts = products;
        if (internalSearch) {
            filteredProducts = products.filter(product => {
                return product.productName.toLowerCase().includes(internalSearch)
            });
        }
        return filteredProducts;
    }

    const organizeShoppingListData = (allProductsFromEndpoint, filter, search) => {
        const allProducts = allProductsFromEndpoint;
        const filteredProductsByStatus = filterByStatus(allProducts, filter);
        const filteredProductsByProductName = filterByProductName(filteredProductsByStatus, search);
        let allGroupedProducts = groupAllProductByCodeAndStatus(filteredProductsByProductName);
        setKitchenProducts(sortMapByExpirationDate(allGroupedProducts));
    }

    const changeSearch = (search) => {
        setSearch(search);
        organizeShoppingListData(shoppingListByEndpoint, filter, search);
    }

    const changeFilter = (filter) => {
        setFilter(filter);
        organizeShoppingListData(shoppingListByEndpoint, filter, search);
        unselect();
    }

    const getExpirationDateWarning = (productExpirationDate) => {
        const now = new Date().getTime();
        const isAlreadyExpired = now - productExpirationDate > 0 ? true : false;
        const duration = intervalToDuration({ start: now, end: productExpirationDate });
        const expirationSeverity = isAlreadyExpired ? true : duration.days < 3 && duration.years === 0 && duration.months === 0 && duration.years === 0;
        let interval = 'hours';
        if (duration.years > 0) {
            interval = 'years'
        } else if (duration.months > 0) {
            interval = 'months'
        } else if (duration.days > 0) {
            interval = 'days'
        }
        duration.expirationSeverity = expirationSeverity;
        duration.isAlreadyExpired = isAlreadyExpired;
        duration.label = isAlreadyExpired ? i18n.get('expired') : i18n.get('expiresIn') + " " + duration[interval] + "+ " + i18n.get(interval);
        return duration;
    }

    const reloadAfterSaving = (kitchenProducts) => {
        firebase.firestore()
            .collection("kitchens")
            .doc(kitchenId)
            .get()
            .then((kitchen) => {
                const allProductsFromEndpoint = allProductsFromKitchenData(kitchen.data());
                setShoppingListByEndpoint(allProductsFromEndpoint);
                if (kitchenProducts) {
                    setKitchenProducts(kitchenProducts)
                } else {
                    organizeShoppingListData(allProductsFromEndpoint, filter, search);
                }
                setAddClicked(false);
                setProductName(null);
                unselect();
            })
    }

    const saveAndReload = (productsList, shoppingList, kitchenProducts) => {
        firebase.firestore().collection("kitchens")
            .doc(kitchenId)
            .update({
                productsList,
                shoppingList
            })
            .then((result) => {
                if (kitchenProducts) {
                    reloadAfterSaving(kitchenProducts);
                } else {
                    reloadAfterSaving();
                }
            })
    }

    const setBackNullAsExpirationDate = (product) => {
        setProductForExpirationDate(product.productUniqueKey);
        setProductObjForExpirationDate(product);
        setExpirationDate(null);
        delete productExpirations[product.productUniqueKey];
    }

    const addInstance = (product) => {
        const updatedDate = productExpirations[product.productUniqueKey] ?
            productExpirations[product.productUniqueKey].setUTCHours(23, 59, 59, 999) : null;

        firebase.firestore()
            .collection("kitchens")
            .doc(kitchenId)
            .get()
            .then((kitchen) => {
                const kitchenData = kitchen.data();
                let productsList = kitchenData.productsList;
                let shoppingList = kitchenData.shoppingList;

                const productToUpdate = shoppingList[product.code];
                const generatedId = generateRandomId(10);
                const newInstance = {
                    quantity: 1,
                    expirationDate: updatedDate,
                    statusExpirationDate: updatedDate,
                    status: product.status,
                    id: generatedId
                };
                productToUpdate.instances.push(newInstance);
                reflectChangesAddInstance(kitchenProducts, newInstance, product);
                showMessage({
                    message: i18n.get('addedInstance'),
                    type: "success",
                    icon: { icon: "success", position: "left" },
                });
                saveAndReload(productsList, shoppingList, kitchenProducts);
            })
    }

    const setLowestExpirationDate = (kitchenProducts, index) => {
        let lowestExpirationDate = null;
        kitchenProducts[index].instances.forEach(instance => {
            const iExpDate = instance.statusExpirationDate ? instance.statusExpirationDate : instance.expirationDate;
            if (lowestExpirationDate && iExpDate) {
                lowestExpirationDate = iExpDate < lowestExpirationDate ? iExpDate : lowestExpirationDate;
            } else {
                if (!lowestExpirationDate) {
                    lowestExpirationDate = iExpDate;
                }
            }
        })
        kitchenProducts[index].statusExpirationDate = lowestExpirationDate;
        kitchenProducts[index].expirationDate = lowestExpirationDate;
    }

    const reflectChangesRemoveInstance = (kitchenProducts, instanceKey, product) => {
        const index = kitchenProducts.findIndex(item => item?.code === product.code && item.status === product.status);
        const instanceIndex = kitchenProducts[index].instances.findIndex(instanceToRemove => instanceToRemove.id === instanceKey);
        kitchenProducts[index].instances.splice(instanceIndex, 1);

        if (kitchenProducts[index].instances.length === 0) {
            delete kitchenProducts[index];
        } else {
            setLowestExpirationDate(kitchenProducts, index);
        }
        sortProductInstances(kitchenProducts[index]);
        setKitchenProducts(kitchenProducts);
    }

    const reflectChangesSetInstanceExpirationDate = (kitchenProducts, product, instanceKey, updatedDate) => {
        const index = kitchenProducts.findIndex(item => item.code === product.code && item.status === product.status);
        const instanceIndex = kitchenProducts[index].instances.findIndex(instanceToRemove => instanceToRemove.id === instanceKey);
        kitchenProducts[index].instances[instanceIndex].statusExpirationDate = updatedDate;
        kitchenProducts[index].instances[instanceIndex].expirationDate = updatedDate;
        setLowestExpirationDate(kitchenProducts, index);
        sortProductInstances(kitchenProducts[index]);
        setKitchenProducts(kitchenProducts);
    }

    const reflectChangesAddInstance = (kitchenProducts, newInstance, product) => {
        const index = kitchenProducts.findIndex(item => item.code === product.code && item.status === product.status);
        kitchenProducts[index].instances.push({
            expirationDate: newInstance.expirationDate,
            statusExpirationDate: newInstance.statusExpirationDate,
            status: newInstance.status,
            id: newInstance.id
        })
        setLowestExpirationDate(kitchenProducts, index);
        sortProductInstances(kitchenProducts[index]);
        setKitchenProducts(kitchenProducts)
    }

    const getFormatFromLocale = () => {
        return formatDateToLocale(new Date()).replace(/[0-9]/g, '-');
    }

    const formatDateToLocale = (date) => {
        return dateFormat(date, i18n.get('dateFormat'));
    }

    const addManualProduct = () => {

        const randomIdEAN = generateRandomId(13);
        if (productName) {
            const newProduct = {
                code: randomIdEAN,
                brands: null,
                productName,
                image: null,
                productQuantity: null,
                instances: [{
                    quantity: 1,
                    expirationDate: null,
                    statusExpirationDate: null,
                    status: filter,
                    id: generateRandomId(10)
                }],
                creationDate: new Date().getTime(),
                importedBy: firebase.auth().currentUser.uid
            }

            firebase.firestore()
                .collection("kitchens")
                .doc(kitchenId)
                .get()
                .then((kitchen) => {
                    const kitchenData = kitchen.data();
                    let productsList = kitchenData.productsList;
                    let shoppingList = kitchenData.shoppingList;

                    shoppingList[randomIdEAN] = newProduct;
                    showMessage({
                        message: i18n.get('addedProduct'),
                        type: "success",
                        icon: { icon: "success", position: "left" },
                    });
                    saveAndReload(productsList, shoppingList);
                })
        } else {
            setAddClicked(false);
        }
    }

    const setInstanceExpirationDate = (instanceKey, product, passedDate) => {
        const updatedDate = passedDate ? passedDate.setUTCHours(23, 59, 59, 999) : null;
        firebase.firestore()
            .collection("kitchens")
            .doc(kitchenId)
            .get()
            .then((kitchen) => {
                const kitchenData = kitchen.data();
                let productsList = kitchenData.productsList;
                let shoppingList = kitchenData.shoppingList;

                const productToUpdate = shoppingList[product.code];
                let index = productToUpdate.instances.findIndex(instanceToUpdate => instanceToUpdate.id === instanceKey);
                productToUpdate.instances[index].statusExpirationDate = updatedDate;
                productToUpdate.instances[index].expirationDate = updatedDate;

                reflectChangesSetInstanceExpirationDate(kitchenProducts, product, instanceKey, updatedDate);
                saveAndReload(productsList, shoppingList, kitchenProducts);
            });
    }

    const getProductStatusBackgroungColor = (productStatus) => {
        switch (productStatus) {
            case 'toBuy':
                return theme.toBuy.backgroundColor
            case 'inTheCart':
                return theme.inTheCart.backgroundColor
        }
    };

    const getProductStatusFontColor = (productStatus) => {
        switch (productStatus) {
            case 'toBuy':
                return theme.open.color
            case 'inTheCart':
                return theme.frozen.color
            default:
                return theme.whiteFont.color
        }
    };

    const removeInstance = (instanceKey, product) => {
        firebase.firestore()
            .collection("kitchens")
            .doc(kitchenId)
            .get()
            .then((kitchen) => {
                const kitchenData = kitchen.data();
                let productsList = kitchenData.productsList;
                let shoppingList = kitchenData.shoppingList;

                const productToUpdate = shoppingList[product.code];
                let index = productToUpdate.instances.findIndex(instanceToUpdate => instanceToUpdate.id === instanceKey);
                productToUpdate.instances.splice(index, 1);

                if (productToUpdate.instances.length === 0) {
                    delete productsList[product.code];
                    showMessage({
                        message: i18n.get('removedProduct'),
                        type: "success",
                        icon: { icon: "success", position: "left" },
                    });
                } else {
                    showMessage({
                        message: i18n.get('removedInstance'),
                        type: "success",
                        icon: { icon: "success", position: "left" },
                    });
                }

                reflectChangesRemoveInstance(kitchenProducts, instanceKey, product);
                saveAndReload(productsList, shoppingList, kitchenProducts);
            });
    }

    const changeSelectedProduct = (product) => {
        const productInMap = selectedProducts[product.productUniqueKey];
        if (productInMap) {
            delete selectedProducts[product.productUniqueKey];
        } else {
            const instancesInProduct = product.instances.map((item) => {
                return item.id;
            });
            selectedProducts[product.productUniqueKey] = {};
            selectedProducts[product.productUniqueKey].instances = instancesInProduct;
            selectedProducts[product.productUniqueKey].code = product.code;
            selectedProducts[product.productUniqueKey].status = product.status;
        }
        setSelectedProducts(selectedProducts)
    }

    const selectProduct = (product) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const passedProductUniqueKey = product.productUniqueKey;
        if (productUniqueKey === passedProductUniqueKey) {
            setProductUniqueKey(null)
        } else {
            setProductUniqueKey(passedProductUniqueKey)
        }
        changeSelectedProduct(product);
    }

    const changeShoppingListPrice = (text) => {
        const shoppingListPrice = text.replace(/[^\d.]|\.(?=.*\.)/g, '');
        setShoppingListPrice(shoppingListPrice);
    }

    const modalContent = () => {
        return (<Card containerStyle={{
            marginTop: moderateScale(15),
            backgroundColor: theme.bottomSheet.backgroundColor,
            color: theme.whiteFont.color
        }}>
            <View style={theme.bottomSheetIconTextContainer}>
                <Icon
                    name={additionalMenuList.find(item => item.action === action) ? additionalMenuList.find(item => item.action === action).icon : ''}
                    type={additionalMenuList.find(item => item.action === action) ? additionalMenuList.find(item => item.action === action).type : ''}
                    backgroundColor={additionalMenuList.find(item => item.action === action) ? additionalMenuList.find(item => item.action === action).color : ''}
                    size={moderateScale(50)}
                    iconStyle={{ padding: moderateScale(10) }}
                    color={additionalMenuList.find(item => item.action === action) ? additionalMenuList.find(item => item.action === action)?.iconColor : theme.whiteFont.color}
                    borderRadius={moderateScale(12)}
                />
                <View style={{ marginLeft: moderateScale(10) }}>
                    <Text style={[theme.whiteFont, {
                        backgroundColor: additionalMenuList.find(item => item.action === action) ? additionalMenuList.find(item => item.action === action).color : '',
                        color: 'black',
                        fontWeight: '700',
                        paddingLeft: moderateScale(5),
                        paddingRight: moderateScale(5),
                        marginTop: moderateVerticalScale(3)
                    }]} h5>
                        {additionalMenuList.find(item => item.action === action) ? additionalMenuList.find(item => item.action === action).actionText : ''}
                    </Text>
                </View>
            </View>
            <Card.Divider color={theme.whiteFont.color} style={[{ marginTop: moderateVerticalScale(3) }]} />
            {flagProductExpired && showProductExpiredText(flagProductExpired, action) &&
                <Text style={{
                    marginBottom: moderateVerticalScale(5),
                    color: 'white',
                    backgroundColor: 'red',
                    fontWeight: '700'
                }} h5>
                    {i18n.get('openFeatureExpiredText')}
                </Text>
            }

            <View>
                <Text style={theme.whiteFont} h5>{i18n.get(`featureDescription.${action}`)}</Text>
                <View
                    style={{
                        marginBottom: moderateVerticalScale(5),
                        marginTop: moderateVerticalScale(5)
                    }}
                >

                </View>
                {action === 'confirmPurchase' &&


                    <View
                        style={{
                            marginBottom: moderateVerticalScale(5),
                            marginTop: moderateVerticalScale(5)
                        }}
                    >
                        <CheckBox
                            center
                            containerStyle={{
                                padding: 0,
                                backgroundColor: theme.bottomSheet.backgroundColor,
                            }}
                            textStyle={{
                                color: theme.whiteFont.color
                            }}
                            checked={moveAllToKitchen}
                            checkedColor={theme.whiteFont.color}
                            onPress={() => setMoveAllToKitchen(!moveAllToKitchen)}
                            title={i18n.get('openFeatureMoveAllToKitchen')}
                        />
                        <Text style={theme.whiteFont} h5>{i18n.get(`shoppingListPriceLabel`)}</Text>
                        <TextInput
                            keyboardType="numeric"
                            placeholder={i18n.t('shoppingListPrice')}
                            placeholderTextColor={theme.inputPlaceholderColor.color}
                            ref={ref => {
                                inputRef = ref
                            }}
                            autoCorrect={false}
                            autoComplete="off"
                            autoFocus
                            style={theme.inputBlack}
                            value={shoppingListPrice}
                            onChangeText={(text) =>
                                changeShoppingListPrice(text)
                            }
                        />
                    </View>
                }
            </View>

            <TouchableOpacity
                style={[theme.button, theme.bottomSheetConfirmContainer]}
                onPress={() => confirmOpenFeature()}
            >
                <Text style={theme.buttonText}>{i18n.t('confirm')}</Text>
            </TouchableOpacity>
        </Card>)
    }

    if (!kitchenId || !pageIsReady)
        return (
            <SplashScreen />
        )
    else
        return (
            <View style={[theme.flex1, theme.container]}>
                <View style={{
                    flex: 1,
                    marginTop: insets.top,
                    marginBottom: 0,
                    marginLeft: insets.left,
                    marginRight: insets.right
                }}>
                    <View style={[{
                        flexDirection: 'row',
                        alignItems: 'center',
                        height: moderateScale(60)
                    },
                    selectedProducts && Object.keys(selectedProducts).length === 0 ? {
                        backgroundColor: theme.container.backgroundColor
                    } : {
                        backgroundColor: theme.expirationDateSelectedBox.backgroundColor
                    }
                    ]}>
                        <TouchableOpacity style={[theme.flex1, { alignItems: 'flex-start', marginLeft: moderateScale(10) }]}>
                            {selectedProducts && Object.keys(selectedProducts).length === 0 ?
                                <Icon
                                    size={moderateScale(30)}
                                    name='bell'
                                    type='material-community'
                                    color='#fff'
                                    //onPress={() => navigation.replace("Notification")}
                                    activeOpacity={0.7}
                                    imageProps={{ transition: false }}
                                />
                                : <TouchableOpacity
                                    onPress={() => {
                                        setSelectedProducts({})
                                    }}
                                ><Icon
                                        size={moderateScale(30)}
                                        name='md-arrow-back-circle-sharp'
                                        type='ionicon'
                                        color='#fff'
                                        activeOpacity={0.7}
                                    />
                                </TouchableOpacity>
                            }
                        </TouchableOpacity>
                        <View style={{ flex: 3, alignItems: 'center' }}>
                            {selectedProducts && Object.keys(selectedProducts).length === 0 ?
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={[theme.whiteFont, { fontWeight: '700' }]} h4>{place}</Text>
                                    <Text style={theme.whiteFont} h6>{subPlace}</Text>
                                </View> : <View></View>
                            }
                        </View>
                        <TouchableOpacity style={[theme.flex1, { alignItems: 'flex-end', marginRight: moderateScale(10) }]}>
                            {
                                selectedProducts && Object.keys(selectedProducts).length === 0 ?
                                    <TouchableOpacity
                                        onPress={() => props.navigation.navigate("User")}
                                    >
                                        {currentUser?.profileImageUrl ?
                                            <Avatar
                                                size={moderateScale(30)}
                                                rounded
                                                imageProps={{ transition: false }}
                                                source={{ uri: currentUser.profileImageUrl }}
                                                activeOpacity={0.7} /> :
                                            <Avatar
                                                size={moderateScale(30)}
                                                rounded
                                                source={{ uri: 'https://' }} //added to remove ReactImageView: Image source "null" doesn't exist
                                                icon={{ name: 'user', type: 'font-awesome', color: theme.container.backgroundColor }}
                                                activeOpacity={0.7}
                                                containerStyle={{ backgroundColor: 'white' }}
                                            />}
                                    </TouchableOpacity>
                                    : <View style={{ flexDirection: 'row' }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                showOpenFeature('toBuy');
                                            }}
                                        >
                                            <Icon
                                                name='list-alt'
                                                type='font-awesome-5'
                                                color={theme.whiteFont.color}
                                                size={moderateScale(30)}
                                                style={{
                                                    marginLeft: moderateScale(5),
                                                    marginRight: moderateScale(5)
                                                }}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                showOpenFeature('inTheCart');
                                            }}
                                        >
                                            <Icon
                                                name='cart-arrow-down'
                                                type='font-awesome-5'
                                                color={theme.whiteFont.color}
                                                size={moderateScale(25)}

                                                style={{
                                                    marginLeft: moderateScale(5),
                                                    marginRight: moderateScale(5)
                                                }}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                showAdditionalFeature();
                                            }}>
                                            <Icon
                                                name='dots-horizontal'
                                                type='material-community'
                                                color={theme.whiteFont.color}
                                                size={moderateScale(30)}

                                                style={{
                                                    marginLeft: moderateScale(5),
                                                    marginRight: moderateScale(5)
                                                }}
                                            />
                                        </TouchableOpacity>
                                    </View>
                            }
                        </TouchableOpacity>
                    </View>


                    <View style={{ alignItems: 'center', marginTop: moderateVerticalScale(5) }}>
                        <View style={{ width: '90%' }}>
                            <TextInput
                                placeholder={i18n.t('search')}
                                placeholderTextColor={theme.inputPlaceholderColor.color}
                                autoCorrect={false}
                                autoComplete="off"
                                autoFocus={false}
                                style={theme.inputSearch}
                                value={search}
                                onChangeText={(search) =>
                                    changeSearch(search)
                                }
                            />
                        </View>

                        <View style={{ flexDirection: 'row', width: '90%', marginTop: moderateVerticalScale(10) }}>
                            <View style={[theme.flex1, { alignItems: 'center' }]}>
                                <TouchableOpacity
                                    onPress={() => {
                                        const filter = 'toBuy';
                                        changeFilter(filter);
                                    }}
                                    style={filter === 'toBuy' ? [
                                        theme.smallBadgeSelectedButton,
                                        { width: moderateScale(140), backgroundColor: theme.toBuy.backgroundColor }] : [
                                        theme.smallBadgeButton,
                                        { width: moderateScale(140), borderColor: theme.toBuy.backgroundColor }]}
                                >
                                    <Text style={filter === 'toBuy' ? theme.smallBadgeSelectedButtonText : theme.smallBadgeButtonText}>{i18n.t('shoppingListFilter.toBuy')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[theme.flex1, { alignItems: 'center' }]}>
                                <TouchableOpacity
                                    onPress={() => {
                                        const filter = 'inTheCart';
                                        changeFilter(filter);
                                    }}
                                    style={filter === 'inTheCart' ? [
                                        theme.smallBadgeSelectedButton,
                                        { width: moderateScale(140), backgroundColor: theme.inTheCart.backgroundColor }] : [
                                        theme.smallBadgeButton,
                                        { width: moderateScale(140), borderColor: theme.inTheCart.backgroundColor }]}
                                >
                                    <Text style={filter === 'inTheCart' ? theme.smallBadgeSelectedButtonText : theme.smallBadgeButtonText}>{i18n.t('shoppingListFilter.inTheCart')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    <View style={{
                        marginTop: moderateScale(10)
                    }}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{
                                width: '90%'
                            }}>
                                <Card
                                    containerStyle={{
                                        backgroundColor: theme.cardContainer.backgroundColor,
                                        color: theme.whiteFont.color,
                                        borderRadius: moderateScale(12),
                                        borderWidth: 0,
                                        height: moderateVerticalScale(55),
                                        margin: 0,
                                        padding: 0,
                                        justifyContent: 'center',
                                    }}>
                                    <View style={{
                                        flexDirection: 'row',
                                    }}>
                                        <View style={{
                                            flex: 1,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            paddingLeft: moderateScale(10),
                                        }}>
                                            <Icon
                                                name={addClicked ? 'times-circle' : 'plus-circle'}
                                                type='font-awesome-5'
                                                color={theme.whiteFont.color}
                                                size={moderateScale(30)}
                                                onPress={() => {
                                                    setAddClicked(!addClicked)
                                                }}
                                                backgroundColor={addClicked ? theme.greyFont.color : theme.button.backgroundColor}
                                                style={{
                                                    borderRadius: moderateScale(12),
                                                    height: moderateScale(45),
                                                    width: moderateScale(45),
                                                    justifyContent: 'center'
                                                }}
                                            />
                                        </View>
                                        <View style={{
                                            flex: 5,
                                            paddingLeft: moderateScale(5),
                                            paddingRight: moderateScale(10)
                                        }}>
                                            <View>
                                                {!addClicked ?
                                                    <Button
                                                        onPress={() => setAddClicked(true)}
                                                        title={i18n.t('add')}
                                                        titleStyle={{
                                                            fontWeight: '700',
                                                            fontSize: moderateScale(15)
                                                        }}
                                                        buttonStyle={{
                                                            backgroundColor: theme.button.backgroundColor,
                                                            borderColor: 'transparent',
                                                            borderWidth: 0,
                                                            borderRadius: moderateScale(12),
                                                            height: moderateScale(45),
                                                            justifyContent: 'center'
                                                        }}
                                                        type="solid"
                                                    />

                                                    : <TextInput
                                                        placeholder={i18n.t('productName')}
                                                        placeholderTextColor={theme.inputPlaceholderColor.color}
                                                        color={theme.whiteFont.color}
                                                        style={theme.inputBlackKitchen}
                                                        autoCorrect={false}
                                                        autoComplete="off"
                                                        autoFocus={true}
                                                        onChangeText={(productName) =>
                                                            setProductName(productName)
                                                        }
                                                        onBlur={() =>
                                                            addManualProduct()
                                                        }
                                                    />}

                                            </View>
                                        </View>
                                    </View>
                                </Card>
                            </View>

                        </View>
                    </View>
                    <View style={{ flex: 6, marginBottom: moderateScale(10) }}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ alignItems: 'center' }}>
                                {kitchenProducts && Object.keys(kitchenProducts).map((productKey) => {
                                    const product = kitchenProducts[productKey];
                                    const productExpirationDate = product?.statusExpirationDate ? product.statusExpirationDate : product.expirationDate;
                                    const duration = productExpirationDate ? getExpirationDateWarning(productExpirationDate) : null;
                                    const productUniqueKey = product.productUniqueKey;
                                    const productCode = product.code;

                                    return (
                                        <View key={productUniqueKey} style={{ width: '90%', flexDirection: 'row', marginTop: moderateVerticalScale(10) }}>
                                            <View style={{ flex: 1 }}>
                                                <ListItem.Accordion
                                                    containerStyle={{
                                                        backgroundColor: theme.cardContainer.backgroundColor,
                                                        borderTopLeftRadius: moderateScale(12),
                                                        borderTopRightRadius: moderateScale(12),
                                                        borderBottomLeftRadius: expandedArray.includes(productUniqueKey) ? 0 : moderateScale(12),
                                                        borderBottomRightRadius: expandedArray.includes(productUniqueKey) ? 0 : moderateScale(12),
                                                        height: moderateScale(55),
                                                        //ONLY SELECTED
                                                        borderColor: selectedProducts[productUniqueKey] ? theme.expirationDateSelectedBox.backgroundColor : theme.cardContainer.backgroundColor,
                                                        borderTopWidth: 1,
                                                        borderLeftWidth: 1,
                                                        borderRightWidth: 1,
                                                        borderBottomWidth: expandedArray.includes(productUniqueKey) ? 0 : 1,
                                                        //marginBottom: -1
                                                    }}
                                                    content={
                                                        <>
                                                            <TouchableOpacity
                                                                onPress={() => { selectProduct(product) }
                                                                }
                                                            >{selectedProducts[productUniqueKey] && selectedProducts[productUniqueKey]?.instances.length === product?.instances.length && <Icon
                                                                name='check'
                                                                type='font-awesome-5'
                                                                color={theme.whiteFont.color}
                                                                size={moderateScale(15)}
                                                                backgroundColor={theme.expirationDateSelectedBox.backgroundColor}
                                                                style={{
                                                                    borderRadius: moderateScale(12),
                                                                    height: moderateScale(45),
                                                                    width: moderateScale(45),
                                                                    justifyContent: 'center'
                                                                }}
                                                            />}
                                                                {product?.image && (!selectedProducts[productUniqueKey] ||
                                                                    (selectedProducts[productUniqueKey] && selectedProducts[productUniqueKey].instances.length !== product?.instances.length)) &&
                                                                    <Image
                                                                        style={styles.image}
                                                                        source={{ uri: product.image }}
                                                                    />}
                                                                {!product?.image && (!selectedProducts[productUniqueKey] ||
                                                                    (selectedProducts[productUniqueKey] && selectedProducts[productUniqueKey].instances.length !== product?.instances.length)) &&
                                                                    <Icon
                                                                        name='food-variant'
                                                                        type='material-community'
                                                                        color={theme.whiteFont.color}
                                                                        size={moderateScale(30)}
                                                                        backgroundColor={theme.greyFont.color}
                                                                        style={{
                                                                            borderRadius: moderateScale(12),
                                                                            height: moderateScale(45),
                                                                            width: moderateScale(45),
                                                                            justifyContent: 'center'
                                                                        }}
                                                                    />}
                                                                <Badge
                                                                    badgeStyle={[duration?.expirationSeverity ? {
                                                                        backgroundColor: 'red'
                                                                    } : {
                                                                        backgroundColor: getProductStatusBackgroungColor(product?.status)
                                                                    }, {
                                                                        borderWidth: 0,
                                                                        borderRadius: 0
                                                                    }
                                                                    ]}
                                                                    value={product?.instances ? product?.instances.length : 1}
                                                                    textStyle={[{
                                                                        color: getProductStatusFontColor(product?.status),
                                                                        fontWeight: '700',
                                                                    }]}
                                                                    containerStyle={{ position: 'absolute', bottom: moderateVerticalScale(-3), right: moderateScale(-5) }}
                                                                //containerStyle={{ marginLeft: moderateScale(3) }}
                                                                />
                                                            </TouchableOpacity>
                                                            <ListItem.Content style={{
                                                                marginLeft: moderateScale(10),
                                                                height: moderateVerticalScale(45)
                                                            }}>
                                                                <View style={{ flex: 1, flexDirection: 'row' }}>
                                                                    <Text numberOfLines={1} ellipsizeMode='middle' style={theme.whiteTitle} h5>{product.productName}</Text>
                                                                </View>
                                                                <View style={{ flex: 1, flexDirection: 'row' }}>
                                                                    <View style={styles.leftText}>
                                                                        <Text style={duration?.expirationSeverity ? styles.badExpire : styles.goodExpire}>{duration ? duration.label : ''}</Text>
                                                                    </View>
                                                                    {/*                                                             <View style={[styles.rightText, { marginRight: moderateScale(5) }]}>
                                                                <Text style={product.status == 'open' ? theme.open : theme.frozen}>{i18n.t('productStatus.' + product.status)}</Text>
                                                            </View> */}
                                                                </View>

                                                            </ListItem.Content>
                                                            <TouchableOpacity
                                                                onPress={() => { props.navigation.navigate("ScanProduct", { kitchenId, productKey: productCode, instancesStatus: filter, filter }) }
                                                                }
                                                            >
                                                                <Icon
                                                                    center
                                                                    name='edit'
                                                                    type='font-awesome'
                                                                    color={theme.whiteFont.color}
                                                                    backgroundColor={theme.button.backgroundColor}
                                                                    size={moderateScale(20)}
                                                                    style={{
                                                                        borderRadius: moderateScale(5),
                                                                        padding: moderateScale(3),
                                                                        width: moderateScale(25),
                                                                        height: moderateScale(25)
                                                                    }}
                                                                />
                                                            </TouchableOpacity>
                                                            <Icon
                                                                name={expandedArray.includes(productUniqueKey) ? 'chevron-up' : 'chevron-down'}
                                                                type='material-community'
                                                                color={theme.whiteFont.color}
                                                                containerStyle={{
                                                                    marginRight: moderateScale(-26),
                                                                    height: moderateVerticalScale(55),
                                                                    justifyContent: 'center',
                                                                }}
                                                            />
                                                        </>
                                                    }
                                                    noIcon
                                                    isExpanded={expandedArray.includes(productUniqueKey)}
                                                    onPress={() => expandKey(productUniqueKey, product)}
                                                >
                                                    <ListItem
                                                        containerStyle={{
                                                            backgroundColor: theme.cardContainer.backgroundColor,
                                                            borderBottomLeftRadius: moderateScale(12),
                                                            borderBottomRightRadius: moderateScale(12),
                                                            borderColor: selectedProducts[productUniqueKey] ? theme.expirationDateSelectedBox.backgroundColor : theme.cardContainer.backgroundColor,
                                                            borderTopWidth: 0,//expandedArray.includes(productUniqueKey) ? 0 : 1,
                                                            borderLeftWidth: 1,
                                                            borderRightWidth: 1,
                                                            borderBottomWidth: 1,
                                                            marginTop: 0,
                                                            color: theme.whiteFont.color
                                                        }}
                                                        bottomDivider>
                                                        <ListItem.Content>
                                                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginBottom: moderateVerticalScale(10) }}>
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
                                                                            size: moderateScale(15),
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
                                                                </View>
                                                                <View
                                                                    style={[{ flex: 2 }, theme.expirationDateUnselectedBox]}
                                                                >
                                                                    <Text style={{ color: 'white' }}>{productExpirations[productUniqueKey] ? formatDateToLocale(new Date(productExpirations[productUniqueKey])) : getFormatFromLocale()}</Text>
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
                                                                    <Text style={{
                                                                        color: getProductStatusFontColor(product?.status),
                                                                        backgroundColor: getProductStatusBackgroungColor(product?.status),
                                                                        paddingLeft: moderateScale(5),
                                                                        paddingRight: moderateScale(5),
                                                                        fontWeight: '700'
                                                                    }}>
                                                                        {i18n.t('productsStatus.' + product.status) + ':'}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            {product?.instances && product.instances.map((instance) => {
                                                                const instanceExpirationDate = instance?.statusExpirationDate ? instance.statusExpirationDate : instance.expirationDate;
                                                                return (
                                                                    <View key={instance.id} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                                                        <View style={{ flex: 1, margin: moderateVerticalScale(-10) }}>
                                                                            <CheckBox
                                                                                center
                                                                                containerStyle={{
                                                                                    backgroundColor: theme.cardContainer.backgroundColor,
                                                                                }}
                                                                                checked={selectedProducts[productUniqueKey]?.instances.includes(instance.id)}
                                                                                checkedColor={theme.expirationDateSelectedBox.backgroundColor}
                                                                                onPress={() => changeInstanceKey(instance.id, product)}
                                                                            />
                                                                        </View>
                                                                        <TouchableOpacity
                                                                            onPress={() => changeInstanceKey(instance.id, product)}
                                                                            style={[{ flex: 2 }, selectedProducts[productUniqueKey]?.instances.includes(instance.id) ? theme.expirationDateSelectedBox : theme.expirationDateUnselectedBox]}
                                                                        >
                                                                            <Text style={{ color: 'white' }}>{instanceExpirationDate ? formatDateToLocale(new Date(instanceExpirationDate)) : getFormatFromLocale()}</Text>
                                                                        </TouchableOpacity>
                                                                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                                                                            <Button
                                                                                onPress={() => showBottomSheetForInstance(product, instance.id)}
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
                                                                                onPress={() => removeInstance(instance.id, product)}
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
                                                        </ListItem.Content>
                                                    </ListItem>
                                                </ListItem.Accordion>
                                            </View>
                                        </View>
                                    )
                                })}
                            </View>
                        </ScrollView >
                    </View >


                    <View style={{ alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                        {filter === 'toBuy' &&
                            <View style={{ width: '90%' }}>
                                <Card
                                    containerStyle={{
                                        backgroundColor: theme.cardContainer.backgroundColor,
                                        color: theme.whiteFont.color,
                                        borderRadius: moderateScale(12),
                                        borderWidth: 0,
                                        height: moderateVerticalScale(55),
                                        margin: 0,
                                        padding: 0,
                                        justifyContent: 'center'
                                    }}>
                                    <View style={{
                                        flexDirection: 'row',
                                    }}>
                                        <View style={{
                                            flex: 1,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            paddingLeft: moderateScale(10),
                                        }}>
                                            <Icon
                                                name='barcode-scan'
                                                type='material-community'
                                                color={theme.whiteFont.color}
                                                size={moderateScale(30)}
                                                onPress={() => {
                                                    props.navigation.navigate("ScanProduct", { kitchenId, instancesStatus: filter, filter })
                                                }}
                                                backgroundColor={addClicked ? theme.greyFont.color : theme.button.backgroundColor}
                                                style={{
                                                    borderRadius: moderateScale(12),
                                                    height: moderateScale(45),
                                                    width: moderateScale(45),
                                                    justifyContent: 'center'
                                                }}
                                            />
                                        </View>
                                        <View style={{
                                            flex: 5,
                                            paddingLeft: moderateScale(5),
                                            paddingRight: moderateScale(10)
                                        }}>
                                            <View>
                                                <Button
                                                    onPress={() => props.navigation.navigate("ScanProduct", { kitchenId, instancesStatus: filter })}
                                                    title={i18n.t('scan')}
                                                    titleStyle={{
                                                        fontWeight: '700',
                                                        fontSize: moderateScale(15)
                                                    }}
                                                    buttonStyle={{
                                                        backgroundColor: theme.button.backgroundColor,
                                                        borderColor: 'transparent',
                                                        borderWidth: 0,
                                                        borderRadius: moderateScale(12),
                                                        height: moderateScale(45),
                                                        justifyContent: 'center'
                                                    }}
                                                    type="solid"
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </Card>
                            </View>
                        }

                        {
                            filter === 'inTheCart' && <View style={{ width: '90%' }}>
                                <Card
                                    containerStyle={{
                                        backgroundColor: theme.cardContainer.backgroundColor,
                                        color: theme.whiteFont.color,
                                        borderRadius: moderateScale(12),
                                        borderWidth: 0,
                                        height: moderateVerticalScale(55),
                                        margin: 0,
                                        padding: 0,
                                        justifyContent: 'center'
                                    }}>
                                    <View style={{
                                        flexDirection: 'row',
                                    }}>
                                        <View style={{
                                            flex: 1,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            paddingLeft: moderateScale(10),
                                        }}>
                                            <Icon
                                                name='fact-check'
                                                type='material-icons'
                                                color={theme.whiteFont.color}
                                                size={moderateScale(30)}
                                                onPress={() => confirmPurchase()}
                                                backgroundColor={kitchenProducts && kitchenProducts.length > 0 ? theme.confirmButton.backgroundColor : theme.disabledButton.backgroundColor}
                                                style={{
                                                    borderRadius: moderateScale(12),
                                                    height: moderateScale(45),
                                                    width: moderateScale(45),
                                                    justifyContent: 'center'
                                                }}
                                            />
                                        </View>
                                        <View style={{
                                            flex: 5,
                                            paddingLeft: moderateScale(5),
                                            paddingRight: moderateScale(10)
                                        }}>
                                            <View>
                                                <Button
                                                    onPress={() => confirmPurchase()}
                                                    title={i18n.t('confirmPurchase')}
                                                    titleStyle={{
                                                        fontWeight: '700',
                                                        fontSize: moderateScale(15)
                                                    }}
                                                    buttonStyle={{
                                                        backgroundColor: kitchenProducts && kitchenProducts.length > 0 ? theme.confirmButton.backgroundColor : theme.disabledButton.backgroundColor,
                                                        borderColor: 'transparent',
                                                        borderWidth: 0,
                                                        borderRadius: moderateScale(12),
                                                        height: moderateScale(45),
                                                        justifyContent: 'center'
                                                    }}
                                                    type="solid"
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </Card>
                            </View>

                        }
                    </View>
                    <BottomSheet
                        containerStyle={{ marginBottom: keyboardHeight }}
                        modalProps={{}}
                        onBackdropPress={() => hideOpenModalFeature()}
                        isVisible={openModalFeature}
                    >
                        {modalContent()}
                    </BottomSheet>
                    <BottomSheet modalProps={{}}
                        onBackdropPress={() => hideOpenFeature()}
                        isVisible={openFeature}
                    >
                        {modalContent()}
                    </BottomSheet>
                    <BottomSheet modalProps={{}}
                        onBackdropPress={() => hideAdditionalFeature()}
                        isVisible={additionalFeature}
                    >

                        <View>
                            {
                                additionalMenuList.filter(item => item.showOnAdditionalMenu).map((item, i) => (
                                    <ListItem key={i}
                                        containerStyle={{
                                            backgroundColor: theme.bottomSheet.backgroundColor,
                                            mergin: 0
                                        }}
                                        onPress={() => { item.func() }}
                                    >
                                        <Icon type={item.type} name={item.icon} color={theme.whiteFont.color} />
                                        <ListItem.Content

                                        >
                                            <ListItem.Title
                                                style={{
                                                    color: theme.whiteFont.color
                                                }}
                                            >{item.title}</ListItem.Title>
                                        </ListItem.Content>
                                    </ListItem>
                                ))
                            }
                        </View>
                        <View style={{
                            height: moderateScale(10),
                            backgroundColor: theme.bottomSheet.backgroundColor,
                        }}></View>
                    </BottomSheet>
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
                        </BottomSheet>
                    }
                    {
                        androidBottomSheetVisible &&
                        <DateTimePicker value={expirationDate} onChange={changeExpirationDate} />
                    }
                </View>
            </View>
        );
}

const mapStateToProps = (store) => ({
    currentUser: store.userState.currentUser
})

const mapDispatchProps = (dispatch) => bindActionCreators({ kitchenProducts }, dispatch);

export default connect(mapStateToProps, null)(ShoppingListScreen);

const styles = ScaledSheet.create({
    image: {
        width: '45@ms',
        height: '45@ms',
        resizeMode: 'cover',
        borderRadius: '12@ms'
    },
    boxIcon: {
        flexDirection: 'column'
    },
    boxText: {
        flex: 1,
        marginTop: '5@mvs',
        flexDirection: 'row'
    },
    leftText: {
        flex: 1,
        alignItems: 'flex-start'
    },
    goodExpire: {
        color: '#08FB1D'
    },
    badExpire: {
        color: 'red'
    }
});