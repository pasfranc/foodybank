import DateTimePicker from '@react-native-community/datetimepicker';
import intervalToDuration from 'date-fns/intervalToDuration';
import dateFormat from "dateformat";
import * as Haptics from 'expo-haptics';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar, Badge, BottomSheet, Button, Card, CheckBox, Icon, ListItem, Text } from 'react-native-elements';
import { showMessage } from "react-native-flash-message";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moderateScale, moderateVerticalScale } from 'react-native-size-matters';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { theme } from '../../css/theme';
import { getI18n } from '../../i18n/translationService';
import { generateRandomId, isTimestampFromToday, isTimestampAfterToday } from '../../utils/utilsService';
import SplashScreen from '../common/Splash';
import { filterByStatus, groupAllProductByCodeAndStatus } from '../service/filteringService';
import { checkForExpiringProductInKitchenAndSchedulePush } from '../service/notificationService';
import { sortMapByExpirationDate, sortProductInstances } from '../service/orderingService';
import { updateUserTutorial, KITCHEN_TUTORIAL } from '../service/rewardService';

require("firebase/compat/firestore");
require("firebase/compat/storage");

function KitchenScreen(props, { navigation }) {

    const insets = useSafeAreaInsets();
    const isAndroid = Platform.OS === 'android' ? true : false;
    const kitchenFilterList = ["all", "open", "frozen", "expiring"];
    const paramsFilter = props?.filter ? kitchenFilterList.includes(props.filter) ? props.filter : 'all' : 'all';

    const [pageIsReady, setPageIsReady] = useState(false);
    const [kitchenProducts, setKitchenProducts] = useState(null);
    const [kitchenByEndpoint, setKitchenByEndpoint] = useState(null);
    const [search, setSearch] = useState(null);
    const [addClicked, setAddClicked] = useState(false);
    const [filter, setFilter] = useState(paramsFilter);
    const [productName, setProductName] = useState(null);

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
    const [flagProductExpired, setFlagProductExpired] = useState(false);
    const [changeItAnyway, setChangeItAnyway] = useState(false);
    const [daysToAdd, setDaysToAdd] = useState(3);
    const [action, setAction] = useState(null);
    const [place, setPlace] = useState('');

    const [additionalFeature, setAdditionalFeature] = useState(false);
    const [putInShoppingList, setPutInShoppingList] = useState(false);
    const locale = props.currentUser?.language ? props.currentUser?.language : 'en-US';

    const i18n = props.currentUser?.language ? getI18n(props.currentUser.language) : getI18n();
    let kitchenId = null;
    const currentUser = props.currentUser;
    const subPlace = i18n.get('kitchen');

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
        if (kitchenId) {
            firebase.firestore()
                .collection("kitchens")
                .doc(kitchenId)
                .get()
                .then((kitchen) => {
                    const kitchenData = kitchen.data();
                    const allProductsFromEndpoint = allProductsFromKitchenData(kitchenData);
                    setKitchenByEndpoint(allProductsFromEndpoint);
                    organizeKitchenData(allProductsFromEndpoint, filter, search);
                    setPageIsReady(true);
                    //controlla e in caso setta push notification scadenza per questa cucina
                })
        } else props.navigation.replace("AddKitchen");
    }, []);

    const hideOpenFeature = () => {
        setOpenFeature(false);
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
        if (action === 'open') {
            setDaysToAdd(3);
        } else if (action === 'frozen') {
            setDaysToAdd(90);
        }
        setOpenFeature(true);
        setChangeItAnyway(false);
        setPutInShoppingList(false);
    }

    const additionalMenuList = [
        {
            action: 'frozen',
            title: i18n.get('actions.frozen'),
            icon: 'temperature-low',
            type: 'font-awesome-5',
            color: theme.frozen.backgroundColor,
            actionText: i18n.t('freezeProduct'),
            showOnAdditionalMenu: true,
            func: () => {
                hideAdditionalFeature()
                showOpenFeature('frozen')
            }
        },
        {
            action: 'open',
            title: i18n.get('actions.open'),
            icon: 'dropbox',
            type: 'font-awesome-5',
            color: theme.open.backgroundColor,
            actionText: i18n.t('openProduct'),
            showOnAdditionalMenu: true,
            func: () => {
                hideAdditionalFeature()
                showOpenFeature('open')
            }
        },
        {
            action: 'closed',
            title: i18n.get('actions.closed'),
            icon: 'box',
            type: 'font-awesome-5',
            color: theme.closed.backgroundColor,
            iconColor: theme.closed.color,
            actionText: i18n.t('closedProduct'),
            showOnAdditionalMenu: true,
            func: () => {
                hideAdditionalFeature()
                showOpenFeature('closed')
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
            action: 'consume',
            title: i18n.get('actions.consume'),
            icon: 'utensils',
            type: 'font-awesome-5',
            color: theme.button.backgroundColor,
            actionText: i18n.t('consumeProduct'),
            showOnAdditionalMenu: true,
            func: () => {
                hideAdditionalFeature()
                showOpenFeature('consume')
            }
        },
        {
            action: 'waste',
            title: i18n.get('actions.waste'),
            icon: 'delete-clock',
            type: 'material-community',
            color: theme.button.backgroundColor,
            actionText: i18n.t('wasteProduct'),
            showOnAdditionalMenu: true,
            func: () => {
                hideAdditionalFeature()
                showOpenFeature('waste')
            }
        },
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

    const changeExpirationDate = async (event, selectedDate) => {
        if (isAndroid) {
            hideAndroidBottomSheet();
        }
        if (event.type === 'set') {
            setExpirationDate(selectedDate);
            if (isAndroid) {
                await confirmExpirationDate(selectedDate);
            }
        }
    }

    const confirmExpirationDate = async (androidSelectedDate) => {
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
        if (instanceForExpirationDate) {
            showMessage({
                message: i18n.get('changedExpirationDate'),
                type: "success",
                icon: { icon: "success", position: "left" },
            });
            if (isTimestampFromToday(updatedDate)) {
                await updateUserTutorial(KITCHEN_TUTORIAL, "04_SET_EXPIRATION_DATE_TODAY")
            } else if (isTimestampAfterToday(updatedDate)) {
                await updateUserTutorial(KITCHEN_TUTORIAL, "05_SET_EXPIRATION_DATE_FUTURE")
            }
        }
        hideBottomSheet();
    }

    const showProductExpiredText = (flagProductExpired, action) => {
        if (action === 'consume' || action === 'waste') {
            return false;
        } else return flagProductExpired;
    }

    const confirmOpenFeature = () => {
        let newDate = new Date();
        newDate.setDate(newDate.getDate() + daysToAdd);
        newDate.setUTCHours(0, 0, 0, 0);
        if (action === 'swap') {
            hideOpenFeature();
            props.navigation.navigate("ScanProduct", {
                kitchenId,
                instancesStatus: filter,
                filter,
                selectedProducts
            })
        } else {
            updateProducts(newDate);
        }
    }

    const updateProducts = (statusDate) => {
        firebase.firestore()
            .collection("kitchens")
            .doc(kitchenId)
            .get()
            .then(async (kitchen) => {
                const kitchenData = kitchen.data();
                let productsList = kitchenData.productsList;
                let shoppingList = kitchenData.shoppingList;

                for (let key in selectedProducts) {
                    const selectedProductToUpdate = selectedProducts[key];
                    const code = selectedProductToUpdate.code;
                    const productToUpdate = productsList[code];

                    if (action === 'waste' || action === 'consume') {
                        if (putInShoppingList) {
                            const productInShoppingList = shoppingList[code];
                            if (productInShoppingList) {
                                productInShoppingList.instances.push({
                                    quantity: 1,
                                    expirationDate: null,
                                    statusExpirationDate: null,
                                    status: 'toBuy',
                                    id: generateRandomId(10)
                                });
                            } else {
                                shoppingList[code] = {
                                    brands: productToUpdate?.brands ? productToUpdate.brands : null,
                                    code: productToUpdate?.code ? productToUpdate.code : null,
                                    image: productToUpdate?.image ? productToUpdate.image : null,
                                    productName: productToUpdate?.productName ? productToUpdate.productName : null,
                                    productQuantity: productToUpdate?.productQuantity ? productToUpdate.productQuantity : null,
                                    instances: [{
                                        quantity: 1,
                                        expirationDate: null,
                                        statusExpirationDate: null,
                                        status: 'toBuy',
                                        id: generateRandomId(10)
                                    }],
                                }
                            }
                        }
                    }

                    selectedProductToUpdate.instances.forEach(selectedInstance => {
                        if (action === 'waste' || action === 'consume') {
                            let index = productToUpdate.instances.findIndex(instanceToUpdate => instanceToUpdate.id === selectedInstance);
                            productToUpdate.instances.splice(index, 1);
                        } else if (action === 'closed') {
                            let instance = productToUpdate.instances.find(instanceToUpdate => instanceToUpdate.id === selectedInstance);
                            instance.statusExpirationDate = instance.expirationDate;
                            instance.status = action;
                        } else {
                            let instance = productToUpdate.instances.find(instanceToUpdate => instanceToUpdate.id === selectedInstance);
                            if (changeItAnyway) {
                                instance.statusExpirationDate = statusDate.getTime();
                            }
                            instance.status = action;
                        }

                    })
                    if (productToUpdate.instances.length === 0) {
                        delete productsList[productToUpdate.code];
                    }
                }
                displayMessage();
                await updateUserTutorialAction();
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

    const updateUserTutorialAction = async () => {
        if (action === 'consume') {
            await updateUserTutorial(KITCHEN_TUTORIAL, "06_CONSUME_PRODUCT")
        } else if (action === 'waste') {
            await updateUserTutorial(KITCHEN_TUTORIAL, "07_DISCARD_PRODUCT")
        } else if (action === 'open') {
            await updateUserTutorial(KITCHEN_TUTORIAL, "08_OPEN_PRODUCT")
        } else if (action === 'frozen') {
            await updateUserTutorial(KITCHEN_TUTORIAL, "09_FREEZE_PRODUCT")
        }
    }

    const unselect = () => {
        setSelectedProducts({});
        hideOpenFeature();
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

    const decreaseDays = (daysToAdd) => {
        if (daysToAdd > 0) {
            daysToAdd = daysToAdd - 1;
            setDaysToAdd(daysToAdd);
        }
    }

    const increaseDays = (daysToAdd) => {
        daysToAdd = daysToAdd + 1;
        setDaysToAdd(daysToAdd);
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
            setChangeItAnyway(false);
        } else {
            setExpandedKey(productUniqueKey);
            updatedExpandedArray.push(productUniqueKey);
            setChangeItAnyway(false);
        }
        setExpandedArray(updatedExpandedArray);
    }

    const allProductsFromKitchenData = (kitchenData) => {
        setPlace(kitchenData.name);
        const allProducts = [];

        for (let product in kitchenData.productsList) {
            for (let instance in kitchenData.productsList[product].instances) {
                const singleProduct = kitchenData.productsList[product].instances[instance];
                singleProduct.code = product;
                singleProduct.productName = kitchenData.productsList[product].productName;
                singleProduct.image = kitchenData.productsList[product].image;
                singleProduct.productType = kitchenData.productsList[product].productType;
                allProducts.push(singleProduct);
            }
        }
        return allProducts;
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

    const organizeKitchenData = (allProductsFromEndpoint, filter, search) => {
        const allProducts = allProductsFromEndpoint;
        const filteredProductsByStatus = filterByStatus(allProducts, filter);
        const filteredProductsByProductName = filterByProductName(filteredProductsByStatus, search);
        let allGroupedProducts = groupAllProductByCodeAndStatus(filteredProductsByProductName);
        setKitchenProducts(sortMapByExpirationDate(allGroupedProducts));
    }

    const changeSearch = (search) => {
        setSearch(search);
        organizeKitchenData(kitchenByEndpoint, filter, search);
    }

    const changeFilter = (filter) => {
        setFilter(filter);
        organizeKitchenData(kitchenByEndpoint, filter, search);
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
                setKitchenByEndpoint(allProductsFromEndpoint);
                if (kitchenProducts) {
                    setKitchenProducts(kitchenProducts)
                } else {
                    organizeKitchenData(allProductsFromEndpoint, filter, search);
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
                checkForExpiringProductInKitchenAndSchedulePush(productsList, kitchenId, locale);
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
            productExpirations[product.productUniqueKey].setHours(23, 59, 59, 999) : null;

        firebase.firestore()
            .collection("kitchens")
            .doc(kitchenId)
            .get()
            .then((kitchen) => {
                const kitchenData = kitchen.data();
                let productsList = kitchenData.productsList;
                let shoppingList = kitchenData.shoppingList;

                const productToUpdate = productsList[product.code];
                const generatedId = generateRandomId(10);
                const newInstance = {
                    quantity: 1,
                    expirationDate: filter === 'all' ? updatedDate : null,
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
        const index = kitchenProducts.findIndex(item => item?.code === product?.code && item?.status === product?.status);
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

    const getProductStatusBackgroungColor = (productStatus) => {
        switch (productStatus) {
            case 'open':
                return theme.open.backgroundColor
            case 'frozen':
                return theme.frozen.backgroundColor
            case 'closed':
                return theme.closed.backgroundColor
        }
    };

    const getProductStatusFontColor = (productStatus) => {
        switch (productStatus) {
            case 'open':
                return theme.open.color
            case 'frozen':
                return theme.frozen.color
            case 'closed':
                return theme.closed.color
            default:
                return theme.whiteFont.color
        }
    };

    const addManualProduct = () => {

        const randomIdEAN = generateRandomId(13);
        if (productName) {
            const status = filter === 'all' ? 'closed' : filter;
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
                    status,
                    id: generateRandomId(10)
                }],
                creationDate: new Date().getTime(),
                importedBy: firebase.auth().currentUser.uid
            }

            firebase.firestore()
                .collection("kitchens")
                .doc(kitchenId)
                .get()
                .then(async (kitchen) => {
                    const kitchenData = kitchen.data();
                    let productsList = kitchenData.productsList;
                    let shoppingList = kitchenData.shoppingList;
                    const status = filter === 'all' ? 'closed' : filter;
                    newProduct.status = status;
                    productsList[randomIdEAN] = newProduct;

                    showMessage({
                        message: i18n.get('addedProduct'),
                        type: "success",
                        icon: { icon: "success", position: "left" },
                    });
                    await updateUserTutorial(KITCHEN_TUTORIAL, "03_ADD_MANUAL_PRODUCT")
                    saveAndReload(productsList, shoppingList);
                })
        } else {
            setAddClicked(false);
        }
    }

    const setInstanceExpirationDate = (instanceKey, product, passedDate) => {
        const updatedDate = passedDate ? passedDate.setHours(23, 59, 59, 999) : null;
        firebase.firestore()
            .collection("kitchens")
            .doc(kitchenId)
            .get()
            .then((kitchen) => {
                const kitchenData = kitchen.data();
                let productsList = kitchenData.productsList;
                let shoppingList = kitchenData.shoppingList;

                const productToUpdate = productsList[product.code];
                let index = productToUpdate.instances.findIndex(instanceToUpdate => instanceToUpdate.id === instanceKey);
                productToUpdate.instances[index].statusExpirationDate = updatedDate;
                productToUpdate.instances[index].expirationDate = filter === 'all' ? updatedDate : productToUpdate.instances[index].expirationDate;

                reflectChangesSetInstanceExpirationDate(kitchenProducts, product, instanceKey, updatedDate);
                saveAndReload(productsList, shoppingList, kitchenProducts);
            });
    }

    const removeInstance = (instanceKey, product) => {
        firebase.firestore()
            .collection("kitchens")
            .doc(kitchenId)
            .get()
            .then((kitchen) => {
                const kitchenData = kitchen.data();
                let productsList = kitchenData.productsList;
                let shoppingList = kitchenData.shoppingList;

                const productToUpdate = productsList[product.code];
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
                                >
                                    <Icon
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
                                        {!currentUser?.profileImageUrl && <Avatar
                                            size={moderateScale(30)}
                                            rounded
                                            icon={{ name: 'user', type: 'font-awesome', color: theme.container.backgroundColor }}
                                            source={{ uri: 'https://' }} //added to remove ReactImageView: Image source "null" doesn't exist
                                            activeOpacity={0.7}
                                            containerStyle={{ backgroundColor: 'white' }}
                                        />}
                                        {currentUser?.profileImageUrl && <Avatar
                                            size={moderateScale(30)}
                                            rounded
                                            imageProps={{ transition: false }}
                                            source={{ uri: currentUser.profileImageUrl }}
                                            activeOpacity={0.7}
                                        />}
                                    </TouchableOpacity>
                                    : <View style={{ flexDirection: 'row' }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                showOpenFeature('frozen');
                                            }}
                                        >
                                            <Icon
                                                name='temperature-low'
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
                                                showOpenFeature('open');
                                            }}
                                        >
                                            <Icon
                                                name='dropbox'
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
                                                showAdditionalFeature();
                                            }}
                                        >
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
                                        const filter = 'all';
                                        changeFilter(filter);
                                    }}
                                    style={filter === 'all' ? [theme.smallBadgeSelectedButton, {}] : [theme.smallBadgeButton,
                                    { borderColor: theme.closed.backgroundColor }]}
                                >
                                    <Text style={filter === 'all' ? theme.smallBadgeSelectedButtonText : theme.smallBadgeButtonText}>{i18n.t('filter.all')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[theme.flex1, { alignItems: 'center' }]}>
                                <TouchableOpacity
                                    onPress={() => {
                                        const filter = 'open';
                                        changeFilter(filter);
                                    }}
                                    style={filter === 'open' ? [theme.smallBadgeSelectedButton, { backgroundColor: theme.open.backgroundColor }] :
                                        [theme.smallBadgeButton, {
                                            borderColor: theme.open.backgroundColor
                                        }]}
                                >
                                    <Text style={filter === 'open' ? theme.smallBadgeSelectedButtonText : [theme.smallBadgeButtonText]}>{i18n.t('filter.open')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[theme.flex1, { alignItems: 'center' }]}>
                                <TouchableOpacity
                                    onPress={() => {
                                        const filter = 'frozen';
                                        changeFilter(filter);
                                    }}
                                    style={filter === 'frozen' ? [theme.smallBadgeSelectedButton, { backgroundColor: theme.frozen.backgroundColor }] :
                                        [theme.smallBadgeButton, {
                                            borderColor: theme.frozen.backgroundColor
                                        }]}
                                >
                                    <Text style={filter === 'frozen' ? theme.smallBadgeSelectedButtonText : theme.smallBadgeButtonText}>{i18n.t('filter.frozen')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[theme.flex1, { alignItems: 'center' }]}>
                                <TouchableOpacity
                                    onPress={() => {
                                        const filter = 'expiring';
                                        changeFilter(filter);
                                    }}
                                    style={filter === 'expiring' ? [theme.smallBadgeSelectedButton, {
                                        backgroundColor: theme.expired.backgroundColor
                                    }] :
                                        [theme.smallBadgeButton, { borderColor: theme.expired.backgroundColor }]}
                                >
                                    <Text style={filter === 'expiring' ? theme.smallBadgeSelectedButtonText : theme.smallBadgeButtonText}>{i18n.t('filter.expiring')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    {filter != 'expiring' && <View style={{
                        marginTop: moderateScale(10)
                    }}>
                        <View style={{ alignItems: 'center' }}>
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
                    </View>}
                    <View style={{ flex: 6 }}>
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
                                                                        style={theme.image}
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
                                                                    <View style={theme.leftText}>
                                                                        <Text style={duration?.expirationSeverity ? theme.badExpire : theme.goodExpire}>{duration ? duration.label : ''}</Text>
                                                                    </View>
                                                                    {/*                                                             <View style={[styles.rightText, { marginRight: moderateScale(5) }]}>
                                                                <Text style={product.status == 'open' ? theme.open : theme.frozen}>{i18n.t('productStatus.' + product.status)}</Text>
                                                            </View> */}
                                                                </View >

                                                            </ListItem.Content >
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
                                                                <View style={[theme.leftText]}>
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
                                                                            backgroundColor: productExpirations[productUniqueKey] ? theme.button.backgroundColor : theme.disabledButton.backgroundColor,
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
                                                                            name: 'plus-circle',
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
                                                                <View style={[theme.leftText]}>
                                                                    <Text style={{
                                                                        color: getProductStatusFontColor(product?.status),
                                                                        backgroundColor: getProductStatusBackgroungColor(product?.status),
                                                                        paddingLeft: moderateScale(5),
                                                                        paddingRight: moderateScale(5),
                                                                        fontWeight: '700'
                                                                    }}>{i18n.t('productsStatus.' + product.status) + ':'}</Text>
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
                                                </ListItem.Accordion >
                                            </View >
                                        </View >
                                    )
                                })}
                            </View >
                        </ScrollView >
                    </View >
                    {filter != 'expiring' &&
                        <View style={{ alignItems: 'center', flex: 1, marginBottom: moderateScale(10) }}>
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
                                        justifyContent: 'center',
                                        marginTop: moderateVerticalScale(10)
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
                                                    onPress={() => props.navigation.navigate("ScanProduct", { kitchenId, instancesStatus: filter, filter })}
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
                        </View>
                    }
                    <BottomSheet modalProps={{}}
                        onBackdropPress={() => hideOpenFeature()}
                        isVisible={openFeature}
                    >
                        <View>
                            <Card containerStyle={{
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
                                            marginTop: moderateVerticalScale(3),
                                            paddingLeft: moderateScale(5),
                                            paddingRight: moderateScale(5)
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
                                {(action == 'frozen' || action == 'open') &&
                                    <View>
                                        <Text style={theme.whiteFont} h5>{i18n.get('preFeature') + i18n.get('feature.' + action) + i18n.get('postFeature')}</Text>
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
                                                checked={changeItAnyway}
                                                checkedColor={theme.whiteFont.color}
                                                onPress={() => setChangeItAnyway(!changeItAnyway)}
                                                title={i18n.get('openFeatureChangeItAnywayDoIt')}
                                            />
                                        </View>

                                        {changeItAnyway && <Text style={theme.whiteFont} h5>{i18n.get('openFeatureChangeText')}</Text>}

                                        {changeItAnyway && <View style={{
                                            flex: 1, flexDirection: 'row', justifyContent: 'center', marginTop: moderateVerticalScale(5)
                                        }}>
                                            <Button
                                                onPress={() => decreaseDays(daysToAdd)}
                                                icon={{
                                                    name: 'minus',
                                                    type: 'font-awesome',
                                                    color: 'white'
                                                }}
                                                buttonStyle={{
                                                    backgroundColor: theme.button.backgroundColor,
                                                    borderColor: 'transparent',
                                                    borderWidth: 0,
                                                    borderRadius: moderateScale(5),
                                                    padding: moderateScale(2),
                                                    margin: 0
                                                }}
                                                type="solid"
                                            />
                                            <Text style={[theme.buttonText]}> {daysToAdd} </Text>
                                            <Button
                                                onPress={() => increaseDays(daysToAdd)}
                                                icon={{
                                                    name: 'plus',
                                                    type: 'font-awesome',
                                                    color: 'white'
                                                }}
                                                buttonStyle={{
                                                    backgroundColor: theme.button.backgroundColor,
                                                    borderColor: 'transparent',
                                                    borderWidth: 0,
                                                    borderRadius: moderateScale(5),
                                                    padding: moderateScale(2),
                                                    margin: 0
                                                }}
                                                type="solid"
                                            />
                                            <Text style={[theme.buttonText]}>{' ' + i18n.get('startingFromToday')}</Text>
                                        </View>}
                                    </View>}
                                {(action == 'closed' || action == 'swap') &&
                                    <View>
                                        <Text style={theme.whiteFont} h5>{i18n.get(`featureDescription.${action}`)}</Text>
                                    </View>}
                                {(action == 'consume' || action == 'waste') &&
                                    <View>
                                        <Text style={theme.whiteFont} h5>{i18n.get('preRemoveFeature') + i18n.get('feature.' + action) + i18n.get('postRemoveFeature')}</Text>
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
                                                checked={putInShoppingList}
                                                checkedColor={theme.whiteFont.color}
                                                onPress={() => setPutInShoppingList(!putInShoppingList)}
                                                title={i18n.get('openFeaturePutInShoppingList')}
                                            />
                                        </View>
                                    </View>}
                                <TouchableOpacity
                                    style={[theme.button, theme.bottomSheetConfirmContainer]}
                                    onPress={() => confirmOpenFeature()}
                                >
                                    <Text style={theme.buttonText}>{i18n.t('confirm')}</Text>
                                </TouchableOpacity>
                            </Card>
                        </View>
                    </BottomSheet >
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
                                            margin: 0
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
                                        onPress={async () => await confirmExpirationDate()}
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
                </View >
            </View >
        );

}

const mapStateToProps = (store) => ({
    currentUser: store.userState.currentUser
})

const mapDispatchProps = (dispatch) => bindActionCreators({ kitchenProducts }, dispatch);

export default connect(mapStateToProps, null)(KitchenScreen);