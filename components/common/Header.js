import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-elements';
import { moderateScale } from 'react-native-size-matters';
import { theme } from '../../css/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HeaderComponent(props, { navigation }) {

    const insets = useSafeAreaInsets();

    return (
        <View style={{
            marginTop: insets.top,
            marginBottom: 0,
            marginLeft: insets.left,
            marginRight: insets.right
        }}>
            <View style={[{
                flexDirection: 'row',
                alignItems: 'center',
                height: moderateScale(60),
                backgroundColor: theme.container.backgroundColor
            }
            ]}>
                <TouchableOpacity style={[theme.flex1, { alignItems: 'flex-start', marginLeft: moderateScale(10) }]}>
                    {
                        <TouchableOpacity
                            onPress={() => props.navigation.goBack()}
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
                    {props.place ?
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[theme.whiteFont, { fontWeight: '700' }]} h4>{props.place}</Text>
                            <Text style={theme.whiteFont} h6>{props.subPlace}</Text>
                        </View>
                        :
                        <View></View>
                    }
                </View>
                <View style={[theme.flex1, { alignItems: 'flex-end', marginRight: moderateScale(10) }]}>
                </View>
            </View>
        </View>
    )

}