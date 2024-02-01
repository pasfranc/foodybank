
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import React, { Component } from 'react';
import { ScrollView, Share, TextInput, TouchableOpacity, View } from 'react-native';
import { Card, Header, Icon, Text } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import { moderateScale, moderateVerticalScale, ScaledSheet } from 'react-native-size-matters';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { theme } from '../../../css/theme';
import { getI18n } from '../../../i18n/translationService';
import { fetchUser } from '../../../redux/actions/index';
import { showMessage } from "react-native-flash-message";

export class EditKitchenScreen extends Component {
    constructor(props) {
        super(props);

        this.i18n = this.props.currentUser?.language ? getI18n(this.props.currentUser.language) : getI18n();
        this.dataChanged = false;
        this.state = {
            kitchenName: '',
            invitationCode: '',
            formError: '',
            editedKitchen: {},
            UIDKitchen: this.props.route.params
        }

        firebase.firestore()
            .collection("kitchens")
            .doc(this.state.UIDKitchen)
            .get()
            .then((kitchen) => {
                const existingKitchen = kitchen.data()
                this.state.editedKitchen = existingKitchen;
                this.state.kitchenName = existingKitchen.name;
                this.state.invitationCode = existingKitchen.invitationCode;
            })

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

    shareKitchen = async () => {
        await Share.share({
            message: this.i18n.get("shareKitchenText") + ' ' + this.state.invitationCode
        });
    }

    updateKitchen = async () => {
        if (this.dataChanged) {
            if (await this.validateUpdateKitchen()) {
                firebase.firestore().collection("kitchens")
                    .doc(this.state.UIDKitchen)
                    .update({
                        name: this.state.kitchenName
                    })
                    .then((result) => {
                        showMessage({
                            message: this.i18n.get('editedKitchenWithSuccess'),
                            type: "success",
                            icon: { icon: "success", position: "left" },
                        });
                        this.props.navigation.replace("Main")
                    })
            }
        }
    }

    //Vanno cancellati i riferimenti degli altri user che hanno joinato
    deleteKitchen = () => {
        firebase.firestore().collection("kitchens")
            .doc(this.state.UIDKitchen)
            .get()
            .then((kitchen) => {
                const existingKithen = kitchen.data();
                const users = existingKithen.users;
                firebase.firestore().collection("kitchens")
                    .doc(this.state.UIDKitchen)
                    .delete()
                    .then(() => {
                        firebase.firestore()
                            .collection("joinCodes")
                            .doc(this.state.invitationCode)
                            .delete()
                            .then(() => {
                                users.forEach(async (user) => {
                                    const waitme = await firebase.firestore().collection("users")
                                        .doc(user)
                                        .get()
                                        .then((thisUser) => {
                                            const userData = thisUser.data();
                                            let kitchens = userData.kitchens ? userData.kitchens : [];
                                            kitchens = kitchens.filter((kitchen) => kitchen.UIDKitchen != this.state.UIDKitchen);
                                            firebase.firestore().collection("users")
                                                .doc(user)
                                                .update({
                                                    kitchens
                                                }).then(() => {
                                                    showMessage({
                                                        message: this.i18n.get('removedKitchenWithSuccess'),
                                                        type: "success",
                                                        icon: { icon: "success", position: "left" },
                                                    });
                                                    this.props.navigation.replace("Main")
                                                })

                                        })

                                })
                            })
                    })
            })
    }

    setFormError = (formError) => {
        this.setState({
            formError
        });
    }

    validateUpdateKitchen = async () => {
        if (!this.state.kitchenName) {
            this.setFormError(this.i18n.t('kitchenName') + this.i18n.t('error.mandatory'));
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
    }

    render() {
        const { currentUser } = this.props;
        const fakeInputPadding = Platform.OS === 'ios' ? 0 : moderateVerticalScale(5);
        this.i18n = this.props.currentUser?.language ? getI18n(this.props.currentUser.language) : getI18n();
        const place = this.i18n.t('editKitchen')

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
                            onPress={() => this.props.navigation.replace("Main")}
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
                        <Card containerStyle={{
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
                                <View style={{ flexDirection: 'row', alignContent: 'center' }}>
                                    <View style={{ flex: 3, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10), fontSize: moderateVerticalScale(60) }]}>{this.state.invitationCode}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => { this.shareKitchen() }}
                                        style={{ flex: 1, justifyContent: 'center', marginTop: moderateVerticalScale(10), }}
                                    >
                                        <Icon
                                            center
                                            name='share-variant'
                                            type='material-community'
                                            color={theme.whiteFont.color}
                                            backgroundColor={theme.button.backgroundColor}
                                            size={moderateScale(35)}
                                            style={{
                                                borderRadius: moderateScale(12),
                                                padding: moderateScale(7),
                                                width: moderateScale(50),
                                                height: moderateScale(50)
                                            }}
                                        />
                                    </TouchableOpacity>
                                </View>
                                {this.state.formError.length > 0 &&
                                    <Text style={theme.errorMessage}>{this.state.formError}</Text>
                                }
                                <TouchableOpacity
                                    onPress={this.updateKitchen}
                                    style={this.dataChanged ?
                                        [theme.button, theme.bottomSheetConfirmContainer] :
                                        [theme.disabledButton, theme.bottomSheetConfirmContainer]}
                                >
                                    <Text style={theme.buttonText}>{this.i18n.t('confirm')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={this.deleteKitchen}
                                    style={[theme.deleteButton]}
                                >
                                    <Text style={theme.buttonText}>{this.i18n.t('deleteKitchen')}</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
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

export default connect(mapStateToProps, mapDispatchToProps)(EditKitchenScreen);