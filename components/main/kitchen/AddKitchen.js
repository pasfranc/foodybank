
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import React, { Component } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Card, Header, Icon, Text } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import { moderateScale, moderateVerticalScale, ScaledSheet } from 'react-native-size-matters';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { theme } from '../../../css/theme';
import { getI18n } from '../../../i18n/translationService';
import { fetchUser } from '../../../redux/actions/index';
import { generateRandomId } from '../../../utils/utilsService';
import { showMessage } from "react-native-flash-message";
import { updateUserTutorial, KITCHEN_TUTORIAL } from '../../service/rewardService';

export class AddKitchenScreen extends Component {
    constructor(props) {
        super(props);

        this.i18n = this.props.currentUser?.language ? getI18n(this.props.currentUser.language) : getI18n();
        this.dataChanged = false;
        this.state = {
            kitchenName: '',
            newKitchenInvitationCode: generateRandomId(6),
            invitationCode: '',
            formError: '',
            addKitchen: true,
            place: this.i18n.t('addKitchen')
        }
    }
    componentDidMount() {
        this.props.fetchUser();
    }

    setKitchenName = (kitchenName) => {
        if (kitchenName.length > 0) {
            this.dataChanged = true
        }
        this.setState({
            kitchenName
        })
    }

    setInvitationCode = (invitationCode) => {
        if (invitationCode.length > 0) {
            this.dataChanged = true
        }
        this.setState({
            invitationCode
        })
    }

    showAddKitchen = () => {
        this.setState({
            addKitchen: true,
            place: this.i18n.t('addKitchen'),
            invitationCode: '',
            formError: ''
        })
        this.dataChanged = false;
    }

    hideAddKitchen = () => {
        this.setState({
            addKitchen: false,
            place: this.i18n.t('joinKitchen'),
            kitchenName: '',
            formError: ''
        })
        this.dataChanged = false;
    }

    joinKitchen = async () => {
        this.setFormError('')
        const invitationCode = this.state.invitationCode;
        if (this.dataChanged) {
            const validation = await this.validateJoinKitchen();
            if (validation) {
                firebase.firestore()
                    .collection("joinCodes")
                    .doc(invitationCode)
                    .get()
                    .then(async (code) => {
                        const existingCode = code.data();
                        firebase.firestore()
                            .collection("kitchens")
                            .doc(existingCode.UIDKitchen)
                            .get()
                            .then((kitchen) => {
                                const existingKitchen = kitchen.data();
                                const users = existingKitchen.users ? existingKitchen.users : [];
                                users.push(firebase.auth().currentUser.uid)
                                firebase.firestore()
                                    .collection("kitchens")
                                    .doc(existingCode.UIDKitchen)
                                    .update({ users }).then(() => {
                                        let kitchens = this.props.currentUser.kitchens ? this.props.currentUser.kitchens : [];
                                        kitchens.push({
                                            UIDKitchen: existingCode.UIDKitchen,
                                            isOwner: false,
                                            name: existingKitchen.name,
                                            totalItemsKitchen: existingKitchen.totalItemsKitchen,
                                            withExpiryItemsKitchen: existingKitchen.withExpiryItemsKitchen,
                                            totalItemShoppingList: existingKitchen.totalItemShoppingList,
                                            inTheCartShoppingList: existingKitchen.inTheCartShoppingList
                                        })
                                        firebase.firestore().collection("users")
                                            .doc(firebase.auth().currentUser.uid)
                                            .update({
                                                kitchens
                                            })
                                            .then(() => {
                                                showMessage({
                                                    message: this.i18n.get('addedKitchenWithSuccess'),
                                                    type: "success",
                                                    icon: { icon: "success", position: "left" },
                                                });
                                                this.props.navigation.replace("Main")
                                            })
                                    })
                            })
                    })
            }
        }
    }

    addKitchen = () => {
        if (this.dataChanged) {
            if (this.validateAddKitchen()) {
                let kitchens = this.props.currentUser.kitchens ? this.props.currentUser.kitchens : [];
                firebase.firestore()
                    .collection("kitchens")
                    .add({
                        name: this.state.kitchenName,
                        ownedBy: firebase.auth().currentUser.uid,
                        creationDate: firebase.firestore.FieldValue.serverTimestamp(),
                        invitationCode: this.state.newKitchenInvitationCode,
                        users: [firebase.auth().currentUser.uid],
                        productsList: {},
                        shoppingList: {},
                        totalItemsKitchen: 0,
                        withExpiryItemsKitchen: 0,
                        totalItemShoppingList: 0,
                        inTheCartShoppingList: 0
                    })
                    .then((docRef) => {
                        kitchens.push({
                            UIDKitchen: docRef.id,
                            isOwner: true,
                            name: this.state.kitchenName,
                            invitationCode: this.state.newKitchenInvitationCode,
                            totalItemsKitchen: 0,
                            withExpiryItemsKitchen: 0,
                            totalItemShoppingList: 0,
                            inTheCartShoppingList: 0
                        })

                        firebase.firestore().collection("users")
                            .doc(firebase.auth().currentUser.uid)
                            .update({
                                kitchens
                            })
                            .then(async () => {
                                await firebase.firestore()
                                    .collection("joinCodes")
                                    .doc(this.state.newKitchenInvitationCode)
                                    .set({
                                        UIDKitchen: docRef.id
                                    })
                                    .then(() => {
                                        showMessage({
                                            message: this.i18n.get('addedKitchenWithSuccess'),
                                            type: "success",
                                            icon: { icon: "success", position: "left" },
                                        });
                                        this.props.navigation.replace("Main")
                                    })
                                await updateUserTutorial(KITCHEN_TUTORIAL, "01_ADD_KITCHEN")
                            })
                    })
            }
        }
    }

    setFormError = (formError) => {
        this.setState({
            formError
        });
    }

    validateJoinKitchen = async () => {
        if (!this.state.invitationCode) {
            this.setFormError(this.i18n.t('invitationCode') + this.i18n.t('error.mandatory'));
            return false;
        }
        //Check if this code exists into joinCodes doc!
        const checkFirestore = await firebase.firestore()
            .collection("joinCodes")
            .doc(this.state.invitationCode)
            .get()
            .then(async (code) => {
                if (code.exists) {
                    const existingCode = code.data();

                    //Check owner and name
                    const internal = await firebase.firestore()
                        .collection("kitchens")
                        .doc(existingCode.UIDKitchen)
                        .get()
                        .then(async (kitchen) => {
                            const existingKitchen = kitchen.data();
                            if (existingKitchen?.ownedBy === firebase.auth().currentUser.uid) {
                                this.setFormError(this.i18n.t('error.cannotJoinYourOwnKitchen'));
                                return false;
                            }

                            const kitchens = this.props.currentUser.kitchens ? this.props.currentUser.kitchens : [];
                            const kitchensId = kitchens.map(item => item.UIDKitchen);
                            let kitchenNamesList = [];
                            await firebase.firestore()
                                .collection('kitchens')
                                .where(firebase.firestore.FieldPath.documentId(), 'in', kitchensId)
                                .get()
                                .then(kitchens => kitchens.forEach(singleKitchen => {
                                    kitchenNamesList.push(singleKitchen.data().name)
                                }));
                            if (kitchenNamesList.includes(this.state.kitchenName)) {
                                this.setFormError(this.i18n.t('kitchenName') + this.i18n.t('error.existing'));
                                return false;
                            }
                            return true;
                        })
                    return internal;

                } else {
                    this.setFormError(this.i18n.t('invitationCode') + this.i18n.t('error.doesNotExist'));
                    return false;
                }
            })
        if (!checkFirestore) {
            return false;
        }
        return true;
    }

    validateAddKitchen = () => {
        if (!this.state.kitchenName) {
            this.setFormError(this.i18n.t('kitchenName') + this.i18n.t('error.mandatory'));
            return false;
        }
        const kitchens = this.props.currentUser.kitchens ? this.props.currentUser.kitchens : [];
        const kitchenNamesList = kitchens.map(item => item.name);
        if (kitchenNamesList.includes(this.state.kitchenName)) {
            this.setFormError(this.i18n.t('kitchenName') + this.i18n.t('error.existing'));
            return false;
        }
        return true;
    }

    render() {
        const place = this.state.place;
        const { currentUser } = this.props;
        const fakeInputPadding = Platform.OS === 'ios' ? 0 : moderateVerticalScale(5);
        this.i18n = this.props.currentUser?.language ? getI18n(this.props.currentUser.language) : getI18n();

        return (
            <View style={[theme.flex1, theme.container]}>
                <Header
                    containerStyle={{ borderBottomWidth: 0, margin: moderateScale(5) }}
                    backgroundColor={theme.container.backgroundColor}
                    leftComponent={
                        <Icon
                            size={moderateScale(30)}
                            name='md-arrow-back-circle-sharp'
                            type='ionicon'
                            color='#fff'
                            onPress={() => this.props.navigation.navigate("Main")}
                            activeOpacity={0.7}
                        />
                    }
                    centerComponent={{ text: place, style: { color: '#fff', fontSize: moderateScale(20), fontWeight: 'bold' } }}
                />
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[theme.container]
                    }>
                    <SafeAreaView style={theme.flex1}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', width: '90%' }}>
                                <View style={[theme.flex1, { alignItems: 'center' }]}>
                                    <TouchableOpacity
                                        onPress={this.showAddKitchen}
                                        style={this.state.addKitchen ? [theme.badgeSelectedButton, { marginBottom: moderateVerticalScale(10) }] : [theme.badgeButton, { marginBottom: moderateVerticalScale(10) }]}
                                    >
                                        <Text style={this.state.addKitchen ? theme.badgeSelectedButtonText : theme.badgeButtonText}>{this.i18n.t('new')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={[theme.flex1, { alignItems: 'center' }]}>
                                    <TouchableOpacity
                                        onPress={this.hideAddKitchen}
                                        style={this.state.addKitchen ? [theme.badgeButton, { marginBottom: moderateVerticalScale(10) }] : [theme.badgeSelectedButton, { marginBottom: moderateVerticalScale(10) }]}
                                    >
                                        <Text style={this.state.addKitchen ? theme.badgeButtonText : theme.badgeSelectedButtonText}>{this.i18n.t('existing')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {this.state.addKitchen && <Card containerStyle={{
                            backgroundColor: theme.cardContainer.backgroundColor,
                            color: theme.whiteFont.color,
                            borderRadius: moderateScale(12),
                            borderWidth: 0
                        }}>
                            <View style={{
                                flex: 1
                            }}>
                                <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(5) }]} h6>{this.i18n.t('kitchenName')}</Text>
                                <TextInput
                                    placeholder={this.i18n.t('kitchenName')}
                                    placeholderTextColor={theme.inputPlaceholderColor.color}
                                    style={theme.inputBlack}
                                    value={this.state.kitchenName}
                                    onChangeText={(kitchenName) =>
                                        this.setKitchenName(kitchenName)
                                    }
                                    onBlur={() =>
                                        this.setFormError("")
                                    }
                                />
                                <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10) }]} h6>{this.i18n.t('yourKitchenInvitationCode')}</Text>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10), fontSize: moderateVerticalScale(60) }]}>{this.state.newKitchenInvitationCode}</Text>
                                </View>
                                {this.state.formError.length > 0 &&
                                    <Text style={theme.errorMessage}>{this.state.formError}</Text>
                                }
                                <TouchableOpacity
                                    onPress={this.addKitchen}
                                    style={this.dataChanged ?
                                        [theme.button, theme.bottomSheetConfirmContainer] :
                                        [theme.disabledButton, theme.bottomSheetConfirmContainer]}
                                >
                                    <Text style={theme.buttonText}>{this.i18n.t('confirm')}</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>}
                        {!this.state.addKitchen && <Card containerStyle={{
                            backgroundColor: theme.cardContainer.backgroundColor,
                            color: theme.whiteFont.color,
                            borderRadius: moderateScale(12),
                            borderWidth: 0
                        }}>
                            <View style={{
                                flex: 1
                            }}>
                                <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(5) }]} h6>{this.i18n.t('invitationCode')}</Text>
                                <TextInput
                                    placeholder={this.i18n.t('invitationCode')}
                                    placeholderTextColor={theme.inputPlaceholderColor.color}
                                    style={theme.inputBlack}
                                    value={this.state.invitationCode}
                                    onChangeText={(invitationCode) =>
                                        this.setInvitationCode(invitationCode)
                                    }
                                    onBlur={() =>
                                        this.setFormError("")
                                    }
                                />
                                <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10) }]} h6>{this.i18n.t('invitationCodeText')}</Text>
                                {this.state.formError.length > 0 &&
                                    <Text style={theme.errorMessage}>{this.state.formError}</Text>
                                }
                                <TouchableOpacity
                                    onPress={this.joinKitchen}
                                    style={this.dataChanged ?
                                        [theme.button, theme.bottomSheetConfirmContainer] :
                                        [theme.disabledButton, theme.bottomSheetConfirmContainer]}
                                >
                                    <Text style={theme.buttonText}>{this.i18n.t('confirm')}</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>}
                    </SafeAreaView>
                </ScrollView >
            </View >
        )
    }
}

const styles = ScaledSheet.create({
    image: {
        width: '90@ms',
        height: '90@ms',
        resizeMode: 'cover',
        borderRadius: '12@ms'
    }
});

const mapStateToProps = (store) => ({
    currentUser: store.userState.currentUser
})

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchUser }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(AddKitchenScreen);