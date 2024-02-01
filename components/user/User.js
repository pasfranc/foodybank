import React, { Component } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar, Icon } from 'react-native-elements';
import { moderateScale, moderateVerticalScale, ScaledSheet } from 'react-native-size-matters';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { theme } from '../../css/theme';
import { fetchUser } from '../../redux/actions/index';
import { getI18n } from '../../i18n/translationService';
import { Picker } from '@react-native-picker/picker';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { Card, Text } from 'react-native-elements';
import HeaderComponent from '../common/Header';
import translations from "../../i18n/translations.json";
import { showMessage } from "react-native-flash-message";

export class UserScreen extends Component {
    constructor(props) {
        super(props);

        this.language = this.props.currentUser?.language;
        this.i18n = this.language ? getI18n(this.props.currentUser.language) : getI18n();
        this.dataChanged = false;
        this.languages = [];

        for (let locale in translations) {
            this.languages.push({
                id: locale,
                text: translations[locale].key
            })
        }
        this.state = {
            selectedValue: this.props.currentUser?.language,
            showInput: true,
            firstName: this.props.currentUser.firstName,
            lastName: this.props.currentUser.lastName,
            phoneNumber: this.props.currentUser.phoneNumber,
            formError: '',
            insets: null

        }
    }

    componentDidMount() {
        this.props.fetchUser();
    }
    setSelectedValue = (value) => {
        this.setState({
            selectedValue: value,
            showInput: true
        })
        this.dataChanged = true;
    }
    hideInput = () => {
        this.setState({
            showInput: false
        })
    }

    setFirstName = (firstName) => {
        this.setState({
            firstName
        })
        if (firstName !== this.props.currentUser.firstName) {
            this.dataChanged = true;
        }
    }

    updateUser = () => {
        if (this.dataChanged) {
            if (this.validateFields()) {
                firebase.firestore().collection("users")
                    .doc(firebase.auth().currentUser.uid)
                    .update({
                        firstName: this.state.firstName,
                        lastName: this.state.lastName,
                        phoneNumber: this.state.phoneNumber,
                        language: this.state.selectedValue
                    })
                    .then((result) => {
                        showMessage({
                            message: this.i18n.get('userUpdatedWithSuccess'),
                            type: "success",
                            icon: { icon: "success", position: "left" },
                        });
                        this.props.navigation.navigate('Main', { screen: "Home", params: { newLanguage: this.state.selectedValue } });

                    })
            }
        }
    }

    logout = () => {
        firebase.auth().signOut()
            .then(() => {
                console.log('Logged out!');
                this.props.navigation.replace("Main");
            })
            .catch(error => setFormError(error.message))
    }

    setFormError = (formError) => {
        this.setState({
            formError
        });
    }

    validateFields = () => {
        if (!this.state.firstName) {
            this.setFormError(this.i18n.t('firstName') + this.i18n.t('error.mandatory'));
            return false;
        }
        if (!this.state.lastName) {
            this.setFormError(this.i18n.t('lastName') + this.i18n.t('error.mandatory'));
            return false;
        }
        if (!this.state.phoneNumber) {
            this.setFormError(this.i18n.t('phoneNumber') + this.i18n.t('error.mandatory'));
            return false;
        }
        return true;
    }

    setLastName = (lastName) => {
        this.setState({
            lastName
        })
        if (lastName !== this.props.currentUser.lastName) {
            this.dataChanged = true;
        }
    }

    setPhoneNumber = (text) => {
        this.setState({
            phoneNumber: text.replace(/[^+]?[^0-9]/g, ''),
        })
        if (text !== this.props.currentUser.phoneNumber) {
            this.dataChanged = true;
        }
    }

    render() {
        const { currentUser } = this.props;
        const fakeInputPadding = Platform.OS === 'ios' ? 0 : moderateVerticalScale(5);
        const place = this.i18n.t('userProfile');

        return (
            <View style={[theme.flex1, theme.container]}>
                <HeaderComponent place={place} parentScreen="User" navigation={this.props.navigation} currentUser={currentUser} />
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[theme.container]
                    }>
                    <Card containerStyle={{
                        marginTop: moderateScale(5),
                        backgroundColor: theme.cardContainer.backgroundColor,
                        color: theme.whiteFont.color,
                        borderRadius: moderateScale(12),
                        borderWidth: 0
                    }}>
                        <View style={{
                            flex: 1,
                            alignItems: 'center'
                        }}>
                            {!currentUser.profileImageUrl && <Avatar
                                size={moderateScale(150)}
                                rounded
                                icon={{ name: 'user', type: 'font-awesome', color: theme.container.backgroundColor }}
                                source={{ uri: 'https://' }} //added to remove ReactImageView: Image source "null" doesn't exist
                                onPress={() => this.props.navigation.push("Add", { language: this.language, imageType: 'userProfile' })}
                                activeOpacity={0.7}
                                avatarStyle={{ borderWidth: 0 }}
                                containerStyle={{ backgroundColor: 'white' }}
                            />}
                            {currentUser.profileImageUrl && <Avatar
                                size={moderateScale(150)}
                                rounded
                                source={{ uri: currentUser.profileImageUrl }}
                                onPress={() => this.props.navigation.push("Add", { language: this.language, imageType: 'userProfile' })}
                                activeOpacity={0.7}
                            />}
                        </View>
                        <View style={{
                            flex: 1,
                            marginTop: moderateVerticalScale(10)
                        }}>
                            <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10) }]} h6>{this.i18n.t('firstName')}</Text>
                            <TextInput
                                placeholder={this.i18n.t('firstName')}
                                placeholderTextColor={theme.inputPlaceholderColor.color}
                                autoCorrect={false}
                                autoComplete="off"
                                autoFocus={false}
                                style={theme.inputBlack}
                                value={this.state.firstName}
                                onChangeText={(firstName) =>
                                    this.setFirstName(firstName)
                                }
                                onBlur={() =>
                                    this.setFormError("")
                                }
                            />

                            <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10) }]} h6>{this.i18n.t('lastName')}</Text>
                            <TextInput
                                placeholder={this.i18n.t('lastName')}
                                placeholderTextColor={theme.inputPlaceholderColor.color}
                                autoCorrect={false}
                                autoComplete="off"
                                autoFocus={false}
                                style={theme.inputBlack}
                                value={this.state.lastName}
                                onChangeText={(lastName) =>
                                    this.setLastName(lastName)
                                }
                                onBlur={() =>
                                    this.setFormError("")
                                }
                            />

                            <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10) }]} h6>{this.i18n.t('phoneNumber')}</Text>
                            <TextInput
                                placeholder={this.i18n.t('phoneNumber')}
                                placeholderTextColor={theme.inputPlaceholderColor.color}
                                autoCorrect={false}
                                autoComplete="off"
                                autoFocus={false}
                                style={theme.inputBlack}
                                value={this.state.phoneNumber}
                                onChangeText={(phoneNumber) =>
                                    this.setPhoneNumber(phoneNumber)
                                }
                                onBlur={() =>
                                    this.setFormError("")
                                }
                            />

                            <Text style={[theme.whiteFont, { marginTop: moderateVerticalScale(10) }]} h6>{this.i18n.t('language')}</Text>
                            {this.state.showInput && this.languages && <TouchableOpacity
                                style={[theme.inputBlack, { flexDirection: 'row' }]}
                                onPress={this.hideInput}>
                                <Text style={{
                                    color: theme.whiteFont.color,
                                    flex: 6,
                                    padding: fakeInputPadding
                                }}>{this.languages.filter(language => language.id === this.state.selectedValue)[0]?.text}
                                </Text>
                                <Icon
                                    name='chevron-down'
                                    type='ionicon'
                                    color={theme.whiteFont.color}
                                    size={moderateScale(15)}
                                    style={{
                                        flex: 1,
                                        justifyContent: 'flex-end',
                                        padding: fakeInputPadding
                                    }}
                                />
                            </TouchableOpacity>
                            }
                            {!this.state.showInput && <Picker
                                selectedValue={this.state.selectedValue}
                                onValueChange={(itemValue, itemIndex) => this.setSelectedValue(itemValue)}
                                itemStyle={{
                                    color: theme.whiteFont.color
                                }}
                                color={theme.whiteFont.color}
                                mode='dropdown'
                                style={{
                                    backgroundColor: theme.inputBlack.backgroundColor,
                                    color: theme.inputPlaceholderColor.color,
                                    borderRadius: moderateScale(12),
                                    marginTop: moderateScale(10)
                                }}
                                dropdownIconColor={theme.inputPlaceholderColor.color}
                            >
                                {this.languages.map(language =>
                                    <Picker.Item key={language.id} label={language.text}
                                        value={language.id} />
                                )}
                            </Picker>
                            }
                            {this.state.formError.length > 0 &&
                                <Text style={theme.errorMessage}>{this.state.formError}</Text>
                            }
                            <TouchableOpacity
                                onPress={this.updateUser}
                                style={this.dataChanged ?
                                    [theme.button, theme.bottomSheetConfirmContainer] :
                                    [theme.disabledButton, theme.bottomSheetConfirmContainer]}
                            >
                                <Text style={theme.buttonText}>{this.i18n.t('confirm')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={this.logout}
                                style={
                                    [theme.button, theme.buttonOutline]}
                            >
                                <Text style={theme.buttonOutlineText}>{this.i18n.t('logout')}</Text>
                            </TouchableOpacity>
                        </View>


                    </Card>
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

export default connect(mapStateToProps, mapDispatchToProps)(UserScreen);