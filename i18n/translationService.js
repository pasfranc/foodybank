import * as Localization from 'expo-localization'
import { I18n } from "i18n-js"
import translations from "./translations.json"

export function getI18n(langCode) {
    let i18n = new I18n(translations);

    const locale = langCode ? langCode : Localization.locale;

    i18n.locale = locale;
    i18n.enableFallback = true;
    return i18n;
} 