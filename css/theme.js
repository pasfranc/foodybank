import { ScaledSheet } from 'react-native-size-matters';

export const theme = ScaledSheet.create({
    container: {
        justifyContent: 'center',
        backgroundColor: '#1A1A1A'
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
    goldTitle: {
        color: '#FFD700',
        fontWeight: '700'
    },
    whiteFont: {
        color: 'white'
    },
    orange: {
        backgroundColor: '#FFAB1E'
    },
    greyFont: {
        color: '#C1C1C1'
    },
    kitchen: {
        backgroundColor: '#5FD8FF',
        color: '#000E9C'
    },
    shoppingList: {
        color: '#f68612ff',
        backgroundColor: '#FFAB1E'
    },
    button: {
        backgroundColor: '#0782F9',
        width: '100%',
        padding: '10@s',
        borderRadius: '12@s',
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#09B36A',
        width: '100%',
        padding: '10@s',
        borderRadius: '12@s',
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
        borderRadius: '12@s',
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
    inputSearch: {
        backgroundColor: '#000000',
        padding: '10@ms',
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
        backgroundColor: '#333333'
    },
    cardIconTextContainer: {
        flexDirection: 'row'
    },
    cardTextContainer: {
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
        borderRadius: '12@s',
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#FF4A4A',
        width: '100%',
        padding: '10@s',
        borderRadius: '12@s',
        alignItems: 'center',
    },
    badgeSelectedButton: {
        width: '120@s',
        backgroundColor: 'white',
        padding: '10@s',
        borderRadius: '12@s',
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
        borderRadius: '12@s',
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
        width: '77@s',
        backgroundColor: 'white',
        paddingTop: '10@s',
        paddingBottom: '10@s',
        borderRadius: '12@s',
        alignItems: 'center',
    },
    smallBadgeSelectedButtonText: {
        color: '#030303',
        fontWeight: '700',
        fontSize: '12@ms',
    },
    smallBadgeButton: {
        width: '77@s',
        paddingTop: '10@s',
        paddingBottom: '10@s',
        backgroundColor: '#1A1A1A',
        borderRadius: '12@s',
        alignItems: 'center',
        borderColor: '#4F4F4F',
        borderWidth: 1
    },
    smallBadgeButtonText: {
        color: '#4F4F4F',
        fontWeight: '700',
        fontSize: '12@ms',
    },
    expirationDateButton: {
        alignItems: 'center',
        backgroundColor: '#0782F9',
        borderRadius: '5@ms',
        height: '20@mvs'
    },
    expirationDateUnselectedBox: {
        alignItems: 'center',
        backgroundColor: '#000',
        borderRadius: '5@ms',
        height: '26@mvs',
        justifyContent: 'center'
    },
    expirationDateSelectedBox: {
        alignItems: 'center',
        backgroundColor: '#09B36A',
        borderRadius: '5@ms',
        height: '26@mvs',
        justifyContent: 'center'
    },
    title: {
        width: '180@ms',
        height: '30@mvs',
    },
    closed: {
        color: '#000',
        backgroundColor: '#FFF'
    },
    open: {
        color: '#000',
        backgroundColor: '#f68612ff'
    },
    frozen: {
        color: '#000',
        backgroundColor: '#5FD8FF'
    },
    expired: {
        backgroundColor: 'red'
    },
    inTheCart: {
        color: '#000',
        backgroundColor: '#09B36A'
    },
    toBuy: {
        color: '#000',
        backgroundColor: '#FFF'
    },
    leftText: {
        flex: 1,
        alignItems: 'flex-start'
    },
    rightText: {
        flex: 1,
        alignItems: 'flex-end'
    },
    goodExpire: {
        color: '#08FB1D'
    },
    badExpire: {
        color: 'red'
    },
    image: {
        width: '45@ms',
        height: '45@ms',
        resizeMode: 'cover',
        borderRadius: '12@ms'
    },
    boxText: {
        flex: 1,
        justifyContent: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    titleText: {
        textAlign: 'center',
        fontWeight: 'bold',
        color: 'white'
    },
    barCodeContainer: {
        flex: 1,
        flexDirection: 'column'
    },
    imageLogo: {
        width: '350@ms',
        height: '350@ms'
    },
    imageLogoSplash: {
        width: '200@ms',
        height: '200@ms',
        resizeMode: 'cover',
        alignContent: 'center'
    },
    logo: {
        flex: 2,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loginContent: {
        flex: 3,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loginButtonContainer: {
        marginTop: '40@mvs'
    },
    logoGreen: {
        backgroundColor: '#59b42dff'
    }
})