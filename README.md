# Pokladní kniha

Jednoduchá webová pokladní kniha pro evidenci hotovostních příjmů a výdajů. Běží celá v prohlížeči, nepotřebuje server ani instalaci.

## Co umí

- Zápis příjmů a výdajů (datum, číslo dokladu, popis, částka)
- Automatické číslování dokladů (`P-001/2026`, `V-001/2026`)
- Průběžný zůstatek, součty za období a aktuální stav pokladny
- Filtrování podle roku a měsíce
- Tisk přehledné tabulky na A4 s hlavičkou firmy a místem na podpisy (lze uložit i jako PDF)
- Záloha a obnovení dat do souboru JSON

## Spuštění

Stačí otevřít `index.html` v prohlížeči.

### Zveřejnění přes GitHub Pages

1. Nahrajte soubory do repozitáře na GitHubu.
2. V repozitáři otevřete **Settings → Pages**.
3. U **Source** zvolte **Deploy from a branch**, větev `main` a složku `/ (root)`.
4. Po chvíli bude aplikace dostupná na `https://<uživatel>.github.io/<repozitář>/`.

## Kde jsou data

Po přihlášení přes Google se zápisy ukládají do databáze Firebase (Firestore, umístění Frankfurt) a zobrazí se na každém zařízení, kde se přihlásíte stejným účtem. Pravidla databáze dovolují každému uživateli číst a měnit jen jeho vlastní data.

Bez přihlášení se zápisy ukládají jen do `localStorage` prohlížeče. Při prvním přihlášení se automaticky nahrají online.

Konfigurace Firebase v `index.html` (apiKey apod.) není tajná, u webových aplikací je veřejná vždy. Data chrání pravidla databáze.

Přihlášení funguje jen z adres povolených ve Firebase (Authentication → Settings → Authorized domains): `localhost` a adresa vašich GitHub Pages. Při otevření souboru přímo z disku přihlášení nefunguje.

## Technologie

Čisté HTML, CSS a JavaScript v jednom souboru. Firebase SDK a písma se načítají z CDN.
