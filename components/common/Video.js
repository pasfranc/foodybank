import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../css/theme';
import { getI18n } from '../../i18n/translationService';
import HeaderComponent from '../common/Header';
import { WebView } from 'react-native-webview';

export default function VideoScreen(props, { navigation }) {

    const videoUri = props.route.params.videoUri;
    const language = props.route.params?.language;
    const i18n = language ? getI18n(language) : getI18n();
    const place = null;

    useEffect(() => {

    }, [])

    return (
        <View style={[theme.flex1, theme.container]}>

            <HeaderComponent place={place} parentScreen="Add" navigation={props.navigation} currentUser={null} />

            <WebView
                style={styles.WebViewContainer}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                source={{ uri: videoUri }}
            />

        </View>
    );
}

const styles = StyleSheet.create({

    WebViewContainer: {

        marginTop: (Platform.OS == 'android') ? 20 : 0,

    }

});