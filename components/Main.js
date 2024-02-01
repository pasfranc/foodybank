import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import React, { Component } from 'react';
import { Keyboard, Platform, TextInput, TouchableOpacity, View } from 'react-native';
import { BottomSheet, Card, Icon, Text } from 'react-native-elements';
import { showMessage } from "react-native-flash-message";
import { moderateScale } from 'react-native-size-matters';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { theme } from '../css/theme';
import { getI18n } from '../i18n/translationService';
import { fetchUser, fetchUserPosts } from '../redux/actions';
import HomeScreen from './main/Home';
import KitchenScreen from './main/Kitchen';
import ShoppingListScreen from './main/ShoppingList';

const EmptyScreen = () => {
    return (null);
}
const Tab = createBottomTabNavigator();

export class MainScreen extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isBottomSheetVisible: false,
            feedback: null,
            feedbackPreviousScreen: '',
            keyboardHeight: 0
        }
        const language = this.props.route?.params?.params?.newLanguage ? this.props.route?.params?.params?.newLanguage : this.props?.currentUser?.language;
        this.i18n = language ? getI18n(language) : getI18n();
        this.kitchenId = this.props.route?.params?.params?.kitchenId;
        this.filter = this.props.route?.params?.params?.filter;
        this.alreadyLoaded = '';
        this.inputRef = null;
        this.isAndroid = Platform.OS === 'android' ? true : false;

        this.screens = {
            0: "Home",
            1: "Kitchen",
            2: "ShoppingList"
        }
    }

    componentDidMount() {
        this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
        this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
        this.props.fetchUser();
    }

    componentWillUnmount() {
        this.keyboardDidShowListener.remove();
        this.keyboardDidHideListener.remove();
    }

    _keyboardDidShow = (e) => {
        if (Platform.OS === 'ios') {
            this.setState({
                keyboardHeight: e.endCoordinates.height
            })
        }
    }

    _keyboardDidHide = () => {
        if (Platform.OS === 'ios') {
            this.setState({
                keyboardHeight: 0
            })
        }
    }

    showBottomSheet = () => {
        this.setState({
            isBottomSheetVisible: true
        });
    }

    hideBottomSheet = () => {
        this.setState({
            isBottomSheetVisible: false
        });
    }

    saveFeedback = () => {
        if (this.state.feedback) {
            firebase.firestore()
                .collection("feedbacks")
                .add({
                    UIDUser: firebase.auth().currentUser.uid,
                    creationDate: new Date().getTime(),
                    screen: this.state.feedbackPreviousScreen,
                    feedback: this.state.feedback
                }).then(() => {
                    showMessage({
                        message: this.i18n.get('addedFeedbackWithSuccess'),
                        type: "success",
                        icon: { icon: "success", position: "left" },
                    });
                })
        }
        this.setState({
            feedback: null
        });
        this.hideBottomSheet()
    }

    setFeedback = (text) => {
        this.setState({
            feedback: text
        });
    }

    render() {
        return (
            <View
                style={[theme.container, theme.flex1]}
            >

                <Tab.Navigator
                    initialRouteName="Home"
                    screenOptions={{
                        headerShown: false,
                        tabBarActiveTintColor: theme.whiteFont.color,
                        tabBarStyle: {
                            backgroundColor: theme.container.backgroundColor,
                            borderTopWidth: 0
                        },
                        tabBarHideOnKeyboard: true
                    }}

                >
                    <Tab.Screen
                        //focus={(state) => { console.log(state) }}
                        name="Home"
                        component={HomeScreen}
                        options={{
                            unmountOnBlur: true,
                            tabBarLabel: this.i18n.t('homeTab'),
                            tabBarIcon: ({ color }) => (
                                <MaterialCommunityIcons name="home" color={color} size={26} />
                            ),
                        }}
                    />
                    <Tab.Screen
                        name="Kitchen"
                        children={() => <KitchenScreen kitchenId={this.kitchenId} filter={this.filter} navigation={this.props.navigation} />}
                        options={{
                            unmountOnBlur: true,
                            tabBarLabel: this.i18n.t('kitchenTab'),
                            tabBarIcon: ({ color, size }) => (
                                <MaterialCommunityIcons name="fridge" color={color} size={26} />
                            ),
                        }}
                    />
                    <Tab.Screen
                        name="ShoppingList"
                        children={() =>
                            <ShoppingListScreen kitchenId={this.kitchenId} filter={this.filter} navigation={this.props.navigation} />
                        }
                        options={{
                            unmountOnBlur: true,
                            tabBarLabel: this.i18n.t('shoppingListTab'),
                            tabBarIcon: ({ color, size }) => (
                                <MaterialCommunityIcons name="store-edit" color={color} size={26} />
                            ),
                        }}
                    />
                    <Tab.Screen
                        name="Feedback"
                        component={EmptyScreen}
                        options={{
                            tabBarLabel: this.i18n.t('feedbackTab'),
                            tabBarIcon: ({ color, size }) => (
                                <MaterialCommunityIcons name="comment-quote" color={color} size={26} />
                            ),
                        }}
                        listeners={({ navigation }) => ({
                            tabPress: event => {
                                event.preventDefault();
                                const previousScreen = this.screens[navigation.getState().index];
                                this.setState({ feedbackPreviousScreen: previousScreen });
                                this.showBottomSheet();
                            }
                        })}
                    />
                </Tab.Navigator>
                <BottomSheet
                    containerStyle={{ marginBottom: this.state.keyboardHeight }}
                    modalProps={{}}
                    onBackdropPress={() => this.hideBottomSheet()}
                    isVisible={this.state.isBottomSheetVisible}
                >
                    <Card containerStyle={{
                        marginBottom: moderateScale(15),
                        backgroundColor: theme.bottomSheet.backgroundColor,
                        color: theme.whiteFont.color
                    }}>
                        <View style={theme.bottomSheetIconTextContainer}>
                            <Icon
                                name='comment-quote'
                                type='material-community'
                                color={theme.whiteFont.color}
                                size={moderateScale(50)}
                                iconStyle={{ padding: moderateScale(10) }}
                                backgroundColor={theme.button.backgroundColor}
                            />
                            <View style={theme.bottomSheetTextContainer}>
                                <Text style={theme.whiteTitle} h3>{this.i18n.t('feedbackTab')}</Text>
                                <Text style={theme.whiteFont} h4>{this.i18n.t('feedbackAskingTitle')}</Text>
                            </View>
                        </View>
                        <Card.Divider />

                        <TextInput
                            placeholder={this.i18n.t('yourFeedback')}
                            placeholderTextColor={theme.inputPlaceholderColor.color}
                            style={[theme.input, theme.inputTextArea]}
                            multiline={true}
                            numberOfLines={4}
                            ref={ref => {
                                this.inputRef = ref
                            }}
                            autoFocus
                            onChangeText={text =>
                                this.setFeedback(text)
                            }
                            value={this.state.feedback}
                        />


                        <TouchableOpacity
                            style={[theme.button, theme.bottomSheetConfirmContainer]}
                            onPress={() => this.saveFeedback()}
                        >
                            <Text style={theme.buttonText}>{this.i18n.t('confirm')}</Text>
                        </TouchableOpacity>
                    </Card>
                </BottomSheet>
            </View>
        )
    }
}

const mapStateToProps = (store) => ({
    currentUser: store.userState.currentUser
})
const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchUser, fetchUserPosts }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(MainScreen);