/**
 * Numéros mobile Togo : 8 chiffres, indicatif +228
 * Préfixes : 90–93 (Yas/Togocel), 96–99 (Moov)
 */
export const TOGO_COUNTRY_CODE = "+228";

export const TOGO_MOBILE_PREFIXES = ["90", "91", "92", "93", "96", "97", "98", "99"] as const;

export function toTogoE164(local8: string): string {
  if (!/^[0-9]{8}$/.test(local8)) {
    throw new Error(`Numéro local invalide : ${local8}`);
  }
  const prefix = local8.slice(0, 2);
  if (!TOGO_MOBILE_PREFIXES.includes(prefix as (typeof TOGO_MOBILE_PREFIXES)[number])) {
    throw new Error(`Préfixe Togo invalide : ${prefix}`);
  }
  return `${TOGO_COUNTRY_CODE}${local8}`;
}

/** 20 utilisateurs + 1 admin — numéros conformes */
export const DEMO_ACCOUNTS = [
  { username: "@marie", local: "90123456", fullName: "Marie K.", network: "Yas (90)" },
  { username: "@junior", local: "90765432", fullName: "Junior A.", network: "Yas (90)" },
  { username: "@amina", local: "91234567", fullName: "Amina T.", network: "Yas (91)" },
  { username: "@kodjo", local: "92345678", fullName: "Kodjo M.", network: "Yas (92)" },
  { username: "@fatou", local: "93456789", fullName: "Fatou S.", network: "Yas (93)" },
  { username: "@yaw", local: "96111223", fullName: "Yaw D.", network: "Moov (96)" },
  { username: "@akosua", local: "97222334", fullName: "Akosua B.", network: "Moov (97)" },
  { username: "@koffi", local: "98333445", fullName: "Koffi N.", network: "Moov (98)" },
  { username: "@adjoa", local: "99445566", fullName: "Adjoa L.", network: "Moov (99)" },
  { username: "@kwame", local: "90112233", fullName: "Kwame O.", network: "Yas (90)" },
  { username: "@efua", local: "91334455", fullName: "Efua P.", network: "Yas (91)" },
  { username: "@komlan", local: "92445566", fullName: "Komlan H.", network: "Yas (92)" },
  { username: "@abena", local: "93556677", fullName: "Abena R.", network: "Yas (93)" },
  { username: "@tunde", local: "96667788", fullName: "Tunde J.", network: "Moov (96)" },
  { username: "@zara", local: "97788990", fullName: "Zara F.", network: "Moov (97)" },
  { username: "@obi", local: "98899001", fullName: "Obi C.", network: "Moov (98)" },
  { username: "@nana", local: "99900112", fullName: "Nana G.", network: "Moov (99)" },
  { username: "@selorm", local: "90654321", fullName: "Selorm V.", network: "Yas (90)" },
  { username: "@adjo", local: "91765432", fullName: "Adjo W.", network: "Yas (91)" },
  { username: "@moussa", local: "92876543", fullName: "Moussa K.", network: "Yas (92)" },
  {
    username: "@admin",
    local: "93224301",
    fullName: "PaySafe Administrateur",
    network: "Yas (93)",
    role: "admin" as const,
  },
] as const;

export const ADMIN_LOCAL_PHONE = "93224301";
export const ADMIN_E164 = toTogoE164(ADMIN_LOCAL_PHONE);
