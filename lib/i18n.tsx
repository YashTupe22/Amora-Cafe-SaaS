'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ─── Translation strings ──────────────────────────────────────────────────────

const translations = {
  en: {
    'nav.mainMenu':          'Main Menu',
    'nav.dashboard':         'Dashboard',
    'nav.attendance':        'Attendance',
    'nav.invoices':          'Invoices',
    'nav.bills':             'Bills',
    'nav.catalogue':         'Catalogue',
    'nav.transactions':      'Transactions',
    'nav.inventory':         'Inventory',
    'nav.expenses':          'Expenses',
    'nav.settings':          'Settings',
    'nav.logout':            'Logout',
    'common.save':           'Save Changes',
    'common.cancel':         'Cancel',
    'common.search':         'Search…',
    'common.add':            'Add',
    'common.edit':           'Edit',
    'common.delete':         'Delete',
    'common.export':         'Export',
    'settings.preferences':  'Preferences',
    'settings.language':     'Language',
    'settings.langSub':      'App display language',
    'settings.currency':     'Currency',
    'settings.currencySub':  'Choose your regional currency',
    'settings.darkMode':     'Dark Mode',
    'settings.darkModeSub':  'Toggle light / dark interface',
    'settings.emailNotif':   'Email Notifications',
    'settings.emailNotifSub':'Receive invoice and payment alerts',
    'settings.twoFactor':    'Two-Factor Auth',
    'settings.twoFactorSub': 'Require code on login',
    'settings.saved':        'Saved locally.',
    'settings.reset':        'Reset to defaults.',
  },
  hi: {
    'nav.mainMenu':          'मुख्य मेनू',
    'nav.dashboard':         'डैशबोर्ड',
    'nav.attendance':        'उपस्थिति',
    'nav.invoices':          'चालान',
    'nav.bills':             'बिल',
    'nav.catalogue':         'मेनू सूची',
    'nav.transactions':      'लेनदेन',
    'nav.inventory':         'इन्वेंटरी',
    'nav.expenses':          'खर्च',
    'nav.settings':          'सेटिंग्स',
    'nav.logout':            'लॉग आउट',
    'common.save':           'परिवर्तन सहेजें',
    'common.cancel':         'रद्द करें',
    'common.search':         'खोजें…',
    'common.add':            'जोड़ें',
    'common.edit':           'संपादित करें',
    'common.delete':         'हटाएं',
    'common.export':         'निर्यात करें',
    'settings.preferences':  'प्राथमिकताएं',
    'settings.language':     'भाषा',
    'settings.langSub':      'ऐप प्रदर्शन भाषा',
    'settings.currency':     'मुद्रा',
    'settings.currencySub':  'अपनी क्षेत्रीय मुद्रा चुनें',
    'settings.darkMode':     'डार्क मोड',
    'settings.darkModeSub':  'लाइट / डार्क इंटरफेस टॉगल करें',
    'settings.emailNotif':   'ईमेल सूचनाएं',
    'settings.emailNotifSub':'चालान और भुगतान अलर्ट प्राप्त करें',
    'settings.twoFactor':    'दो-कारक प्रमाणीकरण',
    'settings.twoFactorSub': 'लॉगिन पर कोड आवश्यक करें',
    'settings.saved':        'स्थानीय रूप से सहेजा गया।',
    'settings.reset':        'डिफ़ॉल्ट पर रीसेट करें।',
  },
  mr: {
    'nav.mainMenu':          'मुख्य मेनू',
    'nav.dashboard':         'डॅशबोर्ड',
    'nav.attendance':        'उपस्थिती',
    'nav.invoices':          'चलन',
    'nav.bills':             'बिल',
    'nav.catalogue':         'मेनू यादी',
    'nav.transactions':      'व्यवहार',
    'nav.inventory':         'यादी',
    'nav.expenses':          'खर्च',
    'nav.settings':          'सेटिंग्ज',
    'nav.logout':            'लॉग आउट',
    'common.save':           'बदल जतन करा',
    'common.cancel':         'रद्द करा',
    'common.search':         'शोधा…',
    'common.add':            'जोडा',
    'common.edit':           'संपादित करा',
    'common.delete':         'हटवा',
    'common.export':         'निर्यात करा',
    'settings.preferences':  'प्राधान्ये',
    'settings.language':     'भाषा',
    'settings.langSub':      'अॅप प्रदर्शन भाषा',
    'settings.currency':     'चलन',
    'settings.currencySub':  'आपले प्रादेशिक चलन निवडा',
    'settings.darkMode':     'डार्क मोड',
    'settings.darkModeSub':  'लाइट / डार्क इंटरफेस टॉगल करा',
    'settings.emailNotif':   'ईमेल सूचना',
    'settings.emailNotifSub':'चलन आणि पेमेंट अलर्ट मिळवा',
    'settings.twoFactor':    'द्वि-घटक प्रमाणीकरण',
    'settings.twoFactorSub': 'लॉगिनवर कोड आवश्यक करा',
    'settings.saved':        'स्थानिक पातळीवर जतन केले.',
    'settings.reset':        'डीफॉल्टवर रीसेट करा.',
  },
  gu: {
    'nav.mainMenu':          'મુખ્ય મેનૂ',
    'nav.dashboard':         'ડેશબોર્ડ',
    'nav.attendance':        'હાજરી',
    'nav.invoices':          'ઇન્વૉઇસ',
    'nav.bills':             'બિલ',
    'nav.catalogue':         'મેનૂ સૂચિ',
    'nav.transactions':      'વ્યવહારો',
    'nav.inventory':         'ઇન્વેન્ટરી',
    'nav.expenses':          'ખર્ચ',
    'nav.settings':          'સેટિંગ્સ',
    'nav.logout':            'લૉગ આઉટ',
    'common.save':           'ફેરફારો સાચવો',
    'common.cancel':         'રદ કરો',
    'common.search':         'શોધો…',
    'common.add':            'ઉમેરો',
    'common.edit':           'સંપાદિત કરો',
    'common.delete':         'કાઢી નાખો',
    'common.export':         'નિકાસ કરો',
    'settings.preferences':  'પ્રાધાન્યતાઓ',
    'settings.language':     'ભાષા',
    'settings.langSub':      'એપ ડિસ્પ્લે ભાષા',
    'settings.currency':     'ચલણ',
    'settings.currencySub':  'તમારું પ્રાદેશિક ચલણ પસંદ કરો',
    'settings.darkMode':     'ડાર્ક મોડ',
    'settings.darkModeSub':  'લાઇટ / ડાર્ક ઇન્ટરફેસ ટૉગલ કરો',
    'settings.emailNotif':   'ઇમેઇલ સૂચનાઓ',
    'settings.emailNotifSub':'ઇન્વૉઇસ અને ચૂકવણી ચેતવણીઓ મેળવો',
    'settings.twoFactor':    'દ્વિ-પ્રમાણ ચકાસણી',
    'settings.twoFactorSub': 'લૉગિન પર કોડ જરૂરી કરો',
    'settings.saved':        'સ્થાનિક રૂપે સાચવ્યું.',
    'settings.reset':        'ડિફૉલ્ટ પર રીસેટ કરો.',
  },
  ta: {
    'nav.mainMenu':          'முக்கிய மெனு',
    'nav.dashboard':         'டாஷ்போர்டு',
    'nav.attendance':        'வருகை',
    'nav.invoices':          'விலைப்பட்டியல்',
    'nav.bills':             'பில்',
    'nav.catalogue':         'மெனு பட்டியல்',
    'nav.transactions':      'பரிவர்த்தனைகள்',
    'nav.inventory':         'சரக்கு',
    'nav.expenses':          'செலவுகள்',
    'nav.settings':          'அமைப்புகள்',
    'nav.logout':            'வெளியேறு',
    'common.save':           'மாற்றங்களை சேமி',
    'common.cancel':         'ரத்து செய்',
    'common.search':         'தேடு…',
    'common.add':            'சேர்',
    'common.edit':           'திருத்து',
    'common.delete':         'நீக்கு',
    'common.export':         'ஏற்றுமதி',
    'settings.preferences':  'விருப்பத்தேர்வுகள்',
    'settings.language':     'மொழி',
    'settings.langSub':      'பயன்பாட்டு காட்சி மொழி',
    'settings.currency':     'நாணயம்',
    'settings.currencySub':  'உங்கள் பிராந்திய நாணயத்தை தேர்ந்தெடுக்கவும்',
    'settings.darkMode':     'இருண்ட முறை',
    'settings.darkModeSub':  'ஒளி / இருண்ட இடைமுகம் மாற்றவும்',
    'settings.emailNotif':   'மின்னஞ்சல் அறிவிப்புகள்',
    'settings.emailNotifSub':'விலைப்பட்டியல் மற்றும் கட்டண விழிப்புணர்வுகளை பெறவும்',
    'settings.twoFactor':    'இரு-காரணி சரிபார்ப்பு',
    'settings.twoFactorSub': 'உள்நுழைவில் குறியீடு தேவை',
    'settings.saved':        'உள்ளூரில் சேமிக்கப்பட்டது.',
    'settings.reset':        'இயல்புநிலைக்கு மீட்டமைக்கவும்.',
  },
} as const;

export type Lang = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

// ─── Context ──────────────────────────────────────────────────────────────────

interface LangContextValue {
  lang: Lang;
  t: (key: TranslationKey) => string;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('synplix-language');
      if (stored && stored in translations) return stored as Lang;
    }
    return 'en';
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('synplix-language', newLang);
    }
  }, []);

  // Sync across tabs via storage events
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'synplix-language' && e.newValue && e.newValue in translations) {
        setLangState(e.newValue as Lang);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string =>
      (translations[lang] as Record<string, string>)[key] ??
      (translations.en as Record<string, string>)[key] ??
      key,
    [lang],
  );

  return <LangContext.Provider value={{ lang, t, setLang }}>{children}</LangContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTranslation() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useTranslation must be used inside LanguageProvider');
  return ctx;
}
