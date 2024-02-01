import 'expo-dev-client';
import { StyleSheet, View, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import LandingScreen from './components/landing/Landing';
import LoginScreen from './components/auth/Login';
import RegisterScreen from './components/auth/Register';
import MainScreen from './components/Main'
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import firebase from 'firebase/compat/app';
import React, { Component } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import rootReducer from './redux/reducers';
import thunk from 'redux-thunk';
import AddScreen from './components/main/Add';
import SaveScreen from './components/main/Save';
import UserScreen from './components/user/User';
import HomeScreen from './components/main/Home';

import VideoScreen from './components/common/Video';

import AchievementScreen from './components/main/Achievement';
import NotificationScreen from './components/main/Notification';
import AddKitchenScreen from './components/main/kitchen/AddKitchen';
import EditKitchenScreen from './components/main/kitchen/EditKitchen';
import ScanProductScreen from './components/main/kitchen/ScanProduct';
import { theme } from './css/theme';
import FlashMessage from "react-native-flash-message";
import { initializeAuth } from 'firebase/auth';
import { getReactNativePersistence } from 'firebase/auth/react-native';
import VerifyScreen from './components/auth/Verify';
import firebaseConfig from './config';

let fireApp = null;
if (firebase.apps.length === 0) {
  fireApp = firebase.initializeApp(firebaseConfig)
}

initializeAuth(fireApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const TransitionScreenOptions = {
  ...TransitionPresets.SlideFromRightIOS, // This is where the transition happens
};

const Stack = createStackNavigator();

const store = createStore(rootReducer, applyMiddleware(thunk));

export class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false
    }
  }

  async retrieveUserStorage() {
    let userStorage = null
    try {
      userStorage = await AsyncStorage.getItem('@landingVisited')
    } catch (error) {
      console.error(error);
    }
    return userStorage;
  }

  async componentDidMount() {
    const alreadyVisited = await this.retrieveUserStorage();

    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        this.setState({
          loggedIn: false,
          loaded: true,
          initialPage: alreadyVisited ? 'Login' : 'Landing'
        });
      } else {
        if (user) {
          if (user.emailVerified) {
            this.setState({
              loggedIn: true,
              loaded: true,
              initialPage: alreadyVisited ? 'Main' : 'Landing'
            });
          } else {
            this.setState({
              loggedIn: true,
              loaded: true,
              initialPage: alreadyVisited ? 'Verify' : 'Landing'
            });
          }
        }

      }
    })

  }

  render() {
    const { loggedIn, loaded } = this.state;

    if (!loaded) {
      return (
        <View style={[theme.flex1, theme.container]}>
          <View style={{ alignItems: 'center' }}>
            <Image
              style={theme.imageLogoSplash}
              source={require('./assets/minilogo.png')}
            />
          </View>
        </View>
      )
    }

    if (!loggedIn) {
      return (
        <NavigationContainer>
          <Stack.Navigator initialRouteName={this.state.initialPage} screenOptions={TransitionScreenOptions}>
            <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Verify" component={VerifyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
          </Stack.Navigator>
          <FlashMessage position="top" />
        </NavigationContainer>
      )
    }

    return (
      <Provider store={store}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName={this.state.initialPage} screenOptions={TransitionScreenOptions}>
            <Stack.Screen name="Verify" component={VerifyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Add" component={AddScreen} options={{ headerShown: false }} navigation={this.props.navigation} />
            <Stack.Screen name="Home" component={HomeScreen} navigation={this.props.navigation} options={{
              headerShown: false
            }} />
            <Stack.Screen name="User" component={UserScreen} navigation={this.props.navigation} options={{ headerShown: false }} />
            <Stack.Screen name="Save" component={SaveScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AddKitchen" component={AddKitchenScreen} navigation={this.props.navigation} options={{ headerShown: false }} />
            <Stack.Screen name="EditKitchen" component={EditKitchenScreen} navigation={this.props.navigation} options={{ headerShown: false }} />
            <Stack.Screen name="ScanProduct" component={ScanProductScreen} navigation={this.props.navigation} options={{ headerShown: false }} />
            <Stack.Screen name="Notification" component={NotificationScreen} navigation={this.props.navigation} options={{ headerShown: false }} />
            <Stack.Screen name="Achievement" component={AchievementScreen} navigation={this.props.navigation} options={{ headerShown: false }} />
            <Stack.Screen name="Video" component={VideoScreen} options={{ headerShown: false }} navigation={this.props.navigation} />
          </Stack.Navigator>
        </NavigationContainer>
        <FlashMessage position="top" />
      </Provider>
    )
  }
}

export default App

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
