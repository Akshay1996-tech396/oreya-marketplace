import ISO6391 from "iso-639-1";
import currencyCodes from "currency-codes";

type CurrencyRecord = {
  code: string;
  number: string;
  digits: number;
  currency: string;
  countries: string[];
};

const rtlLanguageCodes = new Set(["ar", "fa", "he", "ur"]);

const currencySymbols: Record<string, string> = {
  INR: "₹",
  USD: "$",
  AED: "د.إ",
  JPY: "¥",
  EUR: "€",
  GBP: "£",
};

const currencyExchangeRates: Record<string, string> = {
  INR: "1",
  USD: "0.012",
  AED: "0.044",
  JPY: "1.86",
  EUR: "0.011",
  GBP: "0.0095",
};

export const adminLanguageColumns = [
  { key: "id", label: "Language ID" },
  { key: "name", label: "Language" },
  { key: "nativeName", label: "Native Name" },
  { key: "code", label: "Code" },
  { key: "direction", label: "Direction" },
  { key: "default", label: "Default" },
  { key: "status", label: "Status" },
];

export const adminCurrencyColumns = [
  { key: "id", label: "Currency ID" },
  { key: "name", label: "Currency" },
  { key: "code", label: "Code" },
  { key: "symbol", label: "Symbol" },
  { key: "exchangeRate", label: "Exchange Rate" },
  { key: "default", label: "Default" },
  { key: "status", label: "Status" },
];

// Admin selected/enabled languages.
// Later this will come from PostgreSQL.
const enabledLanguageCodes = ["en", "hi", "ar"];

export const adminLanguages = enabledLanguageCodes.map((code, index) => ({
  id: `LANG-${101 + index}`,
  name: ISO6391.getName(code),
  nativeName: ISO6391.getNativeName(code),
  code,
  direction: rtlLanguageCodes.has(code) ? "RTL" : "LTR",
  default: index === 0 ? "Yes" : "No",
  status: "Active",
}));

// Admin selected/enabled currencies.
// Later this will come from PostgreSQL.
const enabledCurrencyCodes = ["INR", "JPY", "USD", "AED"];

export const adminCurrencies = enabledCurrencyCodes.map((code, index) => {
  const currency = currencyCodes.code(code) as CurrencyRecord | undefined;

  return {
    id: `CUR-${101 + index}`,
    name: currency?.currency || code,
    code,
    symbol: currencySymbols[code] || code,
    exchangeRate: currencyExchangeRates[code] || "1",
    default: index === 0 ? "Yes" : "No",
    status: "Active",
  };
});

export const languageSelectOptions = ISO6391.getAllCodes().map((code) => ({
  label: `${ISO6391.getName(code)} (${ISO6391.getNativeName(code)}) - ${code}`,
  value: code,
}));

export const currencySelectOptions = (currencyCodes.data as CurrencyRecord[]).map(
  (currency) => ({
    label: `${currency.currency} (${currency.code})`,
    value: currency.code,
  })
);