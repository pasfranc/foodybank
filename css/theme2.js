import { ScaledSheet } from 'react-native-size-matters';

export const theme = ScaledSheet.create({
    container: {
        justifyContent: 'center',
        backgroundColor: '#8DA464' //a1d588ff
    },
    buttonContainer: {
        width: '80%',
        justifyContent: 'center',
        alignItems: 'center'
    },
    whiteTitle: {
        color: 'white',
        fontWeight: '700'
    },
    whiteFont: {
        color: 'white'
    },
    orange: {
        backgroundColor: '#f68612ff'
    },
    greyFont: {
        color: '#333333'
    },
    button: {
        backgroundColor: '#6F7242', //0782F9
        width: '100%',
        padding: '10@s',
        borderRadius: '35@s',
        alignItems: 'center',
    },
    buttonNoPadding: {
        backgroundColor: '#0782F9',
        borderRadius: '12@ms',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        height: '55@mvs'
    },
    horizontalButton: {
        backgroundColor: '#0782F9',
        padding: '10@s',
        margin: '5@s',
        borderRadius: '35@s',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: '16@ms',
    },
    buttonOutline: {
        backgroundColor: 'white',
        marginTop: 5,
        borderColor: '#0782F9',
        borderWidth: 2,
    },
    buttonOutlineText: {
        color: '#0782F9',
        fontWeight: '700',
        fontSize: '16@ms',
    },
    flex1: {
        flex: 1
    },
    inputPlaceholderColor: {
        color: '#c1c1c1'
    },
    inputContainer: {
        width: '80%',
    },
    errorMessage: {
        backgroundColor: 'red',
        color: 'white',
        padding: 5,
        marginTop: '10@s',
        alignItems: 'center',
    },
    input: {
        backgroundColor: '#333333',
        padding: '10@ms',
        marginTop: '5@ms',
        color: 'white',
        borderRadius: '12@ms',
    },
    inputBlackKitchen: {
        backgroundColor: '#000000',
        color: 'white',
        borderRadius: '12@ms',
        padding: '5@mvs',
    },
    inputBlack: {
        backgroundColor: '#000000',
        padding: '10@ms',
        marginTop: '10@mvs',
        color: 'white',
        borderRadius: '12@ms',
    },
    inputTextArea: {
        height: '100@mvs',
        textAlignVertical: 'top'
    },
    bottomSheet: {
        backgroundColor: '#7F7F7F'
    },
    bottomSheetConfirmContainer: {
        marginTop: '20@mvs',
        marginBottom: '20@mvs'
    },
    cardContainer: {
        backgroundColor: '#A1D588'
    },
    cardIconTextContainer: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    cardTextContainer: {
        marginRight: '20@ms',
        flex: 1,
        flexDirection: 'column'
    },
    bottomSheetIconTextContainer: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    bottomSheetTextContainer: {
        marginLeft: '20@ms',
        flex: 1,
        flexDirection: 'column'
    },
    disabledButton: {
        backgroundColor: '#c1c1c1',
        width: '100%',
        padding: '10@s',
        borderRadius: '35@s',
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#FF4A4A',
        width: '100%',
        padding: '10@s',
        borderRadius: '35@s',
        alignItems: 'center',
    },
    badgeSelectedButton: {
        width: '120@s',
        backgroundColor: 'white',
        padding: '10@s',
        borderRadius: '35@s',
        alignItems: 'center',
    },
    badgeSelectedButtonText: {
        color: '#030303',
        fontWeight: '700',
        fontSize: '16@ms',
    },
    badgeButton: {
        width: '120@s',
        backgroundColor: '#1A1A1A',
        padding: '10@s',
        borderRadius: '35@s',
        alignItems: 'center',
        borderColor: '#4F4F4F',
        borderWidth: 1
    },
    badgeButtonText: {
        color: '#4F4F4F',
        fontWeight: '700',
        fontSize: '16@ms',
    },
    smallBadgeSelectedButton: {
        width: '70@s',
        backgroundColor: 'white',
        paddingTop: '10@s',
        paddingBottom: '10@s',
        borderRadius: '35@s',
        alignItems: 'center',
    },
    smallBadgeSelectedButtonText: {
        color: '#030303',
        fontWeight: '700',
        fontSize: '12@ms',
    },
    smallBadgeButton: {
        width: '70@s',
        paddingTop: '10@s',
        paddingBottom: '10@s',
        backgroundColor: '#1A1A1A',
        borderRadius: '35@s',
        alignItems: 'center',
        borderColor: '#4F4F4F',
        borderWidth: 1
    },
    smallBadgeButtonText: {
        color: '#4F4F4F',
        fontWeight: '700',
        fontSize: '12@ms',
    },
})